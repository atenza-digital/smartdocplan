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

// ─── D/L. Documentos recorrentes ─────────────────────────────────────────────

import { formatPeriod, isPeriodAllowed, nextPeriodStart, periodApplies, periodEnd, periodStart, recentPeriods, recurringCellState, recurringDeadline } from "@shared/recurring";

describe("Documentos recorrentes", () => {
  const HOJE = "2026-10-05"; // segunda-feira

  it("início e fim de cada periodicidade", () => {
    expect(periodStart("2026-10-08", "semanal")).toBe("2026-10-05");
    expect(periodStart("2026-10-04", "semanal")).toBe("2026-09-28"); // domingo pertence à semana anterior
    expect(periodEnd("2026-09-28", "semanal")).toBe("2026-10-04");
    expect(periodStart("2026-10-20", "quinzenal")).toBe("2026-10-16");
    expect(periodEnd("2026-02-16", "quinzenal")).toBe("2026-02-28");
    expect(periodStart("2026-10-20", "bimestral")).toBe("2026-09-01");
    expect(periodStart("2026-10-20", "trimestral")).toBe("2026-10-01");
    expect(periodStart("2026-10-20", "semestral")).toBe("2026-07-01");
    expect(periodEnd("2026-01-01", "anual")).toBe("2026-12-31");
    expect(nextPeriodStart("2026-12-16", "quinzenal")).toBe("2027-01-01");
  });

  it("prazo em dias após o fim; mensal com 10 dias equivale ao antigo dia 10 do mês seguinte", () => {
    expect(recurringDeadline("2026-09-01", "mensal", 10)).toBe("2026-10-10");
    expect(recurringDeadline("2026-12-01", "mensal", 5)).toBe("2027-01-05");
    expect(recurringDeadline("2026-09-28", "semanal", 2)).toBe("2026-10-06");
  });

  it("últimos períodos encerrados não incluem o atual", () => {
    expect(recentPeriods("mensal", 3, HOJE)).toEqual(["2026-07-01", "2026-08-01", "2026-09-01"]);
    expect(recentPeriods("semanal", 2, HOJE)).toEqual(["2026-09-21", "2026-09-28"]);
    expect(recentPeriods("anual", 1, HOJE)).toEqual(["2025-01-01"]);
  });

  it("rótulos legíveis", () => {
    expect(formatPeriod("2026-09-28", "semanal")).toBe("28/09 a 04/10/2026");
    expect(formatPeriod("2026-09-16", "quinzenal")).toBe("2ª quinz. 09/2026");
    expect(formatPeriod("2026-09-01", "mensal")).toBe("09/2026");
    expect(formatPeriod("2026-07-01", "trimestral")).toBe("3º tri/2026");
  });

  it("situação pelo prazo", () => {
    expect(recurringCellState(null, "2026-09-01", "mensal", 10, "2026-10-10")).toBe("a_enviar");
    expect(recurringCellState(null, "2026-09-01", "mensal", 10, "2026-10-11")).toBe("atrasado");
    expect(recurringCellState({ status: "valido" }, "2026-09-01", "mensal", 10, "2026-10-20")).toBe("aprovado");
    expect(recurringCellState({ status: "rejeitado" }, "2026-09-01", "mensal", 10, HOJE)).toBe("rejeitado");
  });

  it("período aceito: início válido, não futuro; o atual é aceito", () => {
    expect(isPeriodAllowed("2026-10-05", "semanal", HOJE)).toBe(true);
    expect(isPeriodAllowed("2026-10-12", "semanal", HOJE)).toBe(false);
    expect(isPeriodAllowed("2026-10-06", "semanal", HOJE)).toBe(false); // não é início de semana
    expect(isPeriodAllowed("2026-02-30", "mensal", HOJE)).toBe(false);
  });

  it("não cobra antes da admissão, de desligado nem antes do cadastro do tipo", () => {
    const tipoCriadoEm = "2026-09-15";
    expect(periodApplies("2026-08-01", "mensal", { dataAdmissao: "2026-09-01", tipoCriadoEm })).toBe(false);
    expect(periodApplies("2026-09-01", "mensal", { dataAdmissao: "2026-09-01", tipoCriadoEm })).toBe(true);
    expect(periodApplies("2026-09-01", "mensal", { status: "desligado", tipoCriadoEm })).toBe(false);
    expect(periodApplies("2026-07-01", "mensal", { tipoCriadoEm })).toBe(false);
    expect(periodApplies("2026-09-07", "semanal", { tipoCriadoEm })).toBe(true); // semana anterior à do cadastro
    expect(periodApplies("2026-08-31", "semanal", { tipoCriadoEm })).toBe(false);
  });

  it.each(["company_viewer", "company_manager", "platform_auditor"])("%s não cadastra documento recorrente", async (role) => {
    const caller = appRouter.createCaller(makeCtx({ role: role as any, companyId: role.startsWith("company") ? 1 : null }));
    await expect(caller.recurringDocs.create({ companyId: 1, nome: "Folha de ponto", alvo: "colaborador", periodicidade: "mensal", prazoDias: 10 })).rejects.toThrow(/não pode configurar/);
  });

  it("prazo fora de 0 a 90 dias é recusado", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "company_admin" as any, companyId: 1 }));
    await expect(caller.recurringDocs.create({ companyId: 1, nome: "Folha de ponto", alvo: "colaborador", periodicidade: "semanal", prazoDias: 120 })).rejects.toThrow(/0 a 90/);
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

