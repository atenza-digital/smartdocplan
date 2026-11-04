export type NotificationSeverity = "urgente" | "atencao" | "info";

/**
 * Urgência de um aviso, derivada do `tipo` (que guarda a chave do aviso e termina com a faixa de vencimento).
 * - urgente: documento rejeitado, pedido cadastral devolvido, documento ou prazo vencido, recorrente atrasado;
 * - atencao: vence em até 7 ou 30 dias;
 * - info: o resto.
 */
export function notificationSeverity(tipo: string | null | undefined): NotificationSeverity {
  const t = tipo ?? "";
  if (t === "documento_rejeitado" || t === "company_update_request_rejected") return "urgente";
  if (t.startsWith("recorrente_atraso_") || t.endsWith("_vencido")) return "urgente";
  if (t.endsWith("_7") || t.endsWith("_30")) return "atencao";
  return "info";
}
