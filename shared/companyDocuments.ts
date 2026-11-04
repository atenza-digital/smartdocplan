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

type CompanyDocLike = {
  id: number;
  tipo: string;
  createdAt: Date | string;
  status?: string | null;
  recurringTypeId?: number | null;
  competencia?: string | null;
};

/** Envio aprovado (documentos antigos, sem situação gravada, contam como aprovados). */
export const isCompanyDocApproved = (doc: { status?: string | null }) => !doc.status || doc.status === "valido";
/** Envio que ainda não vale: aguardando a validação da equipe ou rejeitado. */
const isCompanyDocNotInForce = (doc: { status?: string | null }) => doc.status === "aguardando_validacao" || doc.status === "rejeitado";

/** Chave de agrupamento: tipo fixo canônico, ou tipo recorrente + período. */
export function companyDocumentKey(doc: Pick<CompanyDocLike, "tipo" | "recurringTypeId" | "competencia">) {
  return doc.recurringTypeId ? `recorrente:${doc.recurringTypeId}:${doc.competencia ?? ""}` : companyDocumentTypeKey(doc.tipo);
}

const newestFirst = (a: CompanyDocLike, b: CompanyDocLike) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id;

/**
 * Versões de cada documento da empresa (chave de `companyDocumentKey`):
 * `emVigor` é o envio aprovado mais recente; `novaVersao` é o envio mais novo que ele ainda não aprovado
 * (aguardando validação ou rejeitado), ou o mais novo de todos quando nada foi aprovado; `historico` são os demais.
 * Excluídos ficam de fora.
 */
export function splitCompanyDocuments<T extends CompanyDocLike>(docs: T[]) {
  const groups = new Map<string, T[]>();
  for (const doc of docs) {
    if (doc.status === "excluido") continue;
    const key = companyDocumentKey(doc);
    groups.set(key, [...(groups.get(key) ?? []), doc]);
  }
  const result = new Map<string, { emVigor: T | null; novaVersao: T | null; historico: T[] }>();
  groups.forEach((lista, key) => {
    const ordenados = [...lista].sort(newestFirst);
    const emVigor = ordenados.find(isCompanyDocApproved) ?? null;
    const limite = emVigor ? ordenados.indexOf(emVigor) : ordenados.length;
    const novaVersao = ordenados.slice(0, limite).find(isCompanyDocNotInForce) ?? null;
    result.set(key, { emVigor, novaVersao, historico: ordenados.filter((doc) => doc !== emVigor && doc !== novaVersao) });
  });
  return result;
}

/** Versão em vigor de cada tipo fixo: o envio aprovado mais recente. A chave do mapa é o código canônico do tipo. */
export function latestCompanyDocuments<T extends CompanyDocLike>(docs: T[]) {
  const latest = new Map<string, T>();
  splitCompanyDocuments(docs.filter((doc) => !doc.recurringTypeId)).forEach(({ emVigor }, key) => {
    if (emVigor) latest.set(key, emVigor);
  });
  return latest;
}
