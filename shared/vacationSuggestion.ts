import { addDaysDateOnly, addMonthsDateOnly } from "./dates";

export const DEFAULT_VACATION_PARAMS = { feriasMesesAquisicao: 12, feriasMesesParaSolicitar: 1 };

export type VacationParams = { feriasMesesAquisicao: number; feriasMesesParaSolicitar: number };

export type VacationSuggestionState = "em_aquisicao" | "a_solicitar" | "prazo_vencido";

export const VACATION_SUGGESTION_LABELS: Record<VacationSuggestionState, string> = {
  em_aquisicao: "Em aquisição",
  a_solicitar: "Pode solicitar",
  prazo_vencido: "Prazo para solicitar vencido",
};

/** Período k (0, 1, …) contado da admissão: início, fim, data em que adquire e limite para solicitar. */
export function vacationPeriod(dataAdmissao: string, params: VacationParams, k: number) {
  const inicio = addMonthsDateOnly(dataAdmissao, k * params.feriasMesesAquisicao);
  const aquisicao = addMonthsDateOnly(dataAdmissao, (k + 1) * params.feriasMesesAquisicao);
  return {
    inicio,
    fim: addDaysDateOnly(aquisicao, -1),
    aquisicao,
    limite: addMonthsDateOnly(aquisicao, params.feriasMesesParaSolicitar),
  };
}

/**
 * Próximas férias sugeridas: o período mais antigo ainda sem programação ativa (rascunho, em análise ou aprovada).
 * Períodos com limite vencido há mais de 30 dias são ignorados para não sugerir férias muito antigas.
 */
export function suggestNextVacation(
  opts: { dataAdmissao: string | null | undefined; params: VacationParams; programados: string[] },
  today: string
) {
  if (!opts.dataAdmissao) return null;
  const admissao = String(opts.dataAdmissao).slice(0, 10);
  const programados = new Set(opts.programados.map((d) => String(d).slice(0, 10)));
  const corte = addDaysDateOnly(today, -30);
  for (let k = 0; k < 100; k++) {
    const periodo = vacationPeriod(admissao, opts.params, k);
    if (programados.has(periodo.inicio)) continue;
    if (periodo.limite < corte) continue;
    const situacao: VacationSuggestionState =
      today < periodo.aquisicao ? "em_aquisicao" : today <= periodo.limite ? "a_solicitar" : "prazo_vencido";
    return { ...periodo, numero: k + 1, situacao };
  }
  return null;
}
