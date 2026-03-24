/**
 * Autenticação própria da plataforma SmartDocPlan (email + senha).
 * Autenticação local — usa bcrypt para hash e JWT para sessão.
 */
import type { Express } from "express";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";
import { getUserByEmail, getUserById, updateUserLastSignedIn, createLocalUser } from "../db";
import { ENV } from "./env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";

const SECRET = new TextEncoder().encode(ENV.cookieSecret);

// ─── JWT helpers ──────────────────────────────────────────────────────────────

export async function signLocalSession(userId: number): Promise<string> {
  const exp = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ userId, type: "local" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .sign(SECRET);
}

export async function verifyLocalSession(token: string): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    if (typeof payload.userId === "number" && payload.type === "local") {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getUserFromLocalSession(cookieHeader: string | undefined) {
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const session = await verifyLocalSession(token);
  if (!session) return null;

  const user = await getUserById(session.userId);
  return user ?? null;
}

// ─── Seed do usuário admin inicial ───────────────────────────────────────────

export async function seedAdminUser() {
  try {
    const existing = await getUserByEmail("admin@smartdocplan.com");
    if (!existing) {
      const hash = await bcrypt.hash("Admin@2024!", 12);
      await createLocalUser({
        name: "Administrador",
        email: "admin@smartdocplan.com",
        passwordHash: hash,
        role: "platform_admin",
        companyId: null,
      });
      console.log("[Auth] Admin inicial criado: admin@smartdocplan.com / Admin@2024!");
    }
  } catch (err) {
    console.warn("[Auth] Não foi possível criar o admin inicial:", err);
  }
}

// ─── Rotas Express ────────────────────────────────────────────────────────────

export function registerLocalAuthRoutes(app: Express) {
  // POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
      }

      const user = await getUserByEmail(email.toLowerCase().trim());
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Credenciais inválidas." });
      }

      if (user.ativo === false) {
        return res.status(403).json({ error: "Usuário inativo. Entre em contato com o administrador." });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Credenciais inválidas." });
      }

      const token = await signLocalSession(user.id);
      await updateUserLastSignedIn(user.id);

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, cookieOptions);

      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      });
    } catch (err) {
      console.error("[Auth] Login error:", err);
      return res.status(500).json({ error: "Erro interno no servidor." });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return res.json({ success: true });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = await getUserFromLocalSession(req.headers.cookie);
      if (!user) return res.status(401).json({ error: "Não autenticado." });
      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      });
    } catch (err) {
      return res.status(500).json({ error: "Erro interno." });
    }
  });
}
