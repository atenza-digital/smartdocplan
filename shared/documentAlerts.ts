import { deadlineDays } from "./vacations";

export type DocumentAlertThreshold = "30" | "7" | "vencido";

/**
 * Faixa de alerta de um documento pela validade: vence em até 30 dias, em até 7 dias, ou venceu.
 * Vencidos há mais de 30 dias não geram aviso (evita uma enxurrada na primeira execução; continuam nos painéis).
 */
export function documentAlertThreshold(validade: string | null | undefined, today: string): DocumentAlertThreshold | null {
  const days = deadlineDays(validade ? String(validade).slice(0, 10) : null, today);
  if (days === null || days > 30) return null;
  if (days < -30) return null;
  if (days < 0) return "vencido";
  return days <= 7 ? "7" : "30";
}

export function documentAlertTitle(threshold: DocumentAlertThreshold) {
  if (threshold === "vencido") return "Documento vencido";
  return threshold === "7" ? "Documento vence em até 7 dias" : "Documento vence em até 30 dias";
}
