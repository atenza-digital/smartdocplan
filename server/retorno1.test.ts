import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { notificationSeverity } from "../shared/notificationSeverity";
import { platformTeamRecipients } from "../shared/permissions";
import { brazilToday } from "../shared/vacations";
import { periodInput } from "./bi";
import { presetRange } from "../client/src/components/bi/biFormat";
import { ROTAS_COM_AJUDA, getPageHelp } from "../client/src/lib/pageHelp";

describe("Sino: urgência dos avisos", () => {
  it("vermelho para rejeitado, vencido e atrasado", () => {
    expect(notificationSeverity("documento_rejeitado")).toBe("urgente");
    expect(notificationSeverity("company_update_request_rejected")).toBe("urgente");
    expect(notificationSeverity("doc_colaborador_12_2026-10-07_vencido")).toBe("urgente");
    expect(notificationSeverity("ferias_lim_3_2026-03-10_vencido")).toBe("urgente");
    expect(notificationSeverity("recorrente_atraso_1_4_2026-10-01")).toBe("urgente");
  });

  it("amarelo para o que vence em até 7 ou 30 dias", () => {
    expect(notificationSeverity("doc_empresa_5_2026-11-20_30")).toBe("atencao");
    expect(notificationSeverity("doc_colaborador_12_2026-11-10_7")).toBe("atencao");
  });

  it("neutro para o resto (inclusive data terminando em 07 ou 30)", () => {
    expect(notificationSeverity("geral")).toBe("info");
    expect(notificationSeverity("chamado_resposta")).toBe("info");
    expect(notificationSeverity("documento_aprovado")).toBe("info");
    expect(notificationSeverity("ferias_adq_3_2026-10-07")).toBe("info");
    expect(notificationSeverity(null)).toBe("info");
  });
});

describe("Avisos à equipe SmartDocPlan", () => {
  const usuarios = [
    { id: 1, role: "platform_admin" },
    { id: 2, role: "platform_analyst" },
    { id: 3, role: "platform_auditor" },
    { id: 4, role: "company_admin" },
    { id: 5, role: "company_hr" },
  ];

  it("avisa administrador e analista (não o auditor nem a empresa)", () => {
    expect(platformTeamRecipients(usuarios)).toEqual([1, 2]);
  });

  it("aviso de saúde vai só a quem vê dado de saúde (o analista fica de fora)", () => {
    expect(platformTeamRecipients(usuarios, true)).toEqual([1]);
  });
});

describe("E-mail do usuário", () => {
  const email = z.string().trim().toLowerCase().email();

  it("grava sem espaços e em minúsculas", () => {
    expect(email.parse("  Joao@Empresa.COM ")).toBe("joao@empresa.com");
  });

  it("recusa e-mail inválido", () => {
    expect(email.safeParse("joao@empresa").success).toBe(false);
    expect(email.safeParse("sem-arroba").success).toBe(false);
  });
});

describe("BI não passa de hoje", () => {
  const hoje = brazilToday();
  const diasDepois = (dias: number) => new Date(Date.parse(`${hoje}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
  const diasAntes = (dias: number) => diasDepois(-dias);

  it("corta o fim futuro em hoje", () => {
    const parsed = periodInput.parse({ inicio: diasAntes(10), fim: diasDepois(20), agrupamento: "dia" });
    expect(parsed.fim).toBe(hoje);
  });

  it("recusa início futuro", () => {
    expect(periodInput.safeParse({ inicio: diasDepois(1), fim: diasDepois(5), agrupamento: "dia" }).success).toBe(false);
  });

  it("mantém o fim passado e funciona junto de companyId", () => {
    const schema = z.object({ companyId: z.number() }).and(periodInput);
    const parsed = schema.parse({ companyId: 7, inicio: diasAntes(30), fim: diasAntes(5), agrupamento: "semana" });
    expect(parsed).toMatchObject({ companyId: 7, fim: diasAntes(5), agrupamento: "semana" });
  });

  it("atalhos do filtro terminam, no máximo, hoje", () => {
    const quarta = new Date(2026, 10, 4); // 04/11/2026
    expect(presetRange("mes", quarta)).toEqual({ inicio: "2026-11-01", fim: "2026-11-04" });
    expect(presetRange("semana", quarta)).toEqual({ inicio: "2026-11-02", fim: "2026-11-04" });
    expect(presetRange("ano", quarta)).toEqual({ inicio: "2026-01-01", fim: "2026-11-04" });
    expect(presetRange("12meses", quarta)).toEqual({ inicio: "2025-12-01", fim: "2026-11-04" });
  });

  it("no último dia do mês o fim é o próprio dia", () => {
    expect(presetRange("mes", new Date(2026, 9, 31))).toEqual({ inicio: "2026-10-01", fim: "2026-10-31" });
  });
});

describe("Ajuda das telas (botão ?)", () => {
  const app = readFileSync(resolve("client/src/App.tsx"), "utf8");
  const rotasDoApp = Array.from(app.matchAll(/<Route path="([^"]+)"/g))
    .map((match) => match[1])
    .filter((rota) => !["/", "/login", "/404"].includes(rota));

  it("toda rota autenticada de App.tsx tem ajuda", () => {
    const semAjuda = rotasDoApp.filter((rota) => !ROTAS_COM_AJUDA.includes(rota));
    expect(semAjuda).toEqual([]);
  });

  it("não há ajuda para rota que não existe mais", () => {
    expect(ROTAS_COM_AJUDA.filter((rota) => !rotasDoApp.includes(rota))).toEqual([]);
  });

  it("cada ajuda tem título, explicação e passo a passo", () => {
    for (const rota of ROTAS_COM_AJUDA) {
      const help = getPageHelp(rota.replace(/:[^/]+/g, "1"));
      expect(help, rota).not.toBeNull();
      expect(help!.titulo.length, rota).toBeGreaterThan(2);
      expect(help!.paraQueServe.length, rota).toBeGreaterThan(20);
      expect(help!.passos.length, rota).toBeGreaterThanOrEqual(3);
    }
  });

  it("Parâmetros da empresa tem uma ajuda por aba", () => {
    const abas = ["empresa", "cargos", "locais", "matriz", "mensais", "ferias"];
    const titulos = abas.map((aba) => getPageHelp("/empresa/parametros", `?aba=${aba}`)!.titulo);
    expect(new Set(titulos).size).toBe(abas.length);
    expect(getPageHelp("/empresa/parametros", "?aba=inexistente")!.titulo).toBe(titulos[0]);
  });

  it("rota desconhecida não tem ajuda", () => {
    expect(getPageHelp("/empresa/nao-existe")).toBeNull();
  });
});
