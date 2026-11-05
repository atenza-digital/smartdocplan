/**
 * Versões dos documentos do colaborador.
 *
 * Alterar o arquivo ou as datas cria uma versão nova ligada à anterior (`substituiDocId`). A versão nova entra
 * aguardando validação e a anterior aprovada continua valendo até a equipe aprovar a nova; ao aprovar, a anterior
 * vira "substituido" (histórico). Rejeitar a nova mantém a anterior valendo.
 */

/** Status de uma versão nova que ainda não vale (enquanto a anterior estiver em vigor). */
export const NOT_IN_FORCE_STATUSES = ["aguardando_validacao", "pendente", "rejeitado"];

/** Status gravados que contam como aprovado (dados antigos podem ter "vencido"/"a_vencer"; a validade é que decide). */
export const APPROVED_STATUSES = ["valido", "vencido", "a_vencer"];

export type VersionedDocument = {
  id: number;
  status: string;
  substituiDocId?: number | null;
  createdAt: Date | string;
};

const newer = (a: VersionedDocument, b: VersionedDocument) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id;

/**
 * Separa os documentos em vigor das versões novas ainda não aprovadas.
 * - Substituídos e excluídos saem.
 * - Versão nova aguardando validação ou rejeitada, cuja anterior ainda está na lista, não vale: fica em
 *   `novasVersoes`, indexada pelo id da anterior (só a mais recente).
 */
export function splitDocumentVersions<T extends VersionedDocument>(docs: T[]) {
  const ativos = docs.filter((doc) => doc.status !== "substituido" && doc.status !== "excluido");
  const ids = new Set(ativos.map((doc) => doc.id));
  const pendente = (doc: T) =>
    doc.substituiDocId != null && NOT_IN_FORCE_STATUSES.includes(doc.status) && ids.has(doc.substituiDocId);
  const emVigor = ativos.filter((doc) => !pendente(doc));
  const novasVersoes = new Map<number, T>();
  for (const doc of ativos.filter(pendente)) {
    const atual = novasVersoes.get(doc.substituiDocId!);
    if (!atual || newer(doc, atual) > 0) novasVersoes.set(doc.substituiDocId!, doc);
  }
  return { emVigor, novasVersoes };
}

/** Motivo digitado pela equipe sem a pontuação final, para a tela poder acrescentar ". " sem duplicar o ponto. */
export function motivoSemPontoFinal(motivo: string): string {
  return motivo.trim().replace(/[.!;:…\s]+$/, "");
}
