import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { companyDocuments, employeeDocuments, employees, recurringDocumentTypes } from "../drizzle/schema";
import { competenciaApplies, recentCompetencias, recurringCellState, recurringDeadline } from "@shared/recurring";
import { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function listActiveRecurringTypes(db: Db, companyId: number, alvo: "colaborador" | "empresa") {
  return db
    .select()
    .from(recurringDocumentTypes)
    .where(and(eq(recurringDocumentTypes.companyId, companyId), eq(recurringDocumentTypes.alvo, alvo), eq(recurringDocumentTypes.ativo, true)))
    .orderBy(asc(recurringDocumentTypes.nome));
}

/** Grade mensal do colaborador: tipos ativos × últimas competências encerradas, com a situação de cada uma. */
export async function buildEmployeeMonthlyGrid(
  db: Db,
  employee: { id: number; companyId: number; dataAdmissao: string | null; status: string },
  meses: number,
  referenceDate = new Date()
) {
  const tipos = await listActiveRecurringTypes(db, employee.companyId, "colaborador");
  const competencias = recentCompetencias(meses, referenceDate);
  const docs = tipos.length
    ? await db
        .select({ id: employeeDocuments.id, recurringTypeId: employeeDocuments.recurringTypeId, competencia: employeeDocuments.competencia, status: employeeDocuments.status, nome: employeeDocuments.nome, fileUrl: employeeDocuments.fileUrl })
        .from(employeeDocuments)
        .where(and(eq(employeeDocuments.employeeId, employee.id), inArray(employeeDocuments.recurringTypeId, tipos.map((t) => t.id)), ne(employeeDocuments.status, "excluido")))
    : [];
  return {
    competencias,
    linhas: tipos.map((tipo) => ({
      tipo: { id: tipo.id, nome: tipo.nome, categoria: tipo.categoria, diaLimite: tipo.diaLimite },
      celulas: competencias.map((competencia) => {
        const aplica = competenciaApplies(competencia, { dataAdmissao: employee.dataAdmissao, status: employee.status, tipoCriadoEm: tipo.createdAt });
        const doc = docs.find((d) => d.recurringTypeId === tipo.id && d.competencia === competencia) ?? null;
        return {
          competencia,
          aplica: aplica || !!doc,
          prazo: recurringDeadline(competencia, tipo.diaLimite),
          estado: recurringCellState(doc, competencia, tipo.diaLimite, referenceDate),
          documento: doc,
        };
      }),
    })),
  };
}

/**
 * Situação da empresa em uma competência: para cada tipo de colaborador, quem ainda não enviou;
 * para cada tipo da empresa, se o documento foi enviado.
 */
export async function buildCompanyMonthlyOverview(db: Db, companyId: number, competencia: string, referenceDate = new Date()) {
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
        .select({ employeeId: employeeDocuments.employeeId, recurringTypeId: employeeDocuments.recurringTypeId, status: employeeDocuments.status })
        .from(employeeDocuments)
        .where(and(eq(employeeDocuments.companyId, companyId), eq(employeeDocuments.competencia, competencia), ne(employeeDocuments.status, "excluido")))
    : [];
  const docsEmpresa = tiposEmpresa.length
    ? await db
        .select({ id: companyDocuments.id, recurringTypeId: companyDocuments.recurringTypeId, nome: companyDocuments.nome, fileUrl: companyDocuments.fileUrl })
        .from(companyDocuments)
        .where(and(eq(companyDocuments.companyId, companyId), eq(companyDocuments.competencia, competencia)))
    : [];

  return {
    competencia,
    colaborador: tiposColaborador.map((tipo) => {
      const linhas = colaboradores
        .filter((c) => competenciaApplies(competencia, { dataAdmissao: c.dataAdmissao, status: c.status, tipoCriadoEm: tipo.createdAt }))
        .map((c) => {
          const doc = docsColaborador.find((d) => d.employeeId === c.id && d.recurringTypeId === tipo.id) ?? null;
          return { employeeId: c.id, nome: c.nome, estado: recurringCellState(doc, competencia, tipo.diaLimite, referenceDate) };
        });
      return {
        tipo: { id: tipo.id, nome: tipo.nome, diaLimite: tipo.diaLimite },
        prazo: recurringDeadline(competencia, tipo.diaLimite),
        total: linhas.length,
        enviados: linhas.filter((l) => l.estado === "aprovado" || l.estado === "aguardando_validacao").length,
        faltando: linhas.filter((l) => l.estado !== "aprovado" && l.estado !== "aguardando_validacao"),
      };
    }),
    empresa: tiposEmpresa
      .filter((tipo) => competenciaApplies(competencia, { tipoCriadoEm: tipo.createdAt }))
      .map((tipo) => {
        const doc = docsEmpresa.find((d) => d.recurringTypeId === tipo.id) ?? null;
        return {
          tipo: { id: tipo.id, nome: tipo.nome, diaLimite: tipo.diaLimite },
          prazo: recurringDeadline(competencia, tipo.diaLimite),
          estado: recurringCellState(doc ? { status: "valido" } : null, competencia, tipo.diaLimite, referenceDate),
          documento: doc,
        };
      }),
  };
}
