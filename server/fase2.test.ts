import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { formatDateOnlyBr, getDocumentDatesError, getValidityState } from "@shared/formValidation";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  const base = {
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "local",
    role: "platform_admin" as const,
    companyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user: { ...base, ...overrides } as any,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

const PDF_BASE64 = Buffer.from("%PDF-1.4\n%teste\n").toString("base64");
const REF = new Date(2026, 9, 5); // 05/10/2026

// ─── A. Datas de documentos ──────────────────────────────────────────────────

describe("Datas de documentos", () => {
  it("aceita datas vazias e datas coerentes", () => {
    expect(getDocumentDatesError(undefined, undefined, REF)).toBeNull();
    expect(getDocumentDatesError("2026-01-10", "2027-01-10", REF)).toBeNull();
  });

  it("recusa validade em 1900 (caso do print do cliente)", () => {
    expect(getDocumentDatesError(undefined, "1900-04-04", REF)).toMatch(/a partir de 01\/01\/1950/);
  });

  it("recusa emissão no futuro, validade anterior à emissão e validade acima de 50 anos", () => {
    expect(getDocumentDatesError("2026-12-01", undefined, REF)).toMatch(/futuro/);
    expect(getDocumentDatesError("2026-05-10", "2026-05-01", REF)).toMatch(/anterior à data de emissão/);
    expect(getDocumentDatesError(undefined, "2099-01-01", REF)).toMatch(/não pode passar/);
  });

  it("recusa data inexistente", () => {
    expect(getDocumentDatesError("2026-02-30", undefined, REF)).toMatch(/inválida/);
  });

  it("deriva a situação de validade", () => {
    expect(getValidityState(null, REF)).toBe("sem_validade");
    expect(getValidityState("2026-10-04", REF)).toBe("vencido");
    expect(getValidityState("2026-10-05", REF)).toBe("a_vencer");
    expect(getValidityState("2026-11-04", REF)).toBe("a_vencer");
    expect(getValidityState("2026-11-05", REF)).toBe("valido");
  });

  it("formata data sem perder um dia por fuso", () => {
    expect(formatDateOnlyBr("2026-10-05")).toBe("05/10/2026");
  });

  it("servidor recusa documento de colaborador com validade em 1900", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "company_hr" as any, companyId: 1 }));
    await expect(
      caller.employeeDocs.create({ employeeId: 1, companyId: 1, categoria: "pessoal", nome: "RG", validade: "1900-04-04", fileBase64: PDF_BASE64 })
    ).rejects.toThrow(/a partir de 01\/01\/1950/);
  });

  it("servidor recusa data em formato inválido", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "company_hr" as any, companyId: 1 }));
    await expect(
      caller.employeeDocs.create({ employeeId: 1, companyId: 1, categoria: "pessoal", nome: "RG", validade: "04/04/1900" as any, fileBase64: PDF_BASE64 })
    ).rejects.toThrow();
  });
});

// ─── B/C. Checklist, conformidade e liberação ────────────────────────────────

import { evaluateChecklist, type ChecklistDocument, type ChecklistRequirement } from "@shared/compliance";

const req = (id: number, documentoNome: string, categoria = "treinamento", validadeMeses: number | null = null): ChecklistRequirement =>
  ({ id, documentoNome, categoria, validadeMeses, ordem: id });
const doc = (id: number, nome: string, extra: Partial<ChecklistDocument> = {}): ChecklistDocument =>
  ({ id, nome, categoria: "treinamento", requirementId: null, status: "valido", dataEmissao: null, validade: null, createdAt: new Date(2026, 0, id), ...extra });

