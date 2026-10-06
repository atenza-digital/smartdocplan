/**
 * Documentos recorrentes. Cada tipo tem uma periodicidade (semanal a anual) alinhada ao calendário;
 * o período é identificado pela data de início (AAAA-MM-DD, gravada em "competencia") e o prazo de
 * envio é o fim do período mais `prazoDias` (ex.: folha de ponto mensal de setembro, prazo de 10 dias → 10/10).
 */
import { addDaysDateOnly, addMonthsDateOnly } from "./dates";

export const PERIODICIDADES = ["semanal", "quinzenal", "mensal", "bimestral", "trimestral", "semestral", "anual"] as const;
export type Periodicidade = (typeof PERIODICIDADES)[number];

export const PERIODICIDADE_LABELS: Record<Periodicidade, string> = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export type RecurringCellState = "aprovado" | "aguardando_validacao" | "rejeitado" | "a_enviar" | "atrasado";

export const RECURRING_STATE_LABELS: Record<RecurringCellState, string> = {
  aprovado: "Enviado",
  aguardando_validacao: "Em validação",
  rejeitado: "Rejeitado",
  a_enviar: "No prazo",
  atrasado: "Atrasado",
};

const pad = (value: number) => String(value).padStart(2, "0");
const MESES_POR_PERIODO: Partial<Record<Periodicidade, number>> = { mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(dateOnly: string) {
  const [y, m, d] = dateOnly.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

/** Data de hoje (ou de uma Date) como AAAA-MM-DD no horário local. */
export function toDateOnly(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Início do período que contém a data. Semana começa na segunda; quinzenas são 1–15 e 16–fim do mês. */
export function periodStart(dateOnly: string, periodicidade: Periodicidade) {
  const { y, m, d } = parts(dateOnly);
  if (periodicidade === "semanal") {
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
    return addDaysDateOnly(dateOnly, -((weekday + 6) % 7));
  }
  if (periodicidade === "quinzenal") return `${y}-${pad(m)}-${d <= 15 ? "01" : "16"}`;
  const meses = MESES_POR_PERIODO[periodicidade]!;
  const primeiroMes = Math.floor((m - 1) / meses) * meses + 1;
  return `${y}-${pad(primeiroMes)}-01`;
}

/** Início do período seguinte. */
export function nextPeriodStart(start: string, periodicidade: Periodicidade) {
  if (periodicidade === "semanal") return addDaysDateOnly(start, 7);
  if (periodicidade === "quinzenal") {
    const { y, m, d } = parts(start);
    return d === 1 ? `${y}-${pad(m)}-16` : addMonthsDateOnly(`${y}-${pad(m)}-01`, 1);
  }
  return addMonthsDateOnly(start, MESES_POR_PERIODO[periodicidade]!);
}

export function periodEnd(start: string, periodicidade: Periodicidade) {
  return addDaysDateOnly(nextPeriodStart(start, periodicidade), -1);
}

/** Prazo de envio (AAAA-MM-DD): fim do período + prazo em dias. */
export function recurringDeadline(start: string, periodicidade: Periodicidade, prazoDias: number) {
  return addDaysDateOnly(periodEnd(start, periodicidade), prazoDias);
}

/** Últimos `quantidade` períodos já encerrados (o atual só conta depois que termina), do mais antigo ao mais recente. */
export function recentPeriods(periodicidade: Periodicidade, quantidade: number, today: string) {
  let start = periodStart(today, periodicidade);
  const periods: string[] = [];
  for (let i = 0; i < quantidade; i++) {
    start = periodStart(addDaysDateOnly(start, -1), periodicidade);
    periods.unshift(start);
  }
  return periods;
}

/** O período pode receber envio: data válida, início de período e não futuro (o período atual é aceito). */
export function isPeriodAllowed(start: string, periodicidade: Periodicidade, today: string) {
  if (!DATE_RE.test(start)) return false;
  const { y, m, d } = parts(start);
  const valid = new Date(Date.UTC(y, m - 1, d));
  if (valid.getUTCMonth() !== m - 1 || valid.getUTCDate() !== d) return false;
  return start === periodStart(start, periodicidade) && start <= periodStart(today, periodicidade) && start >= "2000-01-01";
}

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Rótulo curto do período: "28/09 a 04/10/2026", "1ª quinz. 09/2026", "09/2026", "set–out/2026", "3º tri/2026", "2º sem/2026", "2026". */
export function formatPeriod(start: string, periodicidade: Periodicidade) {
  const { y, m, d } = parts(start);
  const fim = parts(periodEnd(start, periodicidade));
  switch (periodicidade) {
    case "semanal":
      return `${pad(d)}/${pad(m)} a ${pad(fim.d)}/${pad(fim.m)}/${fim.y}`;
    case "quinzenal":
      return `${d === 1 ? "1ª" : "2ª"} quinz. ${pad(m)}/${y}`;
    case "mensal":
      return `${pad(m)}/${y}`;
    case "bimestral":
      return `${MESES_ABREV[m - 1]}–${MESES_ABREV[fim.m - 1]}/${y}`;
    case "trimestral":
      return `${Math.ceil(m / 3)}º tri/${y}`;
    case "semestral":
      return `${m <= 6 ? 1 : 2}º sem/${y}`;
    case "anual":
      return String(y);
  }
}

/** Situação de um período para um tipo: pelo documento enviado ou, sem ele, pelo prazo. */
export function recurringCellState(
  doc: { status: string } | null | undefined,
  start: string,
  periodicidade: Periodicidade,
  prazoDias: number,
  today: string
): RecurringCellState {
  if (doc) {
    if (doc.status === "rejeitado") return "rejeitado";
    if (doc.status === "aguardando_validacao" || doc.status === "pendente") return "aguardando_validacao";
    return "aprovado";
  }
  return today > recurringDeadline(start, periodicidade, prazoDias) ? "atrasado" : "a_enviar";
}

/**
 * O período se aplica: colaborador admitido até o fim dele e não desligado. Também não cobra antes do
 * período anterior ao cadastro do tipo (permite registrar o período recém-encerrado, sem atraso retroativo).
 */
export function periodApplies(
  start: string,
  periodicidade: Periodicidade,
  opts: { dataAdmissao?: string | null; status?: string | null; tipoCriadoEm: Date | string }
) {
  if (opts.status === "desligado") return false;
  if (opts.dataAdmissao && String(opts.dataAdmissao).slice(0, 10) > periodEnd(start, periodicidade)) return false;
  const criadoEm = typeof opts.tipoCriadoEm === "string" ? opts.tipoCriadoEm.slice(0, 10) : toDateOnly(opts.tipoCriadoEm);
  const periodoDoCadastro = periodStart(criadoEm, periodicidade);
  const anterior = periodStart(addDaysDateOnly(periodoDoCadastro, -1), periodicidade);
  return start >= anterior;
}

/** Normaliza periodicidade vinda do banco (texto livre) com fallback para mensal. */
export function asPeriodicidade(value: string | null | undefined): Periodicidade {
  return (PERIODICIDADES as readonly string[]).includes(value ?? "") ? (value as Periodicidade) : "mensal";
}
