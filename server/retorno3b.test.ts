import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { companyDocumentKey, latestCompanyDocuments, splitCompanyDocuments } from "../shared/companyDocuments";
import { recurringCellState } from "../shared/recurring";
import { MIGRATIONS } from "./_core/postgresMigrations";

const doc = (id: number, status: string, dia: number, extra: Record<string, unknown> = {}) => ({
  id,
  tipo: "pgr",
  status,
  createdAt: `2026-10-${String(dia).padStart(2, "0")}T10:00:00Z`,
  recurringTypeId: null as number | null,
  competencia: null as string | null,
  ...extra,
});

describe("Documentos da empresa: versão em vigor", () => {
  it("vale o envio aprovado mais recente; o mais novo em validação fica como nova versão", () => {
    const grupo = splitCompanyDocuments([doc(1, "valido", 1), doc(2, "valido", 2), doc(3, "aguardando_validacao", 3)]).get("pgr")!;
    expect(grupo.emVigor?.id).toBe(2);
    expect(grupo.novaVersao?.id).toBe(3);
    expect(grupo.historico.map((d) => d.id)).toEqual([1]);
  });

  it("nova versão rejeitada não derruba a aprovada", () => {
    const grupo = splitCompanyDocuments([doc(1, "valido", 1), doc(2, "rejeitado", 2)]).get("pgr")!;
    expect(grupo.emVigor?.id).toBe(1);
    expect(grupo.novaVersao?.status).toBe("rejeitado");
  });

  it("rejeição mais antiga que a versão aprovada vai para o histórico", () => {
    const grupo = splitCompanyDocuments([doc(1, "rejeitado", 1), doc(2, "valido", 2)]).get("pgr")!;
    expect(grupo.emVigor?.id).toBe(2);
    expect(grupo.novaVersao).toBeNull();
    expect(grupo.historico.map((d) => d.id)).toEqual([1]);
  });

  it("sem aprovado: o envio mais novo aparece como nova versão e nada vale", () => {
    const grupo = splitCompanyDocuments([doc(1, "aguardando_validacao", 1)]).get("pgr")!;
    expect(grupo.emVigor).toBeNull();
    expect(grupo.novaVersao?.id).toBe(1);
    expect(latestCompanyDocuments([doc(1, "aguardando_validacao", 1)]).size).toBe(0);
  });

  it("excluído sai; documentos antigos sem situação contam como aprovados", () => {
    const grupo = splitCompanyDocuments([doc(1, "valido", 1), doc(2, "excluido", 2)]).get("pgr")!;
    expect(grupo.emVigor?.id).toBe(1);
    expect(grupo.historico).toHaveLength(0);
    const antigos = [{ id: 9, tipo: "PGR", createdAt: new Date(2025, 0, 1) }];
    expect(latestCompanyDocuments(antigos).get("pgr")?.id).toBe(9);
  });

  it("recorrente: agrupa por tipo e período", () => {
    const a = doc(1, "valido", 1, { tipo: "mensal", recurringTypeId: 7, competencia: "2026-09-01" });
    const b = doc(2, "valido", 2, { tipo: "mensal", recurringTypeId: 7, competencia: "2026-10-01" });
    const versoes = splitCompanyDocuments([a, b]);
    expect(versoes.get(companyDocumentKey(a))?.emVigor?.id).toBe(1);
    expect(versoes.get(companyDocumentKey(b))?.emVigor?.id).toBe(2);
    expect(latestCompanyDocuments([a, b]).size).toBe(0);
  });
});

describe("Recorrentes: situação do período", () => {
  it("em validação, rejeitado e aprovado vêm da situação do envio", () => {
    expect(recurringCellState({ status: "aguardando_validacao" }, "2026-09-01", "mensal", 10, "2026-11-04")).toBe("aguardando_validacao");
    expect(recurringCellState({ status: "rejeitado" }, "2026-09-01", "mensal", 10, "2026-11-04")).toBe("rejeitado");
    expect(recurringCellState({ status: "valido" }, "2026-09-01", "mensal", 10, "2026-11-04")).toBe("aprovado");
    expect(recurringCellState(null, "2026-09-01", "mensal", 10, "2026-11-04")).toBe("atrasado");
  });
});

describe("Migration da Etapa 3b-1", () => {
  it("registrada depois da 3a, só adiciona colunas e índice, com padrões que mantêm os dados atuais", () => {
    expect(MIGRATIONS.indexOf("20261105_validacao_documentos_empresa.sql")).toBeGreaterThan(MIGRATIONS.indexOf("20261104_documento_versoes.sql"));
    const sql = readFileSync(resolve("drizzle/migrations", "20261105_validacao_documentos_empresa.sql"), "utf8");
    const codigo = sql.split("\n").filter((linha) => !linha.trim().startsWith("--")).join("\n").toUpperCase();
    expect(codigo).not.toMatch(/DROP\s+(TABLE|COLUMN|INDEX)|DELETE\s+FROM|TRUNCATE|UPDATE\s/);
    expect(sql).toMatch(/company_documents ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'valido'/);
    expect(sql).toMatch(/"exigeValidacao" boolean NOT NULL DEFAULT true/);
  });
});