describe("Checklist e conformidade", () => {
  it("sem requisitos: conformidade nula e 'sem requisitos', não 100%", () => {
    const r = evaluateChecklist([], [doc(1, "RG")], REF);
    expect(r.score).toBeNull();
    expect(r.liberacao).toBe("sem_requisitos");
  });

  it("requisitos sem documentos: 0% e aguardando documentação", () => {
    const r = evaluateChecklist([req(1, "NR-35"), req(2, "ASO", "exame_medico")], [], REF);
    expect(r.score).toBe(0);
    expect(r.liberacao).toBe("aguardando_documentacao");
    expect(r.items.map((i) => i.estado)).toEqual(["pendente", "pendente"]);
  });

  it("documento vinculado aguardando validação deixa em análise", () => {
    const r = evaluateChecklist([req(1, "NR-35")], [doc(1, "Qualquer", { requirementId: 1, status: "aguardando_validacao" })], REF);
    expect(r.liberacao).toBe("em_analise");
    expect(r.score).toBe(0);
  });

  it("todos aprovados e válidos: 100% e liberado", () => {
    const r = evaluateChecklist([req(1, "NR-35"), req(2, "NR-18")], [doc(1, "x", { requirementId: 1 }), doc(2, "y", { requirementId: 2, validade: "2027-01-01" })], REF);
    expect(r.score).toBe(100);
    expect(r.liberacao).toBe("liberado");
  });

  it("vencido e rejeitado voltam para aguardando documentação", () => {
    const vencido = evaluateChecklist([req(1, "NR-35")], [doc(1, "x", { requirementId: 1, validade: "2026-01-01" })], REF);
    expect(vencido.items[0].estado).toBe("vencido");
    expect(vencido.liberacao).toBe("aguardando_documentacao");
    const rejeitado = evaluateChecklist([req(1, "NR-35")], [doc(1, "x", { requirementId: 1, status: "rejeitado" })], REF);
    expect(rejeitado.items[0].estado).toBe("rejeitado");
  });

  it("validade em meses do requisito vence documento só com emissão", () => {
    const r = evaluateChecklist([req(1, "NR-35", "treinamento", 12)], [doc(1, "x", { requirementId: 1, dataEmissao: "2025-09-01" })], REF);
    expect(r.items[0].estado).toBe("vencido");
  });

  it("documento antigo sem vínculo atende por nome parecido na mesma categoria", () => {
    const r = evaluateChecklist([req(1, "Certificado NR-35"), req(2, "ASO", "exame_medico")], [doc(1, "NR-35"), doc(2, "ASO periodico", { categoria: "exame_medico" })], REF);
    expect(r.score).toBe(100);
  });

  it("nome parecido em outra categoria não conta", () => {
    const r = evaluateChecklist([req(1, "Certificado NR-35")], [doc(1, "NR-35", { categoria: "pessoal" })], REF);
    expect(r.items[0].estado).toBe("pendente");
  });

  it("vale o documento mais recente", () => {
    const r = evaluateChecklist([req(1, "NR-35")], [doc(1, "a", { requirementId: 1 }), doc(2, "b", { requirementId: 1, status: "rejeitado" })], REF);
    expect(r.items[0].estado).toBe("rejeitado");
  });
});

describe("Validação de documentos — permissões", () => {
  it.each(["company_admin", "company_hr", "platform_auditor"])("%s não valida documento", async (role) => {
    const caller = appRouter.createCaller(makeCtx({ role: role as any, companyId: role.startsWith("company") ? 1 : null }));
    await expect(caller.employeeDocs.review({ id: 1, decisao: "aprovar" })).rejects.toThrow(/Só a equipe SmartDocPlan/);
  });

  it("rejeitar exige motivo", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "platform_analyst" as any }));
    await expect(caller.employeeDocs.review({ id: 1, decisao: "rejeitar", motivo: "  " })).rejects.toThrow(/motivo/);
  });

  it("empresa não vê a fila de validação", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "company_admin" as any, companyId: 1 }));
    await expect(caller.employeeDocs.pendingReview()).rejects.toThrow(/Acesso negado/);
  });
});

// ─── D. Documentos mensais ───────────────────────────────────────────────────

import { addCompetencia, competenciaApplies, isCompetenciaAllowed, recentCompetencias, recurringCellState, recurringDeadline } from "@shared/recurring";

