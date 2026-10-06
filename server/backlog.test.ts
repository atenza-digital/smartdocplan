import { describe, expect, it } from "vitest";
import { requestClientInfo } from "./_core/clientInfo";
import { summarizeUserAgent } from "@shared/userAgent";

describe("Auditoria — IP e navegador", () => {
  it("limpa IPv6 mapeado e corta o user-agent", () => {
    const info = requestClientInfo({ ip: "::ffff:177.10.20.30", headers: { "user-agent": "x".repeat(400) } } as any);
    expect(info.ip).toBe("177.10.20.30");
    expect(info.userAgent).toHaveLength(300);
  });

  it("sem IP nem navegador fica vazio", () => {
    expect(requestClientInfo({ ip: undefined, headers: {} } as any)).toEqual({ ip: null, userAgent: null });
  });

  it("resume navegador e sistema", () => {
    expect(summarizeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36")).toBe("Chrome 141 · Windows");
    expect(summarizeUserAgent("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 Edg/141.0.1")).toBe("Edge 141 · Windows");
    expect(summarizeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari 18 · iOS");
    expect(summarizeUserAgent("Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0")).toBe("Firefox 131 · Android");
    expect(summarizeUserAgent(null)).toBeNull();
  });
});

// ─── Limite de tentativas ────────────────────────────────────────────────────

import { AttemptLimiter, LOGIN_RULES, blockedMessage, maskEmail } from "./_core/loginRateLimit";

describe("Limite de tentativas de login", () => {
  const relogio = () => {
    let agora = 1_000_000;
    return { now: () => agora, avancar: (ms: number) => { agora += ms; } };
  };

  it("5 erros do mesmo e-mail em 15 min bloqueiam por 15 min", () => {
    const r = relogio();
    const l = new AttemptLimiter(r.now);
    for (let i = 0; i < 4; i++) expect(l.registerFailure("email:a@b.com", LOGIN_RULES.email)).toBe(false);
    expect(l.registerFailure("email:a@b.com", LOGIN_RULES.email)).toBe(true);
    expect(l.blockedFor("email:a@b.com")).toBe(15 * 60 * 1000);
    r.avancar(14 * 60 * 1000);
    expect(l.blockedFor("email:a@b.com")).toBeGreaterThan(0);
    r.avancar(60 * 1000);
    expect(l.blockedFor("email:a@b.com")).toBe(0);
  });

  it("erros espaçados além da janela não bloqueiam", () => {
    const r = relogio();
    const l = new AttemptLimiter(r.now);
    for (let i = 0; i < 6; i++) {
      l.registerFailure("email:a@b.com", LOGIN_RULES.email);
      r.avancar(4 * 60 * 1000); // 1 erro a cada 4 min: nunca 5 dentro de 15 min
    }
    expect(l.blockedFor("email:a@b.com")).toBe(0);
  });

  it("login com sucesso zera a contagem", () => {
    const l = new AttemptLimiter(relogio().now);
    for (let i = 0; i < 4; i++) l.registerFailure("email:a@b.com", LOGIN_RULES.email);
    l.reset("email:a@b.com");
    expect(l.registerFailure("email:a@b.com", LOGIN_RULES.email)).toBe(false);
  });

  it("chaves separadas: o IP só bloqueia depois de 20 erros", () => {
    const l = new AttemptLimiter(relogio().now);
    for (let i = 0; i < 19; i++) l.registerFailure("ip:1.2.3.4", LOGIN_RULES.ip);
    expect(l.blockedFor("ip:1.2.3.4")).toBe(0);
    expect(l.registerFailure("ip:1.2.3.4", LOGIN_RULES.ip)).toBe(true);
    expect(l.blockedFor("email:x@y.com")).toBe(0);
  });

  it("mensagem e e-mail mascarado", () => {
    expect(blockedMessage(14 * 60 * 1000 + 1)).toBe("Muitas tentativas. Tente novamente em 15 minutos.");
    expect(blockedMessage(30 * 1000)).toBe("Muitas tentativas. Tente novamente em 1 minuto.");
    expect(maskEmail("joao@empresa.com")).toBe("jo***@empresa.com");
  });
});
