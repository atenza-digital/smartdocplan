const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Soma meses a uma data AAAA-MM-DD sem passar por fuso. Quando o dia não existe no mês de destino,
 * usa o último dia do mês (31/01 + 1 mês = 28/02 ou 29/02).
 */
export function addMonthsDateOnly(dateOnly: string, months: number) {
  const [year, month, day] = dateOnly.slice(0, 10).split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(Math.min(day, lastDay))}`;
}

/** Soma dias a uma data AAAA-MM-DD sem passar por fuso. */
export function addDaysDateOnly(dateOnly: string, days: number) {
  const [year, month, day] = dateOnly.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
