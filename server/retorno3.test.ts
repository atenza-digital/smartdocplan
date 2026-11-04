import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateChecklist, type ChecklistDocument, type ChecklistRequirement } from "../shared/compliance";
import { splitDocumentVersions } from "../shared/documentVersions";
import { canAccessHealthData, canSendHealthDocuments } from "../shared/permissions";
import { MIGRATIONS } from "./_core/postgresMigrations";

const HOJE = new Date("2026-11-04T12:00:00Z");
const req: ChecklistRequirement = { id: 1, documentoNome: "ASO", categoria: "exame_medico", validadeMeses: 12, ordem: 1 };
const doc = (over: Partial<ChecklistDocument> & { id: number }): ChecklistDocument => ({
  nome: "ASO",
  categoria: "exame_medico",
  requirementId: 1,
  status: "valido",
  dataEmissao: "2026-06-01",
  validade: "2027-06-01",
  createdAt: `2026-06-0${Math.min(over.id, 9)}T10:00:00Z`,
  substituiDocId: null,
  ...over,
});
const avaliar = (docs: ChecklistDocument[]) => {
  const r = evaluateChecklist([req], docs, HOJE);
  return { estado: r.items[0].estado, docId: r.items[0].doc?.id ?? null, liberacao: r.liberacao };
};

describe("Versões de documento: o que fica em vigor", () => {
  it("versão nova pendente fica presa à anterior; substituído e excluído saem", () => {
    const docs = [doc({ id: 1 }), doc({ id: 2, status: "aguardando_validacao", substituiDocId: 1 }), doc({ id: 3, status: "substituido" }), doc({ id: 4, status: "excluido" })];
    const { emVigor, novasVersoes } = splitDocumentVersions(docs);
    expect(emVigor.map((d) => d.id)).toEqual([1]);
    expect(novasVersoes.get(1)?.id).toBe(2);
  });

  it("sem a anterior na lista (excluída ou substituída), a versão nova vale sozinha", () => {
    const { emVigor, novasVersoes } = splitDocumentVersions([doc({ id: 2, status: "aguardando_validacao", substituiDocId: 1 })]);
    expect(emVigor.map((d) => d.id)).toEqual([2]);
    expect(novasVersoes.size).toBe(0);
  });

  it("entre duas versões novas da mesma anterior, mostra a mais recente", () => {
    const docs = [doc({ id: 1 }), doc({ id: 2, status: "rejeitado", substituiDocId: 1 }), doc({ id: 3, status: "aguardando_validacao", substituiDocId: 1 })];
    expect(splitDocumentVersions(docs).novasVersoes.get(1)?.id).toBe(3);
  });
});

describe("Versões de documento: conformidade e liberação", () => {
  it("anterior aprovada + nova em validação: continua aprovado e liberado", () => {
    expect(avaliar([doc({ id: 1 }), doc({ id: 2, status: "aguardando_validacao", substituiDocId: 1 })])).toEqual({ estado: "aprovado", docId: 1, liberacao: "liberado" });
  });

  it("anterior aprovada + nova rejeitada: continua aprovado (a rejeição não derruba a liberação)", () => {
    expect(avaliar([doc({ id: 1 }), doc({ id: 2, status: "rejeitado", substituiDocId: 1 })])).toEqual({ estado: "aprovado", docId: 1, liberacao: "liberado" });
  });

  it("nova aprovada: a anterior vira histórico e a nova passa a valer", () => {
    expect(avaliar([doc({ id: 1, status: "substituido" }), doc({ id: 2, substituiDocId: 1, validade: "2027-10-01" })])).toEqual({ estado: "aprovado", docId: 2, liberacao: "liberado" });
  });

  it("anterior vencida + nova em validação: item fica em validação (em análise), não vencido", () => {
    const docs = [doc({ id: 1, validade: "2026-10-01" }), doc({ id: 2, status: "aguardando_validacao", substituiDocId: 1, validade: "2027-10-01" })];
    expect(avaliar(docs)).toEqual({ estado: "aguardando_validacao", docId: 2, liberacao: "em_analise" });
  });

  it("anterior vencida + nova rejeitada: continua vencido", () => {
    const docs = [doc({ id: 1, validade: "2026-10-01" }), doc({ id: 2, status: "rejeitado", substituiDocId: 1 })];
    expect(avaliar(docs)).toEqual({ estado: "vencido", docId: 1, liberacao: "aguardando_documentacao" });
  });

  it("documentos antigos, sem versão, seguem iguais", () => {
    expect(avaliar([doc({ id: 1 })])).toEqual({ estado: "aprovado", docId: 1, liberacao: "liberado" });
    expect(avaliar([doc({ id: 1, status: "aguardando_validacao" })])).toEqual({ estado: "aguardando_validacao", docId: 1, liberacao: "em_analise" });
  });
});

describe("Documento de saúde por perfil", () => {
  it("Admin da empresa envia e vê a situação, mas não abre o arquivo", () => {
    expect(canSendHealthDocuments("company_admin")).toBe(true);
    expect(canAccessHealthData("company_admin")).toBe(false);
  });

  it("Administrador Geral e RH enviam e abrem; analista, auditor e consulta não enviam", () => {
    for (const role of ["platform_admin", "company_hr"]) {
      expect(canSendHealthDocuments(role)).toBe(true);
      expect(canAccessHealthData(role)).toBe(true);
    }
    for (const role of ["platform_analyst", "platform_auditor", "company_viewer", null]) expect(canSendHealthDocuments(role)).toBe(false);
  });
});

describe("Migration da Etapa 3a", () => {
  it("registrada depois das anteriores, só adiciona coluna e índice", () => {
    expect(MIGRATIONS.indexOf("20261104_documento_versoes.sql")).toBeGreaterThan(MIGRATIONS.indexOf("20261009_senha_inicial.sql"));
    const sql = readFileSync(resolve("drizzle/migrations", "20261104_documento_versoes.sql"), "utf8");
    const codigo = sql.split("\n").filter((linha) => !linha.trim().startsWith("--")).join("\n").toUpperCase();
    expect(codigo).not.toMatch(/DROP\s+(TABLE|COLUMN|INDEX)|DELETE\s+FROM|TRUNCATE|UPDATE\s/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "substituiDocId" integer/);
  });
});
