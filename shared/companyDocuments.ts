import { normalizeTextSearch } from "./formValidation";

/** Documentos fixos da empresa (um por tipo; cada novo envio vira uma versão). */
export const COMPANY_DOCUMENT_TYPES = [
  { tipo: "cartao_cnpj", nome: "Cartão CNPJ", obrigatorio: true },
  { tipo: "contrato_social", nome: "Contrato Social", obrigatorio: true },
  { tipo: "pcmso", nome: "PCMSO", obrigatorio: true },
  { tipo: "pgr", nome: "PGR", obrigatorio: true },
  { tipo: "ltcat", nome: "LTCAT", obrigatorio: true },
  { tipo: "cno", nome: "CNO", obrigatorio: false },
] as const;

/** Tipo usado nos documentos mensais da empresa (identificados por recurringTypeId e competência). */
export const COMPANY_MONTHLY_DOCUMENT_TIPO = "mensal";

const simplify = (value: string) => normalizeTextSearch(value).replace(/[^a-z0-9]/g, "");

/**
 * Código canônico do tipo (ex.: "PGR", "pgr" e "Cartao CNPJ" → "pgr" e "cartao_cnpj"),
 * aceitando o código ou o nome, sem diferenciar acento e maiúsculas. Tipos fora da lista ficam como estão.
 */
export function companyDocumentTypeKey(tipo: string) {
  const key = simplify(tipo);
  return COMPANY_DOCUMENT_TYPES.find((item) => simplify(item.tipo) === key || simplify(item.nome) === key)?.tipo ?? tipo;
}

/** Versão atual de cada tipo fixo: o envio mais recente. A chave do mapa é o código canônico do tipo. */
export function latestCompanyDocuments<T extends { tipo: string; createdAt: Date | string; id: number; recurringTypeId?: number | null }>(docs: T[]) {
  const latest = new Map<string, T>();
  for (const doc of docs) {
    if (doc.recurringTypeId) continue;
    const key = companyDocumentTypeKey(doc.tipo);
    const current = latest.get(key);
    if (!current || new Date(doc.createdAt).getTime() > new Date(current.createdAt).getTime() || (doc.createdAt === current.createdAt && doc.id > current.id)) {
      latest.set(key, doc);
    }
  }
  return latest;
}
