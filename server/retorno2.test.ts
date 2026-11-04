import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COMPANY_FIELD_LABELS, describeCompanyChanges } from "../shared/companyChanges";
import { MIGRATIONS } from "./_core/postgresMigrations";

describe("Alteração cadastral: o que muda", () => {
  const atual = { razaoSocial: "Empresa Teste Ltda", telefone: null, cidade: "São Paulo", cep: "01310-100" };

  it("lista só os campos que mudam, com antes e depois", () => {
    const linhas = describeCompanyChanges(atual, { razaoSocial: "Empresa Teste Ltda", telefone: "(11) 3000-1234", cidade: "Santos" });
    expect(linhas).toEqual(["Telefone: (vazio) → (11) 3000-1234", "Cidade: São Paulo → Santos"]);
  });

  it("campo igual ou ausente no pedido não entra", () => {
    expect(describeCompanyChanges(atual, { razaoSocial: "Empresa Teste Ltda" })).toEqual([]);
    expect(describeCompanyChanges(atual, {})).toEqual([]);
  });

  it("vazio e nulo contam como a mesma coisa; limpar um campo aparece como (vazio)", () => {
    expect(describeCompanyChanges({ telefone: "" }, { telefone: null })).toEqual([]);
    expect(describeCompanyChanges({ cep: "01310-100" }, { cep: "" })).toEqual(["CEP: 01310-100 → (vazio)"]);
  });

  it("todo campo editável tem rótulo em português", () => {
    for (const rotulo of Object.values(COMPANY_FIELD_LABELS)) expect(rotulo.length).toBeGreaterThan(1);
  });
});

describe("Migrations da Etapa 2", () => {
  const sql = (nome: string) => readFileSync(resolve("drizzle/migrations", nome), "utf8");

  it("estão registradas, na ordem, depois das anteriores", () => {
    const novas = ["20261009_requisito_legal_opcional.sql", "20261009_processo_outros.sql", "20261009_senha_inicial.sql"];
    const indices = novas.map((nome) => MIGRATIONS.indexOf(nome));
    expect(indices.every((i) => i >= 0)).toBe(true);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
    expect(indices[0]).toBeGreaterThan(MIGRATIONS.indexOf("20261008_session_revocations.sql"));
  });

  it("só afrouxam regra ou adicionam (nenhuma apaga dado)", () => {
    for (const nome of ["20261009_requisito_legal_opcional.sql", "20261009_processo_outros.sql", "20261009_senha_inicial.sql"]) {
      const codigo = sql(nome).split("\n").filter((linha) => !linha.trim().startsWith("--")).join("\n").toUpperCase();
      expect(codigo, nome).not.toMatch(/DROP\s+(TABLE|COLUMN)|DELETE\s+FROM|TRUNCATE/);
    }
    expect(sql("20261009_requisito_legal_opcional.sql")).toMatch(/DROP NOT NULL/);
    expect(sql("20261009_processo_outros.sql")).toMatch(/ADD VALUE IF NOT EXISTS 'outros'/);
    expect(sql("20261009_senha_inicial.sql")).toMatch(/ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean NOT NULL DEFAULT false/);
  });
});
