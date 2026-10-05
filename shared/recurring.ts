/**
 * Documentos mensais (recorrentes). A competência (AAAA-MM) é o mês a que o documento se refere;
 * o prazo de envio é o dia limite do mês seguinte (ex.: folha de ponto de 09/2026 até 10/10/2026).
 */

export type RecurringCellState = "aprovado" | "aguardando_validacao" | "rejeitado" | "a_enviar" | "atrasado";

export const RECURRING_STATE_LABELS: Record<RecurringCellState, string> = {
  aprovado: "Enviado",
  aguardando_validacao: "Em validação",
  rejeitado: "Rejeitado",
  a_enviar: "No prazo",
  atrasado: "Atrasado",
};

const COMPETENCIA_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const pad = (value: number) => String(value).padStart(2, "0");

export function isValidCompetencia(value: string) {
  return COMPETENCIA_RE.test(value);
}

export function competenciaOf(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function addCompetencia(competencia: string, months: number) {
  const [year, month] = competencia.split("-").map(Number);
  return competenciaOf(new Date(year, month - 1 + months, 1));
}

/** "2026-09" → "09/2026" */
export function formatCompetencia(competencia: string) {
  const [year, month] = competencia.split("-");
  return `${month}/${year}`;
}

/** Prazo de envio (AAAA-MM-DD): dia limite do mês seguinte à competência. */
export function recurringDeadline(competencia: string, diaLimite: number) {
  const next = addCompetencia(competencia, 1);
  return `${next}-${pad(Math.min(Math.max(diaLimite, 1), 28))}`;
}

/** Últimas `quantidade` competências encerradas (o mês corrente só vira competência no mês seguinte), da mais antiga à mais recente. */
export function recentCompetencias(quantidade: number, referenceDate = new Date()) {
  const last = addCompetencia(competenciaOf(referenceDate), -1);
  return Array.from({ length: quantidade }, (_, index) => addCompetencia(last, index - quantidade + 1));
}

/** A competência pode ser enviada: não pode ser futura (o mês corrente é aceito para quem envia adiantado). */
export function isCompetenciaAllowed(competencia: string, referenceDate = new Date()) {
  return isValidCompetencia(competencia) && competencia <= competenciaOf(referenceDate) && competencia >= "2000-01";
}

/** Situação de uma competência para um tipo: pelo documento enviado ou, sem ele, pelo prazo. */
export function recurringCellState(
  doc: { status: string } | null | undefined,
  competencia: string,
  diaLimite: number,
  referenceDate = new Date()
): RecurringCellState {
  if (doc) {
    if (doc.status === "rejeitado") return "rejeitado";
    if (doc.status === "aguardando_validacao" || doc.status === "pendente") return "aguardando_validacao";
    return "aprovado";
  }
  const today = `${referenceDate.getFullYear()}-${pad(referenceDate.getMonth() + 1)}-${pad(referenceDate.getDate())}`;
  return today > recurringDeadline(competencia, diaLimite) ? "atrasado" : "a_enviar";
}

/**
 * A competência se aplica ao colaborador: admitido até o fim do mês e (se desligado) não considerado.
 * Também ignora competências anteriores ao cadastro do tipo, para não gerar atraso retroativo.
 */
export function competenciaApplies(
  competencia: string,
  opts: { dataAdmissao?: string | null; status?: string | null; tipoCriadoEm: Date | string }
) {
  if (opts.status === "desligado") return false;
  if (opts.dataAdmissao && opts.dataAdmissao.slice(0, 7) > competencia) return false;
  const criadoEm = new Date(opts.tipoCriadoEm);
  // Só a partir do mês anterior ao cadastro do tipo (permite registrar o mês recém-fechado).
  return competencia >= addCompetencia(competenciaOf(criadoEm), -1);
}