describe("Documentos mensais", () => {
  it("prazo é o dia limite do mês seguinte, inclusive na virada do ano", () => {
    expect(recurringDeadline("2026-09", 10)).toBe("2026-10-10");
    expect(recurringDeadline("2026-12", 5)).toBe("2027-01-05");
  });

  it("últimas competências encerradas não incluem o mês corrente", () => {
    expect(recentCompetencias(3, REF)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(addCompetencia("2026-01", -1)).toBe("2025-12");
  });

  it("situação pelo prazo: no prazo até o dia limite, atrasado depois", () => {
    expect(recurringCellState(null, "2026-09", 10, new Date(2026, 9, 10))).toBe("a_enviar");
    expect(recurringCellState(null, "2026-09", 10, new Date(2026, 9, 11))).toBe("atrasado");
    expect(recurringCellState({ status: "valido" }, "2026-09", 10, new Date(2026, 9, 20))).toBe("aprovado");
    expect(recurringCellState({ status: "rejeitado" }, "2026-09", 10, REF)).toBe("rejeitado");
  });

  it("competência futura não é aceita", () => {
    expect(isCompetenciaAllowed("2026-10", REF)).toBe(true);
    expect(isCompetenciaAllowed("2026-11", REF)).toBe(false);
    expect(isCompetenciaAllowed("2026-13", REF)).toBe(false);
  });

  it("não cobra antes da admissão, de desligado nem antes do cadastro do tipo", () => {
    const tipoCriadoEm = new Date(2026, 8, 15); // 15/09/2026
    expect(competenciaApplies("2026-08", { dataAdmissao: "2026-09-01", tipoCriadoEm })).toBe(false);
    expect(competenciaApplies("2026-09", { dataAdmissao: "2026-09-01", tipoCriadoEm })).toBe(true);
    expect(competenciaApplies("2026-09", { status: "desligado", tipoCriadoEm })).toBe(false);
    expect(competenciaApplies("2026-07", { tipoCriadoEm })).toBe(false);
  });

  it.each(["company_viewer", "company_manager", "platform_auditor"])("%s não cadastra documento mensal", async (role) => {
    const caller = appRouter.createCaller(makeCtx({ role: role as any, companyId: role.startsWith("company") ? 1 : null }));
    await expect(caller.recurringDocs.create({ companyId: 1, nome: "Folha de ponto", alvo: "colaborador", diaLimite: 10 })).rejects.toThrow(/não pode configurar/);
  });

  it("dia limite fora de 1 a 28 é recusado", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "company_admin" as any, companyId: 1 }));
    await expect(caller.recurringDocs.create({ companyId: 1, nome: "Folha de ponto", alvo: "colaborador", diaLimite: 31 })).rejects.toThrow(/1 a 28/);
  });
});

// ─── E. Documentos da Empresa ────────────────────────────────────────────────

import { companyDocumentTypeKey, latestCompanyDocuments } from "@shared/companyDocuments";

describe("Documentos da Empresa — versão atual", () => {
  it("vale o envio mais recente de cada tipo e ignora mensais", () => {
    const docs = [
      { id: 1, tipo: "pcmso", createdAt: new Date(2025, 0, 1), recurringTypeId: null, validade: "2025-12-31" },
      { id: 2, tipo: "pcmso", createdAt: new Date(2026, 0, 1), recurringTypeId: null, validade: "2027-01-01" },
      { id: 3, tipo: "mensal", createdAt: new Date(2026, 8, 1), recurringTypeId: 7, validade: null },
      { id: 4, tipo: "pgr", createdAt: new Date(2026, 1, 1), recurringTypeId: null, validade: null },
    ];
    const latest = latestCompanyDocuments(docs);
    expect(latest.get("pcmso")?.id).toBe(2);
    expect(latest.has("mensal")).toBe(false);
    expect(latest.size).toBe(2);
  });
});

describe("Documentos da Empresa — tipo canônico", () => {
  it("aceita código ou nome, sem diferenciar acento e maiúsculas", () => {
    expect(companyDocumentTypeKey("PGR")).toBe("pgr");
    expect(companyDocumentTypeKey("Cartao CNPJ")).toBe("cartao_cnpj");
    expect(companyDocumentTypeKey("Cartão CNPJ")).toBe("cartao_cnpj");
    expect(companyDocumentTypeKey("outro tipo")).toBe("outro tipo");
  });
});

// ─── F. Alertas ──────────────────────────────────────────────────────────────

import { documentAlertThreshold } from "@shared/documentAlerts";

describe("Alertas de vencimento", () => {
  it("faixas: até 30 dias, até 7 dias, vencido recente e nada fora disso", () => {
    expect(documentAlertThreshold("2026-11-05", "2026-10-05")).toBeNull();
    expect(documentAlertThreshold("2026-11-04", "2026-10-05")).toBe("30");
    expect(documentAlertThreshold("2026-10-12", "2026-10-05")).toBe("7");
    expect(documentAlertThreshold("2026-10-05", "2026-10-05")).toBe("7");
    expect(documentAlertThreshold("2026-10-04", "2026-10-05")).toBe("vencido");
    expect(documentAlertThreshold("2026-08-01", "2026-10-05")).toBeNull();
    expect(documentAlertThreshold(null, "2026-10-05")).toBeNull();
  });
});
