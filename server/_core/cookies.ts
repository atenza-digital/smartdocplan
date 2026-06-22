import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const isForwardedHttps = Array.isArray(forwardedProto)
    ? forwardedProto.includes("https")
    : typeof forwardedProto === "string" && forwardedProto.includes("https");

  // O cookie precisa seguir o protocolo real da requisicao.
  // Se marcarmos Secure em um acesso HTTP publico, o navegador ignora
  // o Set-Cookie e o usuario volta para a tela de login.
  const secure = req.protocol === "https" || isForwardedHttps;

  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