// ─── H. Endereço com CEP ─────────────────────────────────────────────────────

import { addressForDb, addressInput, formatAddress, formatCep, isValidCep } from "@shared/address";
import { z } from "zod";

describe("Endereço com CEP", () => {
  it("máscara e validação do CEP", () => {
    expect(formatCep("01310100")).toBe("01310-100");
    expect(formatCep("01310-1009999")).toBe("01310-100");
    expect(isValidCep("01310-100")).toBe(true);
    expect(isValidCep("0131")).toBe(false);
  });

  it("servidor recusa CEP incompleto e UF fora da lista", () => {
    const schema = z.object(addressInput);
    expect(schema.safeParse({ cep: "0131" }).success).toBe(false);
    expect(schema.safeParse({ estado: "XX" }).success).toBe(false);
    expect(schema.safeParse({ cep: "", estado: "" }).success).toBe(true);
    expect(schema.safeParse({ cep: "01310100", estado: "sp" }).success).toBe(true);
  });

  it("normaliza para gravar e monta a linha de exibição", () => {
    const db = addressForDb({ cep: "01310100", endereco: " Av. Paulista ", numero: "1000", estado: "sp", bairro: "" });
    expect(db).toMatchObject({ cep: "01310-100", endereco: "Av. Paulista", numero: "1000", estado: "SP", bairro: null });
    expect(formatAddress({ ...db, cidade: "São Paulo", bairro: "Bela Vista" })).toBe("Av. Paulista, 1000 · Bela Vista · São Paulo/SP · CEP 01310-100");
  });

  it("local com CEP inválido é recusado antes de gravar", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "company_admin" as any, companyId: 1 }));
    await expect(caller.worksites.create({ companyId: 1, nome: "Obra X", cep: "123" })).rejects.toThrow(/CEP inválido/);
  });
});

// ─── I. Colaboradores em abas ────────────────────────────────────────────────

import { employeeSection } from "@shared/employeeSections";

describe("Colaboradores — seções", () => {
  it("desligado vai para Desligados mesmo com documentação pendente", () => {
    expect(employeeSection({ status: "desligado", liberacao: "aguardando_documentacao" })).toBe("desligados");
  });
  it("documentação pendente ou em análise fica Em efetivação, inclusive afastado", () => {
    expect(employeeSection({ status: "ativo", liberacao: "aguardando_documentacao" })).toBe("efetivacao");
    expect(employeeSection({ status: "afastado", liberacao: "em_analise" })).toBe("efetivacao");
  });
  it("liberado e sem requisitos ficam em Ativos, inclusive afastado", () => {
    expect(employeeSection({ status: "ativo", liberacao: "liberado" })).toBe("ativos");
    expect(employeeSection({ status: "afastado", liberacao: "sem_requisitos" })).toBe("ativos");
  });
  it("tamanho de página acima de 100 é recusado", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "company_admin" as any, companyId: 1 }));
    await expect(caller.employees.listPaged({ companyId: 1, secao: "ativos", pageSize: 500 })).rejects.toThrow();
  });
});

