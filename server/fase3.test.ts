import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { campaignThemeColors, campaignVisibleTo, contrastRatio, isSafeCampaignLink } from "@shared/campaigns";

function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  const base = {
    id: 1, openId: "test-user", name: "Test User", email: "test@example.com", loginMethod: "local",
    role: "platform_admin" as const, companyId: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return {
    user: { ...base, ...overrides } as any,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

const campanha = { titulo: "Outubro Rosa", mensagem: "Prevenção do câncer de mama.", cor: "#ec4899", mes: 10, publico: "todos" as const, ativo: true };

describe("Calendário da saúde", () => {
  it("só aceita link https", () => {
    expect(isSafeCampaignLink("https://www.gov.br/saude")).toBe(true);
    expect(isSafeCampaignLink("http://www.gov.br/saude")).toBe(false);
    expect(isSafeCampaignLink("javascript:alert(1)")).toBe(false);
    expect(isSafeCampaignLink("www.gov.br")).toBe(false);
  });

  it("público da campanha", () => {
    expect(campaignVisibleTo("todos", false)).toBe(true);
    expect(campaignVisibleTo("empresas", true)).toBe(false);
    expect(campaignVisibleTo("empresas", false)).toBe(true);
    expect(campaignVisibleTo("plataforma", false)).toBe(false);
  });

  it("cor aplicada à plataforma mantém contraste mínimo de 3:1 nos dois temas", () => {
    for (const cor of ["#94a3b8", "#eab308", "#ca8a04", "#ec4899", "#2563eb", "#ffffff", "#000000"]) {
      const claro = campaignThemeColors(cor, "claro");
      const escuro = campaignThemeColors(cor, "escuro");
      expect(contrastRatio(claro.primary, "#ffffff")).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(escuro.primary, "#0f172a")).toBeGreaterThanOrEqual(3);
      // Texto sobre o botão também legível.
      expect(contrastRatio(claro.primary, claro.primaryForeground)).toBeGreaterThanOrEqual(3);
    }
  });

  it("cor já com bom contraste não é alterada", () => {
    expect(campaignThemeColors("#2563eb", "claro").primary).toBe("#2563eb");
  });

  it.each(["platform_analyst", "platform_auditor", "company_admin"])("%s não gerencia campanhas", async (role) => {
    const caller = appRouter.createCaller(makeCtx({ role: role as any, companyId: role.startsWith("company") ? 1 : null }));
    await expect(caller.healthCampaigns.save(campanha)).rejects.toThrow(/Administrador Geral/);
  });

  it("link inválido é recusado", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.healthCampaigns.save({ ...campanha, link: "http://exemplo.com" })).rejects.toThrow(/https/);
  });

  it("empresa não lista campanhas", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "company_admin" as any, companyId: 1 }));
    await expect(caller.healthCampaigns.list()).rejects.toThrow(/Acesso negado/);
  });
});
