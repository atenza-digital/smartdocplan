import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALL_ROLES,
  COMPANY_ROLES,
  PERMISSOES_PADRAO,
  canAccessHealthData,
  canCreateRequests,
  canCreateTickets,
  canManageCompanyData,
  canManageProfiles,
  canSeeCompanySettings,
  canSendHealthDocuments,
  normalizarPermissoes,
  permissoesPermitidas,
  podeVer,
  temPermissao,
} from "../shared/permissions";
import type { CompanyProfile } from "../drizzle/schema";
import { resolverPerfil } from "./companyProfiles";
import { MIGRATIONS } from "./_core/postgresMigrations";

// Regras fixas de antes da Etapa 5, escritas à mão: os padrões precisam reproduzi-las exatamente.
const ANTES = {
  manage: ["platform_admin", "platform_analyst", "company_admin", "company_hr"],
  requests: ["platform_admin", "company_admin", "company_hr"],
  tickets: ["platform_admin", "company_admin", "company_hr", "company_manager"],
  saude: ["platform_admin", "company_hr"],
  enviaSaude: ["platform_admin", "company_hr", "company_admin"],
  settings: ["platform_admin", "company_admin", "company_hr"],
};

describe("Permissões padrão = regras de antes", () => {
  it.each(ALL_ROLES)("%s mantém o que podia fazer", (role) => {
    const ator = COMPANY_ROLES.includes(role as never) ? { role, permissoes: PERMISSOES_PADRAO[role as (typeof COMPANY_ROLES)[number]] } : role;
    for (const a of [role, ator]) {
      expect(canManageCompanyData(a)).toBe(ANTES.manage.includes(role));
      expect(canManageCompanyData(a, "documentos_empresa.gerenciar")).toBe(ANTES.manage.includes(role));
      expect(canManageCompanyData(a, "parametros.gerenciar")).toBe(ANTES.manage.includes(role));
      expect(canManageCompanyData(a, "ferias.gerenciar")).toBe(ANTES.manage.includes(role));
      expect(canCreateRequests(a)).toBe(ANTES.requests.includes(role));
      expect(canCreateTickets(a)).toBe(ANTES.tickets.includes(role));
      expect(canAccessHealthData(a)).toBe(ANTES.saude.includes(role));
      expect(canSendHealthDocuments(a)).toBe(ANTES.enviaSaude.includes(role));
      expect(canSeeCompanySettings(a)).toBe(ANTES.settings.includes(role));
      expect(podeVer(a, "colaboradores.ver")).toBe(true);
      expect(podeVer(a, "bi.ver")).toBe(true);
    }
  });

  it("só o Admin da empresa e o Administrador Geral gerenciam perfis", () => {
    expect(ALL_ROLES.filter((r) => canManageProfiles(r))).toEqual(["platform_admin", "company_admin"]);
  });
});

describe("Permissões editadas", () => {
  it("o perfil editado manda: tirar 'abrir solicitações' do RH bloqueia", () => {
    const rh = { role: "company_hr", permissoes: PERMISSOES_PADRAO.company_hr.filter((p) => p !== "solicitacoes.criar") };
    expect(canCreateRequests(rh)).toBe(false);
    expect(canManageCompanyData(rh)).toBe(true);
  });

  it("perfil sem 'ver colaboradores' não vê a área; a equipe SmartDocPlan continua vendo", () => {
    expect(podeVer({ role: "company_viewer", permissoes: ["chamados.ver"] }, "colaboradores.ver")).toBe(false);
    expect(podeVer({ role: "platform_auditor", permissoes: [] }, "colaboradores.ver")).toBe(true);
  });

  it("trava de saúde: Gestor e Consulta nunca recebem; Admin e RH podem", () => {
    expect(permissoesPermitidas("company_manager").some((p) => p.startsWith("saude."))).toBe(false);
    expect(permissoesPermitidas("company_viewer").some((p) => p.startsWith("saude."))).toBe(false);
    expect(normalizarPermissoes("company_manager", ["saude.abrir", "colaboradores.ver"], false)).toEqual(["colaboradores.ver"]);
    expect(normalizarPermissoes("company_admin", ["saude.abrir"], false)).toContain("saude.abrir");
  });

  it("'gerenciar perfis' só na base Admin, e o perfil Admin padrão nunca perde", () => {
    expect(normalizarPermissoes("company_hr", ["perfis.gerenciar"], false)).toEqual([]);
    expect(normalizarPermissoes("company_admin", ["colaboradores.ver"], true)).toContain("perfis.gerenciar");
    expect(normalizarPermissoes("company_admin", ["colaboradores.ver"], false)).not.toContain("perfis.gerenciar");
  });

  it("chave desconhecida é descartada", () => {
    expect(normalizarPermissoes("company_viewer", ["colaboradores.ver", "inventada.tudo"], false)).toEqual(["colaboradores.ver"]);
    expect(temPermissao({ role: "company_viewer", permissoes: ["inventada.tudo"] }, "colaboradores.ver")).toBe(false);
  });
});

