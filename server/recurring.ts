import { and, asc, eq, inArray, ne, notInArray } from "drizzle-orm";
import { companyDocuments, employeeDocuments, employees, recurringDocumentTypes } from "../drizzle/schema";
import { companyDocumentKey, splitCompanyDocuments } from "@shared/companyDocuments";
import { splitDocumentVersions } from "@shared/documentVersions";
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

const employeeGridColumns = {
  id: employeeDocuments.id, recurringTypeId: employeeDocuments.recurringTypeId, competencia: employeeDocuments.competencia,
  status: employeeDocuments.status, nome: employeeDocuments.nome, fileUrl: employeeDocuments.fileUrl,
  motivoRejeicao: employeeDocuments.motivoRejeicao, createdAt: employeeDocuments.createdAt, substituiDocId: employeeDocuments.substituiDocId,
};
const companyGridColumns = {
  id: companyDocuments.id, tipo: companyDocuments.tipo, recurringTypeId: companyDocuments.recurringTypeId, competencia: companyDocuments.competencia,
  status: companyDocuments.status, nome: companyDocuments.nome, fileUrl: companyDocuments.fileUrl,
  motivoRejeicao: companyDocuments.motivoRejeicao, createdAt: companyDocuments.createdAt,
};

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

type GridDoc = { id: number; recurringTypeId: number | null; competencia: string | null; status: string; nome: string; fileUrl: string | null; motivoRejeicao?: string | null };
/** Documento de um período: o em vigor (ou o único envio) e, quando houver, a versão nova ainda não aprovada. */
type PeriodDocs = (tipoId: number, competencia: string) => { doc: GridDoc | null; nova: GridDoc | null };

/** Versões dos recorrentes do colaborador: a nova versão fica presa à anterior (`substituiDocId`). */
function employeePeriodDocs(docs: (GridDoc & { createdAt: Date | string; substituiDocId: number | null })[]): PeriodDocs {
  const { emVigor, novasVersoes } = splitDocumentVersions(docs.filter((d) => d.status !== "substituido"));
  return (tipoId, competencia) => {
    const doc = emVigor.find((d) => d.recurringTypeId === tipoId && d.competencia === competencia) ?? null;
    return { doc, nova: doc ? novasVersoes.get(doc.id) ?? null : null };
  };
}

/** Versões dos recorrentes da empresa: vale o envio aprovado mais recente do período. */
function companyPeriodDocs(docs: (GridDoc & { tipo: string; createdAt: Date | string })[]): PeriodDocs {
  const versoes = splitCompanyDocuments(docs);
  return (tipoId, competencia) => {
    const grupo = versoes.get(companyDocumentKey({ tipo: "", recurringTypeId: tipoId, competencia }));
    if (!grupo) return { doc: null, nova: null };
    return grupo.emVigor ? { doc: grupo.emVigor, nova: grupo.novaVersao } : { doc: grupo.novaVersao, nova: null };
  };
}

/** Linhas da grade: cada tipo com seus últimos períodos encerrados (cada tipo tem a sua periodicidade). */
function buildRows(
  tipos: RecurringType[],
  periodDocs: PeriodDocs,
  quantidade: number,
  today: string,
  applies: (tipo: RecurringType, start: string) => boolean
) {
  return tipos.map((tipo) => {
    const resumo = tipoResumo(tipo);
    return {
      tipo: resumo,
      celulas: recentPeriods(resumo.periodicidade, quantidade, today).map((inicio) => {
        const { doc, nova } = periodDocs(tipo.id, inicio);
        const aplica = applies(tipo, inicio) || !!doc;
        return {
          competencia: inicio,
          rotulo: formatPeriod(inicio, resumo.periodicidade),
          fim: periodEnd(inicio, resumo.periodicidade),
          aplica,
          prazo: recurringDeadline(inicio, resumo.periodicidade, resumo.prazoDias),
          // Período anterior à admissão (ou ao cadastro do tipo) não conta como atraso.
          estado: !aplica ? ("nao_se_aplica" as const) : recurringCellState(doc, inicio, resumo.periodicidade, resumo.prazoDias, today),
          documento: doc ? { id: doc.id, nome: doc.nome, fileUrl: doc.fileUrl, motivoRejeicao: doc.status === "rejeitado" ? doc.motivoRejeicao ?? null : null } : null,
          // Nova versão enviada para um período que já tem documento aprovado (aguardando validação ou rejeitada).
          novaVersao: nova ? { id: nova.id, status: nova.status, motivoRejeicao: nova.motivoRejeicao ?? null } : null,
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
        .select(employeeGridColumns)
        .from(employeeDocuments)
        .where(and(eq(employeeDocuments.employeeId, employee.id), inArray(employeeDocuments.recurringTypeId, tipos.map((t) => t.id)), notInArray(employeeDocuments.status, ["excluido", "substituido"])))
    : [];
  return {
    linhas: buildRows(tipos, employeePeriodDocs(docs), quantidade, today, (tipo, inicio) =>
      periodApplies(inicio, asPeriodicidade(tipo.periodicidade), { dataAdmissao: employee.dataAdmissao, status: employee.status, tipoCriadoEm: tipo.createdAt })
    ),
  };
}

/** Grade dos documentos recorrentes da própria empresa. */
export async function buildCompanyMonthlyGrid(db: Db, companyId: number, quantidade: number, today = brazilToday()) {
  const tipos = await listActiveRecurringTypes(db, companyId, "empresa");
  const docs = tipos.length
    ? await db
        .select(companyGridColumns)
        .from(companyDocuments)
        .where(and(eq(companyDocuments.companyId, companyId), inArray(companyDocuments.recurringTypeId, tipos.map((t) => t.id)), notInArray(companyDocuments.status, ["excluido", "substituido"])))
    : [];
  return {
    linhas: buildRows(tipos, companyPeriodDocs(docs), quantidade, today, (tipo, inicio) =>
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
  const docsColaboradorTodos = tiposColaborador.length
    ? await db
        .select({ ...employeeGridColumns, employeeId: employeeDocuments.employeeId })
        .from(employeeDocuments)
        .where(and(eq(employeeDocuments.companyId, companyId), inArray(employeeDocuments.recurringTypeId, tiposColaborador.map((t) => t.id)), notInArray(employeeDocuments.status, ["excluido", "substituido"])))
    : [];
  // Só a versão em vigor de cada período conta (a nova versão em validação não muda a situação).
  const docsColaborador = splitDocumentVersions(docsColaboradorTodos).emVigor;
  const docsEmpresa = tiposEmpresa.length
    ? await db
        .select(companyGridColumns)
        .from(companyDocuments)
        .where(and(eq(companyDocuments.companyId, companyId), inArray(companyDocuments.recurringTypeId, tiposEmpresa.map((t) => t.id)), notInArray(companyDocuments.status, ["excluido", "substituido"])))
    : [];
  const empresaDoPeriodo = companyPeriodDocs(docsEmpresa);

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
        const { doc } = empresaDoPeriodo(tipo.id, inicio);
        return {
          tipo: resumo,
          competencia: inicio,
          rotulo: formatPeriod(inicio, resumo.periodicidade),
          prazo: recurringDeadline(inicio, resumo.periodicidade, resumo.prazoDias),
          estado: recurringCellState(doc, inicio, resumo.periodicidade, resumo.prazoDias, today),
          documento: doc ? { id: doc.id, recurringTypeId: doc.recurringTypeId, competencia: doc.competencia, nome: doc.nome, fileUrl: doc.fileUrl } : null,
        };
      });
  });

  return { colaborador, empresa };
}
