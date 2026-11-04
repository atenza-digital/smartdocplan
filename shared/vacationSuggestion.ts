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

type VacationOpts = {
  dataAdmissao: string | null | undefined;
  params: VacationParams;
  programados: string[];
  /** Períodos aquisitivos que terminam até esta data já foram gozados (fora do sistema). */
  feriasEmDiaAte?: string | Date | null;
};

/** "Férias em dia até": opcional, não antes da admissão e não depois de hoje. Retorna a mensagem de erro ou null. */
export function feriasEmDiaAteError(valor: string | null | undefined, dataAdmissao: string | Date | null | undefined, today: string) {
  if (!valor) return null;
  if (valor > today) return "“Férias em dia até” não pode ser uma data futura.";
  if (dataAdmissao && valor < toDateOnly(dataAdmissao)) return "“Férias em dia até” não pode ser anterior à admissão.";
  return null;
}

const toDateOnly =(value: string | Date) => (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);

/**
 * Situação de férias do colaborador: os períodos com prazo para solicitar vencido (`vencidos`, do mais antigo
 * ao mais novo) e o próximo período ainda no prazo (`proxima`). Ignora períodos já programados (rascunho, em
 * análise ou aprovada) e os quitados por `feriasEmDiaAte`.
 * Sem `feriasEmDiaAte`, vencidos há mais de 30 dias são ignorados, para não listar anos de períodos antigos de
 * quem já é contratado; com ele, todos os vencidos depois da data aparecem.
 */
export function vacationStatus(opts: VacationOpts, today: string) {
  if (!opts.dataAdmissao) return { vencidos: [], proxima: null };
  const admissao = String(opts.dataAdmissao).slice(0, 10);
  const programados = new Set(opts.programados.map((d) => String(d).slice(0, 10)));
  const emDiaAte = opts.feriasEmDiaAte ? toDateOnly(opts.feriasEmDiaAte) : null;
  const corte = emDiaAte ? null : addDaysDateOnly(today, -30);
  const vencidos: (ReturnType<typeof vacationPeriod> & { numero: number; situacao: VacationSuggestionState })[] = [];
  for (let k = 0; k < 100; k++) {
    const periodo = vacationPeriod(admissao, opts.params, k);
    if (emDiaAte && periodo.fim <= emDiaAte) continue;
    if (programados.has(periodo.inicio)) continue;
    if (corte && periodo.limite < corte) continue;
    const situacao: VacationSuggestionState =
      today < periodo.aquisicao ? "em_aquisicao" : today <= periodo.limite ? "a_solicitar" : "prazo_vencido";
    if (situacao === "prazo_vencido") {
      vencidos.push({ ...periodo, numero: k + 1, situacao });
      continue;
    }
    return { vencidos, proxima: { ...periodo, numero: k + 1, situacao } };
  }
  return { vencidos, proxima: null };
}

/**
 * Próximas férias sugeridas: o período mais antigo ainda sem programação ativa (rascunho, em análise ou aprovada)
 * e não quitado por `feriasEmDiaAte`. Sem esse campo, períodos com limite vencido há mais de 30 dias são ignorados.
 */
export function suggestNextVacation(opts: VacationOpts, today: string) {
  const { vencidos, proxima } = vacationStatus(opts, today);
  return vencidos[0] ?? proxima;
}
