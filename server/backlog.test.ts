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
