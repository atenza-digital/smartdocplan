import { and, eq, inArray } from "drizzle-orm";
import { companyProfiles, users, type CompanyProfile, type User } from "../drizzle/schema";
import {
  PERFIL_BASE_LABEL,
  PERMISSOES_PADRAO,
  isCompanyUser,
  normalizarPermissoes,
  type CompanyRole,
  type Permissao,
} from "@shared/permissions";
import { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Usuário da sessão com as permissões efetivas (null para a equipe SmartDocPlan, cujos perfis são fixos). */
export type SessionUser = User & { permissoes: Permissao[] | null; perfilNome: string | null };

type Resolvido = { permissoes: Permissao[]; perfilNome: string };

/**
 * Permissões efetivas de um usuário da empresa, nesta ordem:
 * perfil personalizado ativo (users.profileId) → perfil padrão editado da empresa → permissões padrão do papel.
 */
export function resolverPerfil(
  user: Pick<User, "role" | "companyId" | "profileId">,
  perfisDaEmpresa: CompanyProfile[],
): Resolvido | null {
  if (!isCompanyUser(user.role)) return null;
  const role = user.role as CompanyRole;
  const ativos = perfisDaEmpresa.filter((p) => p.ativo && p.companyId === user.companyId);
  const personalizado = user.profileId ? ativos.find((p) => p.id === user.profileId && !p.padrao && p.baseRole === role) : undefined;
  if (personalizado) {
    return { permissoes: normalizarPermissoes(role, personalizado.permissoes, false), perfilNome: personalizado.nome };
  }
  const padraoEditado = ativos.find((p) => p.padrao && p.baseRole === role);
  if (padraoEditado) {
    return { permissoes: normalizarPermissoes(role, padraoEditado.permissoes, true), perfilNome: PERFIL_BASE_LABEL[role] };
  }
  return { permissoes: [...PERMISSOES_PADRAO[role]], perfilNome: PERFIL_BASE_LABEL[role] };
}

// Cache curto por empresa: evita uma consulta extra a cada requisição; limpo ao salvar perfis.
const CACHE_MS = 30_000;
const cache = new Map<number, { quando: number; perfis: CompanyProfile[] }>();

export function limparCachePerfis(companyId?: number) {
  if (companyId === undefined) cache.clear();
  else cache.delete(companyId);
}

export async function perfisDaEmpresa(db: Db, companyId: number): Promise<CompanyProfile[]> {
  const hit = cache.get(companyId);
  if (hit && Date.now() - hit.quando < CACHE_MS) return hit.perfis;
  const perfis = await db.select().from(companyProfiles).where(eq(companyProfiles.companyId, companyId));
  cache.set(companyId, { quando: Date.now(), perfis });
  return perfis;
}

/** Anexa as permissões efetivas ao usuário da sessão. Se o banco falhar, cai nas permissões padrão do papel. */
export async function comPermissoes(user: User): Promise<SessionUser> {
  if (!isCompanyUser(user.role) || !user.companyId) return { ...user, permissoes: null, perfilNome: null };
  let perfis: CompanyProfile[] = [];
  try {
    const db = await getDb();
    if (db) perfis = await perfisDaEmpresa(db, user.companyId);
  } catch {
    perfis = [];
  }
  const r = resolverPerfil(user, perfis);
  return { ...user, permissoes: r?.permissoes ?? null, perfilNome: r?.perfilNome ?? null };
}

/** Permissões e nome do perfil devolvidos ao navegador (login e /api/auth/me). */
export async function perfilPublico(user: User) {
  const s = await comPermissoes(user);
  return { permissoes: s.permissoes, perfilNome: s.perfilNome };
}

/**
 * Usuários ativos da empresa que atendem ao filtro de permissão (destinatários de avisos à empresa).
 * O filtro recebe o ator { role, permissoes } já resolvido.
 */
export async function usuariosDaEmpresaCom(
  db: Db,
  companyId: number,
  filtro: (ator: { role: string; permissoes: readonly string[] }) => boolean,
): Promise<number[]> {
  const rows = await db
    .select({ id: users.id, role: users.role, companyId: users.companyId, profileId: users.profileId })
    .from(users)
    .where(and(eq(users.companyId, companyId), eq(users.ativo, true), inArray(users.role, ["company_admin", "company_hr", "company_manager", "company_viewer"])));
  if (!rows.length) return [];
  const perfis = await perfisDaEmpresa(db, companyId);
  return rows
    .filter((row) => {
      const r = resolverPerfil(row, perfis);
      return !!r && filtro({ role: row.role, permissoes: r.permissoes });
    })
    .map((row) => row.id);
}
