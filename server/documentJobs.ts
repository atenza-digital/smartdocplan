import { and, eq, inArray, ne, notInArray, or, sql } from "drizzle-orm";
import { companies, companyDocuments, employeeDocuments, employees, userNotifications, users } from "../drizzle/schema";
import { getDb } from "./db";
import { recalcCompliance } from "./compliance";
import { buildCompanyMonthlyOverview } from "./recurring";
import { canAccessHealthData, isHealthCategory, isPlatformUser } from "@shared/permissions";
import { documentAlertThreshold, documentAlertTitle } from "@shared/documentAlerts";
import { COMPANY_DOCUMENT_TYPES, latestCompanyDocuments } from "@shared/companyDocuments";
import { formatDateOnlyBr, normalizeTextSearch } from "@shared/formValidation";
import { addCompetencia, competenciaOf, formatCompetencia } from "@shared/recurring";
import { brazilToday } from "@shared/vacations";
import { buildVacationSuggestions } from "./vacationSuggestions";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Recipient = { id: number; role: string; companyId: number | null };
type Alert = {
  companyId: number;
  key: string; // chave de deduplicação: um aviso por usuário e chave
  titulo: string;
  mensagem: string;
  linkEmpresa: string;
  linkPlataforma: string;
  saude: boolean; // dado de saúde: só quem pode ver dados de saúde recebe
};

/** Destinatários: admin e RH da empresa, mais admin e analistas da plataforma. */
async function loadRecipients(db: Db) {
  return db
    .select({ id: users.id, role: users.role, companyId: users.companyId })
    .from(users)
    .where(and(
      eq(users.ativo, true),
      or(inArray(users.role, ["platform_admin", "platform_analyst"]), inArray(users.role, ["company_admin", "company_hr"])),
    ));
}

async function employeeDocumentAlerts(db: Db, today: string): Promise<Alert[]> {
  const rows = await db
    .select({
      id: employeeDocuments.id,
      nome: employeeDocuments.nome,
      categoria: employeeDocuments.categoria,
      validade: employeeDocuments.validade,
      requirementId: employeeDocuments.requirementId,
      createdAt: employeeDocuments.createdAt,
      employeeId: employeeDocuments.employeeId,
      companyId: employeeDocuments.companyId,
      colaborador: employees.nome,
    })
    .from(employeeDocuments)
    .innerJoin(employees, eq(employees.id, employeeDocuments.employeeId))
    .where(and(
      // Status gravados podem incluir "vencido"/"a_vencer" de dados antigos; a validade é que decide.
      notInArray(employeeDocuments.status, ["excluido", "rejeitado"]),
      ne(employees.status, "desligado"),
      sql`${employeeDocuments.validade} IS NOT NULL`,
    ));
  // Documento substituído por um envio mais novo (mesmo item do checklist ou mesmo nome) não gera aviso.
  const sameDoc = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
    a.employeeId === b.employeeId &&
    (a.requirementId != null ? a.requirementId === b.requirementId : normalizeTextSearch(a.nome) === normalizeTextSearch(b.nome));
  const current = rows.filter((doc) => !rows.some((other) => other.id !== doc.id && sameDoc(doc, other) && new Date(other.createdAt) > new Date(doc.createdAt)));
  return current.flatMap((doc) => {
    const threshold = documentAlertThreshold(doc.validade, today);
    if (!threshold) return [];
    return [{
      companyId: doc.companyId,
      key: `doc_colaborador_${doc.id}_${doc.validade}_${threshold}`,
      titulo: documentAlertTitle(threshold),
      mensagem: `${doc.nome} de ${doc.colaborador}: validade ${formatDateOnlyBr(doc.validade)}.`,
      linkEmpresa: `/empresa/colaboradores/${doc.employeeId}`,
      linkPlataforma: `/admin/colaboradores/${doc.employeeId}`,
      saude: isHealthCategory(doc.categoria),
    }];
  });
}

async function companyDocumentAlerts(db: Db, today: string): Promise<Alert[]> {
  const rows = await db.select().from(companyDocuments).where(sql`${companyDocuments.recurringTypeId} IS NULL`);
  const byCompany = new Map<number, typeof rows>();
  for (const doc of rows) byCompany.set(doc.companyId, [...(byCompany.get(doc.companyId) ?? []), doc]);
  const alerts: Alert[] = [];
  byCompany.forEach((docs, companyId) => {
    latestCompanyDocuments(docs).forEach((doc, tipo) => {
      const threshold = documentAlertThreshold(doc.validade, today);
      if (!threshold) return;
      const nomeTipo = COMPANY_DOCUMENT_TYPES.find((item) => item.tipo === tipo)?.nome ?? doc.nome;
      alerts.push({
        companyId,
        key: `doc_empresa_${doc.id}_${doc.validade}_${threshold}`,
        titulo: documentAlertTitle(threshold),
        mensagem: `${nomeTipo} da empresa: validade ${formatDateOnlyBr(doc.validade)}.`,
        linkEmpresa: "/empresa/documentos",
        linkPlataforma: `/admin/empresas/${companyId}`,
        saude: false,
      });
    });
  });
  return alerts;
}

