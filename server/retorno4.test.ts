import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { feriasEmDiaAteError, suggestNextVacation, vacationStatus } from "../shared/vacationSuggestion";
import { MIGRATIONS } from "./_core/postgresMigrations";

const params = { feriasMesesAquisicao: 12, feriasMesesParaSolicitar: 1 };
const HOJE = "2026-11-04";

describe("Férias de quem já é contratado", () => {
  it("sem 'férias em dia até': igual a antes (vencido há mais de 30 dias some)", () => {
    const r = vacationStatus({ dataAdmissao: "2020-01-01", params, programados: [] }, HOJE);
    expect(r.vencidos).toEqual([]);
    expect(r.proxima?.inicio).toBe("2026-01-01");
    expect(suggestNextVacation({ dataAdmissao: "2020-01-01", params, programados: [] }, HOJE)?.inicio).toBe("2026-01-01");
  });

  it("com 'férias em dia até': lista todos os vencidos depois da data", () => {
    const r = vacationStatus({ dataAdmissao: "2020-01-01", feriasEmDiaAte: "2022-12-31", params, programados: [] }, HOJE);
    expect(r.vencidos.map((p) => p.inicio)).toEqual(["2023-01-01", "2024-01-01", "2025-01-01"]);
    expect(r.vencidos.every((p) => p.situacao === "prazo_vencido")).toBe(true);
    expect(r.proxima?.inicio).toBe("2026-01-01");
  });

  it("períodos que terminam até a data contam como tirados; programados também saem", () => {
    const r = vacationStatus({ dataAdmissao: "2020-01-01", feriasEmDiaAte: "2023-12-31", params, programados: ["2024-01-01"] }, HOJE);
    expect(r.vencidos.map((p) => p.inicio)).toEqual(["2025-01-01"]);
    expect(r.proxima?.inicio).toBe("2026-01-01");
  });

  it("a sugestão do formulário começa pelo vencido mais antigo", () => {
    expect(suggestNextVacation({ dataAdmissao: "2020-01-01", feriasEmDiaAte: "2022-12-31", params, programados: [] }, HOJE)?.inicio).toBe("2023-01-01");
  });

  it("aceita Date vindo do banco e admissão vazia", () => {
    expect(vacationStatus({ dataAdmissao: "2020-01-01", feriasEmDiaAte: new Date("2025-12-31T00:00:00Z"), params, programados: [] }, HOJE).vencidos).toEqual([]);
    expect(vacationStatus({ dataAdmissao: null, feriasEmDiaAte: "2024-12-31", params, programados: [] }, HOJE)).toEqual({ vencidos: [], proxima: null });
  });

  it("validação: não antes da admissão nem no futuro; vazio é aceito", () => {
    expect(feriasEmDiaAteError("2019-12-31", "2020-01-01", HOJE)).toMatch(/anterior à admissão/);
    expect(feriasEmDiaAteError("2026-11-05", "2020-01-01", HOJE)).toMatch(/futura/);
    expect(feriasEmDiaAteError("2023-12-31", "2020-01-01", HOJE)).toBeNull();
    expect(feriasEmDiaAteError("", "2020-01-01", HOJE)).toBeNull();
  });
});

describe("Migration da Etapa 4", () => {
  it("registrada depois da 3b-2 e só adiciona a coluna", () => {
    expect(MIGRATIONS.indexOf("20261107_ferias_em_dia.sql")).toBeGreaterThan(MIGRATIONS.indexOf("20261106_pedidos_exclusao.sql"));
    const sql = readFileSync(resolve("drizzle/migrations", "20261107_ferias_em_dia.sql"), "utf8");
    const codigo = sql.split("\n").filter((linha) => !linha.trim().startsWith("--")).join("\n").toUpperCase();
    expect(codigo).not.toMatch(/DROP\s+(TABLE|COLUMN|INDEX)|DELETE\s+FROM|TRUNCATE|UPDATE\s/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "feriasEmDiaAte" date/);
  });
});