// ─── J. Parâmetros e sugestão de férias ──────────────────────────────────────

import { addMonthsDateOnly } from "@shared/dates";
import { suggestNextVacation, vacationPeriod } from "@shared/vacationSuggestion";

describe("Sugestão de férias", () => {
  const padrao = { feriasMesesAquisicao: 12, feriasMesesParaSolicitar: 1 };

  it("soma meses sem pular mês no fim do mês", () => {
    expect(addMonthsDateOnly("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsDateOnly("2027-12-15", 1)).toBe("2028-01-15");
    expect(addMonthsDateOnly("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("período padrão: adquire em 12 meses e solicita até 1 mês depois (1 ano e 1 mês)", () => {
    expect(vacationPeriod("2026-10-05", padrao, 0)).toEqual({ inicio: "2026-10-05", fim: "2027-10-04", aquisicao: "2027-10-05", limite: "2027-11-05" });
    expect(vacationPeriod("2026-10-05", padrao, 1).inicio).toBe("2027-10-05");
  });

  it("respeita os parâmetros da empresa", () => {
    expect(vacationPeriod("2026-01-10", { feriasMesesAquisicao: 6, feriasMesesParaSolicitar: 2 }, 0)).toMatchObject({ aquisicao: "2026-07-10", limite: "2026-09-10" });
  });

  it("situação: em aquisição, pode solicitar e prazo vencido", () => {
    const base = { dataAdmissao: "2025-09-01", params: padrao, programados: [] as string[] };
    expect(suggestNextVacation(base, "2026-08-31")?.situacao).toBe("em_aquisicao");
    expect(suggestNextVacation(base, "2026-09-15")?.situacao).toBe("a_solicitar");
    expect(suggestNextVacation(base, "2026-10-05")?.situacao).toBe("prazo_vencido");
  });

  it("período já programado passa para o próximo", () => {
    const r = suggestNextVacation({ dataAdmissao: "2025-09-01", params: padrao, programados: ["2025-09-01"] }, "2026-10-05");
    expect(r).toMatchObject({ numero: 2, inicio: "2026-09-01", situacao: "em_aquisicao" });
  });

  it("não sugere período vencido há mais de 30 dias nem calcula sem admissão", () => {
    expect(suggestNextVacation({ dataAdmissao: "2020-01-01", params: padrao, programados: [] }, "2026-10-05")?.inicio).toBe("2026-01-01");
    expect(suggestNextVacation({ dataAdmissao: null, params: padrao, programados: [] }, "2026-10-05")).toBeNull();
  });

  it("parâmetros fora da faixa e perfil sem permissão são recusados", async () => {
    const admin = appRouter.createCaller(makeCtx({ role: "company_admin" as any, companyId: 1 }));
    await expect(admin.companies.updateParameters({ companyId: 1, feriasMesesAquisicao: 30, feriasMesesParaSolicitar: 1 })).rejects.toThrow(/1 a 24/);
    const viewer = appRouter.createCaller(makeCtx({ role: "company_viewer" as any, companyId: 1 }));
    await expect(viewer.companies.updateParameters({ companyId: 1, feriasMesesAquisicao: 12, feriasMesesParaSolicitar: 1 })).rejects.toThrow(/não pode alterar/);
    const outra = appRouter.createCaller(makeCtx({ role: "company_admin" as any, companyId: 2 }));
    await expect(outra.companies.updateParameters({ companyId: 1, feriasMesesAquisicao: 12, feriasMesesParaSolicitar: 1 })).rejects.toThrow(/Acesso negado/);
  });
});