/** Mensais atrasados nas duas últimas competências encerradas. */
async function monthlyAlerts(db: Db, today: string): Promise<Alert[]> {
  const ativas = await db.select({ id: companies.id }).from(companies);
  const [ano, mes, dia] = today.split("-").map(Number);
  const referencia = new Date(ano, mes - 1, dia);
  const ultima = addCompetencia(competenciaOf(referencia), -1);
  const alerts: Alert[] = [];
  for (const company of ativas) {
    for (const competencia of [addCompetencia(ultima, -1), ultima]) {
      const overview = await buildCompanyMonthlyOverview(db, company.id, competencia, referencia);
      for (const item of overview.colaborador) {
        const atrasados = item.faltando.filter((linha) => linha.estado === "atrasado");
        if (!atrasados.length) continue;
        alerts.push({
          companyId: company.id,
          key: `mensal_atraso_${company.id}_${item.tipo.id}_${competencia}`,
          titulo: `${item.tipo.nome} ${formatCompetencia(competencia)} em atraso`,
          mensagem: `${atrasados.length} colaborador(es) sem envio. O prazo era ${formatDateOnlyBr(item.prazo)}.`,
          linkEmpresa: "/empresa/pendencias",
          linkPlataforma: `/admin/empresas/${company.id}`,
          saude: false,
        });
      }
      for (const item of overview.empresa) {
        if (item.estado !== "atrasado") continue;
        alerts.push({
          companyId: company.id,
          key: `mensal_atraso_${company.id}_${item.tipo.id}_${competencia}`,
          titulo: `${item.tipo.nome} ${formatCompetencia(competencia)} em atraso`,
          mensagem: `Documento mensal da empresa não enviado. O prazo era ${formatDateOnlyBr(item.prazo)}.`,
          linkEmpresa: "/empresa/documentos",
          linkPlataforma: `/admin/empresas/${company.id}`,
          saude: false,
        });
      }
    }
  }
  return alerts;
}

/** Férias pelos parâmetros da empresa: aviso ao adquirir e quando o limite para solicitar se aproxima ou vence. */
async function vacationAlerts(db: Db, today: string): Promise<Alert[]> {
  const sugestoes = await buildVacationSuggestions(db, {}, today);
  return sugestoes.flatMap((s) => {
    if (s.situacao === "em_aquisicao") return [];
    const links = {
      linkEmpresa: `/empresa/ferias?colaborador=${s.employeeId}`,
      linkPlataforma: `/admin/ferias?empresa=${s.companyId}&colaborador=${s.employeeId}`,
    };
    const alerts: Alert[] = [{
      companyId: s.companyId,
      key: `ferias_adq_${s.employeeId}_${s.inicio}`,
      titulo: `${s.nome} adquiriu direito a férias`,
      mensagem: `Período aquisitivo de ${formatDateOnlyBr(s.inicio)} a ${formatDateOnlyBr(s.fim)}. Programe as férias até ${formatDateOnlyBr(s.limite)}.`,
      saude: false,
      ...links,
    }];
    const threshold = documentAlertThreshold(s.limite, today);
    if (threshold) {
      alerts.push({
        companyId: s.companyId,
        key: `ferias_lim_${s.employeeId}_${s.inicio}_${threshold}`,
        titulo: threshold === "vencido" ? "Prazo para solicitar férias vencido" : `Prazo para solicitar férias em até ${threshold} dias`,
        mensagem: `${s.nome}: solicitar as férias do período ${formatDateOnlyBr(s.inicio)} a ${formatDateOnlyBr(s.fim)} até ${formatDateOnlyBr(s.limite)}.`,
        saude: false,
        ...links,
      });
    }
    return alerts;
  });
}

/** Grava os avisos ainda não enviados (um por usuário e chave). Retorna quantos foram criados. */
async function deliver(db: Db, alerts: Alert[], recipients: Recipient[]) {
  if (!alerts.length) return 0;
  const keys = Array.from(new Set(alerts.map((a) => a.key)));
  const existing = await db
    .select({ userId: userNotifications.userId, tipo: userNotifications.tipo })
    .from(userNotifications)
    .where(inArray(userNotifications.tipo, keys));
  const sent = new Set(existing.map((row) => `${row.userId}|${row.tipo}`));
  const values = alerts.flatMap((alert) =>
    recipients
      .filter((user) => isPlatformUser(user.role) || user.companyId === alert.companyId)
      .filter((user) => !alert.saude || canAccessHealthData(user.role))
      .filter((user) => !sent.has(`${user.id}|${alert.key}`))
      .map((user) => ({
        userId: user.id,
        companyId: alert.companyId,
        tipo: alert.key,
        titulo: alert.titulo,
        mensagem: alert.mensagem,
        link: isPlatformUser(user.role) ? alert.linkPlataforma : alert.linkEmpresa,
      }))
  );
  for (let i = 0; i < values.length; i += 500) {
    await db.insert(userNotifications).values(values.slice(i, i + 500));
  }
  return values.length;
}

/** Avisos de vencimento (30 dias, 7 dias, vencido) e de documentos mensais atrasados. */
export async function notifyDocumentAlerts(db: Db, today = brazilToday()) {
  const alerts = [
    ...(await employeeDocumentAlerts(db, today)),
    ...(await companyDocumentAlerts(db, today)),
    ...(await monthlyAlerts(db, today)),
    ...(await vacationAlerts(db, today)),
  ];
  return deliver(db, alerts, await loadRecipients(db));
}

/**
 * Rotina horária de documentos: recalcula conformidade e liberação (vencimentos mudam a situação sem
 * que ninguém altere o documento) e envia os avisos. O lock evita execução duplicada entre instâncias.
 */
export async function runDocumentJobs() {
  const db = await getDb();
  if (!db) return;
  await recalcCompliance(db);
  await db.transaction(async (tx) => {
    const [{ locked }] = (await tx.execute(sql`SELECT pg_try_advisory_xact_lock(20260917, 3) AS locked`)).rows as { locked: boolean }[];
    if (!locked) return;
    await notifyDocumentAlerts(tx as unknown as Db);
  });
}
