import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Funções de compatibilidade com OAuth (mantidas para não quebrar o sdk.ts) ─

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId ?? undefined,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? "local",
      lastSignedIn: user.lastSignedIn ?? new Date(),
    };
    const updateSet: Record<string, unknown> = {
      lastSignedIn: values.lastSignedIn,
    };

    if (user.name !== undefined) updateSet.name = user.name ?? null;
    if (user.email !== undefined) updateSet.email = user.email ?? null;
    if (user.loginMethod !== undefined) updateSet.loginMethod = user.loginMethod ?? null;

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId && user.openId === ENV.ownerOpenId) {
      values.role = 'platform_admin';
      updateSet.role = 'platform_admin';
    }

    if (user.openId) {
      await db.insert(users).values(values).onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Funções para autenticação própria (email/senha) ─────────────────────────

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: InsertUser["role"];
  companyId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(users).values({
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    role: data.role ?? "company_viewer",
    companyId: data.companyId ?? null,
    loginMethod: "local",
    lastSignedIn: new Date(),
  });
}

export async function updateUserLastSignedIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}
