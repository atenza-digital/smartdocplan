import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("deve limpar o cookie de sessão e retornar success: true", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      ...makeCtx(),
      res: {
        clearCookie: (name: string) => clearedCookies.push(name),
      } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies.length).toBeGreaterThan(0);
  });

  it("deve retornar o usuário autenticado em auth.me", async () => {
    const caller = appRouter.createCaller(makeCtx({ name: "João Silva" }));
    const me = await caller.auth.me();
    expect(me?.name).toBe("João Silva");
  });
});

// ─── Role-based Access Tests ──────────────────────────────────────────────────

describe("controle de acesso por papel (role)", () => {
  it("platform_admin deve ter acesso ao dashboard global (sem DB retorna null)", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "platform_admin" }));
    // Sem banco de dados, retorna null — mas não deve lançar erro de autorização
    const result = await caller.dashboard.global();
    // null é o retorno esperado quando não há DB
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("company_admin não deve ter acesso ao dashboard global (adminProcedure)", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ role: "company_admin" as any, companyId: 1 })
    );
    await expect(caller.dashboard.global()).rejects.toThrow();
  });

  it("platform_admin deve conseguir listar empresas (sem DB retorna [])", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "platform_admin" }));
    const result = await caller.companies.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("company_hr não deve conseguir criar empresas (adminProcedure)", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ role: "company_hr" as any, companyId: 1 })
    );
    await expect(
      caller.companies.create({
        razaoSocial: "Empresa Teste",
        status: "ativo",
      })
    ).rejects.toThrow();
  });

  it("usuário sem autenticação deve receber null em auth.me", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toBeNull();
  });
});

// ─── Requests Router Tests ────────────────────────────────────────────────────

describe("requests router", () => {
  it("platform_admin com companyId=0 deve retornar array (sem DB retorna [])", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "platform_admin" }));
    const result = await caller.requests.list({ companyId: 0 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("company_hr com companyId=0 deve retornar [] (sem permissão)", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ role: "company_hr" as any, companyId: 1 })
    );
    const result = await caller.requests.list({ companyId: 0 });
    expect(result).toEqual([]);
  });

  it("globalStats deve ser acessível apenas para platform_admin", async () => {
    const adminCaller = appRouter.createCaller(makeCtx({ role: "platform_admin" }));
    const result = await adminCaller.requests.globalStats();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("novas");
    expect(result).toHaveProperty("concluidas");
  });

  it("company_viewer não deve acessar globalStats", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ role: "company_viewer" as any, companyId: 1 })
    );
    await expect(caller.requests.globalStats()).rejects.toThrow();
  });
});

// ─── Tickets Router Tests ─────────────────────────────────────────────────────

describe("tickets router", () => {
  it("tickets.stats deve retornar objeto com contadores", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "platform_admin" }));
    const stats = await caller.tickets.stats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("abertos");
    expect(stats).toHaveProperty("emAtendimento");
    expect(stats).toHaveProperty("resolvidos");
  });
});

// ─── Users Router Tests ───────────────────────────────────────────────────────

describe("users router", () => {
  it("users.list deve ser acessível para platform_admin", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "platform_admin" }));
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("company_admin não deve acessar users.list (adminProcedure)", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ role: "company_admin" as any, companyId: 1 })
    );
    await expect(caller.users.list()).rejects.toThrow();
  });
});
