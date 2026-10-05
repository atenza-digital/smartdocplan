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
