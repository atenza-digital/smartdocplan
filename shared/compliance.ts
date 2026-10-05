import { getValidityState, normalizeTextSearch } from "./formValidation";

/** Situação de cada item do checklist de documentos exigidos do cargo. */
export type ChecklistItemState = "pendente" | "aguardando_validacao" | "rejeitado" | "vencido" | "aprovado";

/** Liberação do colaborador, derivada do checklist. */
export type EmployeeRelease = "sem_requisitos" | "aguardando_documentacao" | "em_analise" | "liberado";

export const CHECKLIST_STATE_LABELS: Record<ChecklistItemState, string> = {
  pendente: "Pendente",
  aguardando_validacao: "Aguardando validação",
  rejeitado: "Rejeitado",
  vencido: "Vencido",
  aprovado: "Aprovado",
};

export const RELEASE_LABELS: Record<EmployeeRelease, string> = {
  sem_requisitos: "Sem requisitos definidos",
  aguardando_documentacao: "Aguardando documentação",
  em_analise: "Em análise",
  liberado: "Liberado",
};

export type ChecklistRequirement = {
  id: number;
  documentoNome: string;
  categoria: string;
  validadeMeses: number | null;
  ordem: number;
};

export type ChecklistDocument = {
  id: number;
  nome: string;
  categoria: string;
  requirementId: number | null;
  status: string;
  dataEmissao: string | null;
  validade: string | null;
  createdAt: Date | string;
};

function addMonths(dateOnly: string, months: number) {
  const [year, month, day] = dateOnly.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1 + months, day);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Validade efetiva: a informada no documento ou, sem ela, a emissão somada à validade em meses do requisito. */
export function effectiveValidity(doc: ChecklistDocument, requirement?: ChecklistRequirement) {
  if (doc.validade) return String(doc.validade).slice(0, 10);
  if (doc.dataEmissao && requirement?.validadeMeses) return addMonths(String(doc.dataEmissao), requirement.validadeMeses);
  return null;
}

const newestFirst = (a: ChecklistDocument, b: ChecklistDocument) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id;

/**
 * Documento que atende o requisito: o vinculado a ele. Para documentos antigos sem vínculo, vale o mesmo nome
 * ou, na mesma categoria, um nome contido no outro (ex.: "NR-35" atende "Certificado NR-35").
 */
export function findRequirementDocument(requirement: ChecklistRequirement, docs: ChecklistDocument[]) {
  const linked = docs.filter((doc) => doc.requirementId === requirement.id).sort(newestFirst);
  if (linked.length) return linked[0];
  const nome = normalizeTextSearch(requirement.documentoNome);
  const unlinked = docs.filter((doc) => doc.requirementId == null);
  const sameName = unlinked.filter((doc) => normalizeTextSearch(doc.nome) === nome).sort(newestFirst);
  if (sameName.length) return sameName[0];
  const similar = unlinked
    .filter((doc) => {
      const docNome = normalizeTextSearch(doc.nome);
      return doc.categoria === requirement.categoria && docNome.length >= 3 && (nome.includes(docNome) || docNome.includes(nome));
    })
    .sort(newestFirst);
  return similar[0] ?? null;
}

export function checklistItemState(doc: ChecklistDocument | null, requirement: ChecklistRequirement, referenceDate = new Date()): ChecklistItemState {
  if (!doc) return "pendente";
  if (doc.status === "rejeitado") return "rejeitado";
  if (doc.status === "aguardando_validacao" || doc.status === "pendente") return "aguardando_validacao";
  if (getValidityState(effectiveValidity(doc, requirement), referenceDate) === "vencido") return "vencido";
  return "aprovado";
}

/** Calcula checklist, conformidade (0–100, ou null sem requisitos) e liberação do colaborador. */
export function evaluateChecklist(requirements: ChecklistRequirement[], docs: ChecklistDocument[], referenceDate = new Date()) {
  const ordered = [...requirements].sort((a, b) => a.ordem - b.ordem || a.id - b.id);
  const items = ordered.map((requirement) => {
    const doc = findRequirementDocument(requirement, docs);
    return { requirement, doc, estado: checklistItemState(doc, requirement, referenceDate) };
  });
  const total = items.length;
  const aprovados = items.filter((item) => item.estado === "aprovado").length;
  let liberacao: EmployeeRelease;
  if (total === 0) liberacao = "sem_requisitos";
  else if (items.some((item) => item.estado === "pendente" || item.estado === "rejeitado" || item.estado === "vencido")) liberacao = "aguardando_documentacao";
  else if (items.some((item) => item.estado === "aguardando_validacao")) liberacao = "em_analise";
  else liberacao = "liberado";
  return {
    items,
    total,
    aprovados,
    score: total === 0 ? null : Math.round((aprovados / total) * 100),
    liberacao,
  };
}
