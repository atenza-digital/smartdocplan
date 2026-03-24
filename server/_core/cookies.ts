import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const isProduction = process.env.NODE_ENV === "production";

  // Em produção sempre secure=true (nginx faz SSL termination e passa HTTPS)
  // Em dev, detectar pelo protocolo/header
  const secure = isProduction || req.protocol === "https" ||
    req.headers["x-forwarded-proto"] === "https";

  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
