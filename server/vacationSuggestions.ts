import { and, eq, inArray } from "drizzle-orm";
import { companies, employees, vacations } from "../drizzle/schema";
import { DEFAULT_VACATION_PARAMS, suggestNextVacation, type VacationParams } from "@shared/vacationSuggestion";
import { brazilToday } from "@shared/vacations";
import { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

// Programações que "ocupam" um período aquisitivo; só as canceladas liberam o período de novo.
const ACTIVE_VACATION_STATUSES = ["rascunho", "pendente", "aprovado", "reprovado"];

export async function getCompanyVacationParams(db: Db, companyId: number): Promise<VacationParams> {
  const [row] = await db
    .select({ feriasMesesAquisicao: companies.feriasMesesAquisicao, feriasMesesParaSolicitar: companies.feriasMesesParaSolicitar })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  return row ?? DEFAULT_VACATION_PARAMS;
}

/** Sugestão das próximas férias de cada colaborador ativo (não desligado) com data de admissão. */
export async function buildVacationSuggestions(db: Db, opts: { companyId?: number; employeeIds?: number[] } = {}, today = brazilToday()) {
  const conditions = [inArray(employees.status, ["ativo", "afastado"])];
  if (opts.companyId) conditions.push(eq(employees.companyId, opts.companyId));
  if (opts.employeeIds) conditions.push(inArray(employees.id, opts.employeeIds.length ? opts.employeeIds : [-1]));
  const lista = await db
    .select({
      id: employees.id,
      nome: employees.nome,
      companyId: employees.companyId,
      dataAdmissao: employees.dataAdmissao,
      feriasMesesAquisicao: companies.feriasMesesAquisicao,
      feriasMesesParaSolicitar: companies.feriasMesesParaSolicitar,
    })
    .from(employees)
    .innerJoin(companies, eq(companies.id, employees.companyId))
    .where(and(...conditions));
  if (!lista.length) return [];
  const programacoes = await db
    .select({ employeeId: vacations.employeeId, acquisitionStart: vacations.acquisitionStart })
    .from(vacations)
    .where(and(inArray(vacations.employeeId, lista.map((e) => e.id)), inArray(vacations.status, ACTIVE_VACATION_STATUSES)));
  return lista.flatMap((emp) => {
    const sugestao = suggestNextVacation(
      {
        dataAdmissao: emp.dataAdmissao,
        params: { feriasMesesAquisicao: emp.feriasMesesAquisicao, feriasMesesParaSolicitar: emp.feriasMesesParaSolicitar },
        programados: programacoes.filter((p) => p.employeeId === emp.id).map((p) => String(p.acquisitionStart)),
      },
      today
    );
    return sugestao ? [{ employeeId: emp.id, nome: emp.nome, companyId: emp.companyId, ...sugestao }] : [];
  });
}
