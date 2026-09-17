export const vacationStatusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  pendente: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Correção solicitada",
  cancelado: "Cancelado",
  em_ferias: "Em férias",
  concluido: "Período encerrado",
};
export function brazilToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function calendarDays(start: string, end: string) {
  return (
    Math.round(
      (Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) /
        86400000
    ) + 1
  );
}
export function vacationDisplayStatus(
  record: { status: string; startDate: string; endDate: string },
  today = brazilToday()
) {
  if (record.status !== "aprovado") return record.status;
  if (record.endDate < today) return "concluido";
  if (record.startDate <= today) return "em_ferias";
  return "aprovado";
}
export function deadlineDays(deadline: string | null, today = brazilToday()) {
  return deadline ? calendarDays(today, deadline) - 1 : null;
}
