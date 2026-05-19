import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  canCreateRequests,
  canCreateTickets,
  canManageCompanyData,
  canManagePlatformSettings,
  canManageRequestWorkflow,
  canSeeCompanySettings,
} from "@shared/permissions";

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

  it("company_viewer não deve abrir solicitações", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ role: "company_viewer" as any, companyId: 1 })
    );
    await expect(
      caller.requests.create({
        companyId: 1,
        tipo: "admissao",
        titulo: "Admissao - Joao",
        prioridade: "media",
      })
    ).rejects.toThrow("Seu perfil não pode abrir solicitações.");
  });

  it("company_hr pode iniciar abertura de solicitação para a própria empresa", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ role: "company_hr" as any, companyId: 1 })
    );
    await expect(
      caller.requests.create({
        companyId: 1,
        tipo: "admissao",
        titulo: "Admissao - Joao",
        prioridade: "media",
      })
    ).rejects.toThrow("DB unavailable");
  });

  it("platform_admin pode abrir solicitação para qualquer empresa informada", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ role: "platform_admin" as any, companyId: null })
    );
    await expect(
      caller.requests.create({
        companyId: 1,
        tipo: "admissao",
        titulo: "Admissão - João",
        prioridade: "media",
      })
    ).rejects.toThrow("DB unavailable");
  });
});

describe("matriz de permissões compartilhada", () => {
  it("deve permitir abertura de solicitações apenas para company_admin e company_hr", () => {
    expect(canCreateRequests("platform_admin")).toBe(true);
    expect(canCreateRequests("company_admin")).toBe(true);
    expect(canCreateRequests("company_hr")).toBe(true);
    expect(canCreateRequests("company_manager")).toBe(false);
    expect(canCreateRequests("company_viewer")).toBe(false);
  });

  it("deve permitir tramitação apenas para platform_admin e platform_analyst", () => {
    expect(canManageRequestWorkflow("platform_admin")).toBe(true);
    expect(canManageRequestWorkflow("platform_analyst")).toBe(true);
    expect(canManageRequestWorkflow("platform_auditor")).toBe(false);
    expect(canManageRequestWorkflow("company_hr")).toBe(false);
  });

  it("deve permitir abertura de chamados para company_admin, company_hr e company_manager", () => {
    expect(canCreateTickets("platform_admin")).toBe(true);
    expect(canCreateTickets("company_admin")).toBe(true);
    expect(canCreateTickets("company_hr")).toBe(true);
    expect(canCreateTickets("company_manager")).toBe(true);
    expect(canCreateTickets("company_viewer")).toBe(false);
  });

  it("deve permitir gestão de dados da empresa apenas para perfis operacionais", () => {
    expect(canManageCompanyData("platform_admin")).toBe(true);
    expect(canManageCompanyData("platform_analyst")).toBe(true);
    expect(canManageCompanyData("company_admin")).toBe(true);
    expect(canManageCompanyData("company_hr")).toBe(true);
    expect(canManageCompanyData("company_manager")).toBe(false);
    expect(canManageCompanyData("company_viewer")).toBe(false);
  });

  it("deve restringir configurações administrativas ao platform_admin", () => {
    expect(canManagePlatformSettings("platform_admin")).toBe(true);
    expect(canManagePlatformSettings("platform_analyst")).toBe(false);
    expect(canManagePlatformSettings("platform_auditor")).toBe(false);
    expect(canManagePlatformSettings("company_admin")).toBe(false);
  });

  it("deve expor configurações da empresa apenas para company_admin e company_hr", () => {
    expect(canSeeCompanySettings("company_admin")).toBe(true);
    expect(canSeeCompanySettings("company_hr")).toBe(true);
    expect(canSeeCompanySettings("company_manager")).toBe(false);
    expect(canSeeCompanySettings("company_viewer")).toBe(false);
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

  it("company_manager pode abrir chamado para a própria empresa", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ role: "company_manager" as any, companyId: 1 })
    );
    await expect(
      caller.tickets.create({
        companyId: 1,
        tipo: "duvida",
        titulo: "Preciso de ajuda",
        prioridade: "media",
      })
    ).rejects.toThrow("DB unavailable");
  });

  it("company_viewer não deve abrir chamados", async () => {
    const caller = appRouter.createCaller(
      makeCtx({ role: "company_viewer" as any, companyId: 1 })
    );
    await expect(
      caller.tickets.create({
        companyId: 1,
        tipo: "duvida",
        titulo: "Nao deveria abrir",
        prioridade: "media",
      })
    ).rejects.toThrow("Seu perfil não pode abrir chamados.");
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