const perfil = (p: Partial<CompanyProfile>): CompanyProfile => ({
  id: 1, companyId: 7, nome: "Perfil", baseRole: "company_viewer", permissoes: [], padrao: false, ativo: true,
  criadoPor: null, createdAt: new Date(), updatedAt: new Date(), ...p,
});

describe("Resolução do perfil do usuário", () => {
  const usuario = { role: "company_manager", companyId: 7, profileId: null as number | null };

  it("sem nada salvo: permissões padrão do papel", () => {
    expect(resolverPerfil(usuario, [])).toEqual({ permissoes: [...PERMISSOES_PADRAO.company_manager], perfilNome: "Gestor" });
  });

  it("perfil padrão editado da empresa vale para todos daquele papel", () => {
    const r = resolverPerfil(usuario, [perfil({ id: 3, baseRole: "company_manager", padrao: true, permissoes: ["chamados.ver"] })]);
    expect(r).toEqual({ permissoes: ["chamados.ver"], perfilNome: "Gestor" });
  });

  it("perfil personalizado tem prioridade; inativo ou de outra empresa é ignorado", () => {
    const perfis = [
      perfil({ id: 3, baseRole: "company_manager", padrao: true, permissoes: ["chamados.ver"] }),
      perfil({ id: 9, nome: "Encarregado de obra", baseRole: "company_manager", permissoes: ["colaboradores.ver", "chamados.abrir"] }),
    ];
    expect(resolverPerfil({ ...usuario, profileId: 9 }, perfis)?.perfilNome).toBe("Encarregado de obra");
    expect(resolverPerfil({ ...usuario, profileId: 9 }, perfis.map((p) => (p.id === 9 ? { ...p, ativo: false } : p)))?.perfilNome).toBe("Gestor");
    expect(resolverPerfil({ ...usuario, profileId: 9 }, perfis.map((p) => (p.id === 9 ? { ...p, companyId: 8 } : p)))?.perfilNome).toBe("Gestor");
  });

  it("trava de saúde vale também na leitura (dado gravado fora da regra)", () => {
    const r = resolverPerfil({ ...usuario, profileId: 9 }, [perfil({ id: 9, baseRole: "company_manager", permissoes: ["saude.abrir", "chamados.ver"] })]);
    expect(r?.permissoes).toEqual(["chamados.ver"]);
  });

  it("equipe SmartDocPlan não tem perfil editável", () => {
    expect(resolverPerfil({ role: "platform_analyst", companyId: null, profileId: null }, [])).toBeNull();
  });
});

describe("Migration dos perfis", () => {
  it("está no fim da lista e só cria/adiciona", () => {
    expect(MIGRATIONS.at(-1)).toBe("20261108_perfis_empresa.sql");
    const sql = readFileSync(resolve(__dirname, "../drizzle/migrations/20261108_perfis_empresa.sql"), "utf8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS smartdocplan\.company_profiles/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "profileId"/);
    expect(sql).not.toMatch(/^(?!--).*\bDROP\b/m); // DROP só no comentário de reversão
  });
});
