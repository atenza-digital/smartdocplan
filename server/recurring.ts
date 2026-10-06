import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { companyDocuments, employeeDocuments, employees, recurringDocumentTypes } from "../drizzle/schema";
import {
  asPeriodicidade,
  formatPeriod,
  periodApplies,
  periodEnd,
  recentPeriods,
  recurringCellState,
  recurringDeadline,
} from "@shared/recurring";
import { brazilToday } from "@shared/vacations";
import { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type RecurringType = typeof recurringDocumentTypes.$inferSelect;

export async function listActiveRecurringTypes(db: Db, companyId: number, alvo: "colaborador" | "empresa") {
  return db
    .select()
    .from(recurringDocumentTypes)
    .where(and(eq(recurringDocumentTypes.companyId, companyId), eq(recurringDocumentTypes.alvo, alvo), eq(recurringDocumentTypes.ativo, true)))
    .orderBy(asc(recurringDocumentTypes.nome));
}

function tipoResumo(tipo: RecurringType) {
  const periodicidade = asPeriodicidade(tipo.periodicidade);
  return { id: tipo.id, nome: tipo.nome, categoria: tipo.categoria, periodicidade, prazoDias: tipo.prazoDias };
}

/** Linhas da grade: cada tipo com seus últimos períodos encerrados (cada tipo tem a sua periodicidade). */
function buildRows(
  tipos: RecurringType[],
  docs: { id: number; recurringTypeId: number | null; competencia: string | null; status?: string; nome: string; fileUrl: string | null }[],
  quantidade: number,
  today: string,
  applies: (tipo: RecurringType, start: string) => boolean
) {
  return tipos.map((tipo) => {
    const resumo = tipoResumo(tipo);
    return {
      tipo: resumo,
      celulas: recentPeriods(resumo.periodicidade, quantidade, today).map((inicio) => {
        const doc = docs.find((d) => d.recurringTypeId === tipo.id && d.competencia === inicio) ?? null;
        return {
          competencia: inicio,
          rotulo: formatPeriod(inicio, resumo.periodicidade),
          fim: periodEnd(inicio, resumo.periodicidade),
          aplica: applies(tipo, inicio) || !!doc,
          prazo: recurringDeadline(inicio, resumo.periodicidade, resumo.prazoDias),
          estado: recurringCellState(doc ? { status: doc.status ?? "valido" } : null, inicio, resumo.periodicidade, resumo.prazoDias, today),
          documento: doc ? { id: doc.id, nome: doc.nome, fileUrl: doc.fileUrl } : null,
        };
      }),
    };
  });
}

/** Grade de documentos recorrentes do colaborador: tipos ativos × últimos períodos encerrados. */
export async function buildEmployeeMonthlyGrid(
  db: Db,
  employee: { id: number; companyId: number; dataAdmissao: string | null; status: string },
  quantidade: number,
  today = brazilToday()
) {
  const tipos = await listActiveRecurringTypes(db, employee.companyId, "colaborador");
  const docs = tipos.length
    ? await db
        .select({ id: employeeDocuments.id, recurringTypeId: employeeDocuments.recurringTypeId, competencia: employeeDocuments.competencia, status: employeeDocuments.status, nome: employeeDocuments.nome, fileUrl: employeeDocuments.fileUrl })
        .from(employeeDocuments)
        .where(and(eq(employeeDocuments.employeeId, employee.id), inArray(employeeDocuments.recurringTypeId, tipos.map((t) => t.id)), ne(employeeDocuments.status, "excluido")))
    : [];
  return {
    linhas: buildRows(tipos, docs, quantidade, today, (tipo, inicio) =>
      periodApplies(inicio, asPeriodicidade(tipo.periodicidade), { dataAdmissao: employee.dataAdmissao, status: employee.status, tipoCriadoEm: tipo.createdAt })
    ),
  };
}

/** Grade dos documentos recorrentes da própria empresa. */
export async function buildCompanyMonthlyGrid(db: Db, companyId: number, quantidade: number, today = brazilToday()) {
  const tipos = await listActiveRecurringTypes(db, companyId, "empresa");
  const docs = tipos.length
    ? await db
        .select({ id: companyDocuments.id, recurringTypeId: companyDocuments.recurringTypeId, competencia: companyDocuments.competencia, nome: companyDocuments.nome, fileUrl: companyDocuments.fileUrl })
        .from(companyDocuments)
        .where(and(eq(companyDocuments.companyId, companyId), inArray(companyDocuments.recurringTypeId, tipos.map((t) => t.id))))
    : [];
  return {
    linhas: buildRows(tipos, docs, quantidade, today, (tipo, inicio) =>
      periodApplies(inicio, asPeriodicidade(tipo.periodicidade), { tipoCriadoEm: tipo.createdAt })
    ),
  };
}

/**
 * Situação da empresa nos últimos períodos encerrados de cada tipo (`quantos`, padrão 1): para tipos de
 * colaborador, quem ainda não enviou; para tipos da empresa, se o documento foi enviado.
 */
export async function buildCompanyMonthlyOverview(db: Db, companyId: number, quantos = 1, today = brazilToday()) {
  const [tiposColaborador, tiposEmpresa] = await Promise.all([
    listActiveRecurringTypes(db, companyId, "colaborador"),
    listActiveRecurringTypes(db, companyId, "empresa"),
  ]);
  const colaboradores = tiposColaborador.length
    ? await db
        .select({ id: employees.id, nome: employees.nome, status: employees.status, dataAdmissao: employees.dataAdmissao })
        .from(employees)
        .where(and(eq(employees.companyId, companyId), ne(employees.status, "desligado")))
        .orderBy(asc(employees.nome))
    : [];
  const docsColaborador = tiposColaborador.length
    ? await db
        .select({ employeeId: employeeDocuments.employeeId, recurringTypeId: employeeDocuments.recurringTypeId, competencia: employeeDocuments.competencia, status: employeeDocuments.status })
        .from(employeeDocuments)
        .where(and(eq(employeeDocuments.companyId, companyId), inArray(employeeDocuments.recurringTypeId, tiposColaborador.map((t) => t.id)), ne(employeeDocuments.status, "excluido")))
    : [];
  const docsEmpresa = tiposEmpresa.length
    ? await db
        .select({ id: companyDocuments.id, recurringTypeId: companyDocuments.recurringTypeId, competencia: companyDocuments.competencia, nome: companyDocuments.nome, fileUrl: companyDocuments.fileUrl })
        .from(companyDocuments)
        .where(and(eq(companyDocuments.companyId, companyId), inArray(companyDocuments.recurringTypeId, tiposEmpresa.map((t) => t.id))))
    : [];

  const colaborador = tiposColaborador.flatMap((tipo) => {
    const resumo = tipoResumo(tipo);
    return recentPeriods(resumo.periodicidade, quantos, today).map((inicio) => {
      const linhas = colaboradores
        .filter((c) => periodApplies(inicio, resumo.periodicidade, { dataAdmissao: c.dataAdmissao, status: c.status, tipoCriadoEm: tipo.createdAt }))
        .map((c) => {
          const doc = docsColaborador.find((d) => d.employeeId === c.id && d.recurringTypeId === tipo.id && d.competencia === inicio) ?? null;
          return { employeeId: c.id, nome: c.nome, estado: recurringCellState(doc, inicio, resumo.periodicidade, resumo.prazoDias, today) };
        });
      return {
        tipo: resumo,
        competencia: inicio,
        rotulo: formatPeriod(inicio, resumo.periodicidade),
        prazo: recurringDeadline(inicio, resumo.periodicidade, resumo.prazoDias),
        total: linhas.length,
        enviados: linhas.filter((l) => l.estado === "aprovado" || l.estado === "aguardando_validacao").length,
        faltando: linhas.filter((l) => l.estado !== "aprovado" && l.estado !== "aguardando_validacao"),
      };
    });
  });

  const empresa = tiposEmpresa.flatMap((tipo) => {
    const resumo = tipoResumo(tipo);
    return recentPeriods(resumo.periodicidade, quantos, today)
      .filter((inicio) => periodApplies(inicio, resumo.periodicidade, { tipoCriadoEm: tipo.createdAt }))
      .map((inicio) => {
        const doc = docsEmpresa.find((d) => d.recurringTypeId === tipo.id && d.competencia === inicio) ?? null;
        return {
          tipo: resumo,
          competencia: inicio,
          rotulo: formatPeriod(inicio, resumo.periodicidade),
          prazo: recurringDeadline(inicio, resumo.periodicidade, resumo.prazoDias),
          estado: recurringCellState(doc ? { status: "valido" } : null, inicio, resumo.periodicidade, resumo.prazoDias, today),
          documento: doc,
        };
      });
  });

  return { colaborador, empresa };
}
