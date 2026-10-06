/**
 * Encerramento de sessões antes de expirar. O token (JWT) vale por até 1 ano; sem isto, o logout só apagava o cookie.
 * - Logout: grava o hash do token, que passa a ser recusado.
 * - Troca de senha: grava um corte por usuário; tokens emitidos antes dele deixam de valer.
 */
import { createHash } from "node:crypto";
import { and, eq, isNotNull, lt, or } from "drizzle-orm";
import { sessionRevocations } from "../../drizzle/schema";
import { ONE_YEAR_MS } from "@shared/const";
import { getDb } from "../db";

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type RevocationRow = { tokenHash: string | null; revokedBefore: Date | null };

/** Decide se o token foi encerrado. `issuedAt` em segundos (tokens antigos sem `iat` contam como 0). */
export function isTokenRevoked(rows: RevocationRow[], tokenHash: string, issuedAt: number) {
  return rows.some(
    (row) =>
      row.tokenHash === tokenHash ||
      (row.revokedBefore !== null && row.revokedBefore.getTime() > issuedAt * 1000)
  );
}

export async function isSessionRevoked(token: string, userId: number, issuedAt: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const tokenHash = hashSessionToken(token);
  const rows = await db
    .select({ tokenHash: sessionRevocations.tokenHash, revokedBefore: sessionRevocations.revokedBefore })
    .from(sessionRevocations)
    .where(
      or(
        eq(sessionRevocations.tokenHash, tokenHash),
        and(eq(sessionRevocations.userId, userId), isNotNull(sessionRevocations.revokedBefore))
      )
    );
  return isTokenRevoked(rows, tokenHash, issuedAt);
}

/** Logout: o token deixa de valer até a data em que expiraria. */
export async function revokeSessionToken(token: string, userId: number, expiresAtSeconds?: number) {
  const db = await getDb();
  if (!db) return;
  const expiresAt = new Date(expiresAtSeconds ? expiresAtSeconds * 1000 : Date.now() + ONE_YEAR_MS);
  await db
    .insert(sessionRevocations)
    .values({ tokenHash: hashSessionToken(token), userId, expiresAt })
    .onConflictDoNothing();
}

/**
 * Encerra todas as sessões do usuário emitidas antes de agora (arredondado ao segundo, a precisão do `iat`).
 * Devolve o instante do corte; um token novo emitido em seguida continua válido.
 */
export async function revokeUserSessionsBefore(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const corte = new Date(Math.floor(Date.now() / 1000) * 1000);
  await db.insert(sessionRevocations).values({ userId, revokedBefore: corte, expiresAt: new Date(corte.getTime() + ONE_YEAR_MS) });
  return corte;
}

/** Limpeza: registros cujos tokens já expirariam de qualquer forma. */
export async function cleanupSessionRevocations() {
  const db = await getDb();
  if (!db) return;
  await db.delete(sessionRevocations).where(lt(sessionRevocations.expiresAt, new Date()));
}
