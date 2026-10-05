import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { validateDocumentFile } from "./uploadFiles";

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

// ─── Dossiê: documentos do colaborador ───────────────────────────────────────

describe("Dossiê — documentos do colaborador", () => {
  it.each(["company_manager", "company_viewer", "platform_auditor"])(
    "%s não pode editar documento",
    async (role) => {
      const caller = appRouter.createCaller(makeCtx({ role: role as any, companyId: 1 }));
      await expect(caller.employeeDocs.update({ id: 1, nome: "Novo nome" })).rejects.toThrow(/não pode alterar/);
    }
  );

  it.each(["company_manager", "company_viewer", "platform_auditor"])(
    "%s não pode excluir documento",
    async (role) => {
      const caller = appRouter.createCaller(makeCtx({ role: role as any, companyId: 1 }));
      await expect(caller.employeeDocs.delete({ id: 1 })).rejects.toThrow(/não pode excluir/);
    }
  );

  it("company_viewer não pode enviar documento", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "company_viewer" as any, companyId: 1 }));
    await expect(
      caller.employeeDocs.create({ employeeId: 1, companyId: 1, categoria: "pessoal", nome: "RG", fileBase64: PDF_BASE64 })
    ).rejects.toThrow(/não pode enviar/);
  });

  it("aceita PDF válido", () => {
    expect(validateDocumentFile(PDF_BASE64).ext).toBe("pdf");
  });

  it("recusa arquivo que não é PDF, PNG ou JPEG", () => {
    const texto = Buffer.from("texto qualquer").toString("base64");
    expect(() => validateDocumentFile(texto)).toThrow(/PDF, PNG ou JPEG/);
  });

  it("recusa arquivo acima de 10 MB", () => {
    const grande = Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(10 * 1024 * 1024)]).toString("base64");
    expect(() => validateDocumentFile(grande)).toThrow(/10 MB/);
  });
});
