import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Request, Response } from "express";

export type ClientInfo = { ip: string | null; userAgent: string | null };

const storage = new AsyncLocalStorage<ClientInfo>();

/** IP e navegador da requisição. Com `trust proxy` = 1, `req.ip` é o IP real repassado pelo Traefik. */
export function requestClientInfo(req: Pick<Request, "ip" | "headers">): ClientInfo {
  const ip = (req.ip ?? "").replace(/^::ffff:/, "").slice(0, 64) || null;
  const ua = req.headers["user-agent"];
  const userAgent = (Array.isArray(ua) ? ua[0] : ua)?.slice(0, 300) || null;
  return { ip, userAgent };
}

/** Guarda IP e navegador de cada requisição para a auditoria ler sem precisar receber `req`. */
export function clientInfoMiddleware(req: Request, _res: Response, next: NextFunction) {
  storage.run(requestClientInfo(req), next);
}

/** Campos de IP e navegador para gravar na auditoria (vazios fora de uma requisição, ex.: rotinas agendadas). */
export function auditClientFields(): ClientInfo {
  return storage.getStore() ?? { ip: null, userAgent: null };
}
