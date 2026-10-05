// Fluxo de status das solicitações de RH (usado no kanban e validado no servidor).
export const REQUEST_STATUSES = [
  "nova",
  "em_analise",
  "aguardando_documentos",
  "aguardando_correcao",
  "aprovado",
  "concluido",
  "rejeitado",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  nova: "Novas",
  em_analise: "Em análise",
  aguardando_documentos: "Aguard. documentos",
  aguardando_correcao: "Aguard. correção",
  aprovado: "Aprovadas",
  concluido: "Concluídas",
  rejeitado: "Rejeitadas",
};

export const NEXT_REQUEST_STATUS: Record<RequestStatus, readonly RequestStatus[]> = {
  nova: ["em_analise", "aguardando_documentos", "rejeitado"],
  em_analise: ["aguardando_documentos", "aguardando_correcao", "aprovado", "rejeitado"],
  aguardando_documentos: ["em_analise", "aprovado", "rejeitado"],
  aguardando_correcao: ["em_analise", "rejeitado"],
  aprovado: ["concluido", "rejeitado"],
  concluido: [],
  rejeitado: [],
};

/** Mesmo status é aceito (salvar só observações); demais destinos seguem o fluxo acima. */
export function canTransitionRequest(from: string, to: string) {
  if (from === to) return true;
  return (NEXT_REQUEST_STATUS[from as RequestStatus] ?? []).includes(to as RequestStatus);
}
