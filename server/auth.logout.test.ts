import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(protocol: "http" | "https" = "https"): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "local",
    role: "platform_admin",
    companyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol,
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success for https", async () => {
    const { ctx, clearedCookies } = createAuthContext("https");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(3);
    expect(clearedCookies.every((entry) => entry.name === COOKIE_NAME)).toBe(true);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: 0,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });

  it("clears the session cookie without secure flag for http", async () => {
    const { ctx, clearedCookies } = createAuthContext("http");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(3);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: 0,
      secure: false,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
  });
});

describe("auth.me", () => {
  it("não devolve o hash da senha", async () => {
    const { ctx } = createAuthContext();
    ctx.user = { ...ctx.user!, passwordHash: "$2a$12$hashficticio" } as AuthenticatedUser;
    const result = await appRouter.createCaller(ctx).auth.me();
    expect(result).toMatchObject({ id: 1, email: "sample@example.com", role: "platform_admin" });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("devolve null sem sessão", async () => {
    const { ctx } = createAuthContext();
    ctx.user = null;
    expect(await appRouter.createCaller(ctx).auth.me()).toBeNull();
  });

  it("acesso negado responde FORBIDDEN (403), não erro interno", async () => {
    const { ctx } = createAuthContext();
    ctx.user = { ...ctx.user!, role: "company_viewer", companyId: 1 };
    await expect(
      appRouter.createCaller(ctx).employeeDocs.delete({ id: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
