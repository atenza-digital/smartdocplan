import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { SessionUser } from "../companyProfiles";
import { getUserFromLocalSession } from "./localAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: SessionUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: SessionUser | null = null;

  try {
    user = await getUserFromLocalSession(opts.req.headers.cookie);
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
