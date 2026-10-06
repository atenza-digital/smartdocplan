import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Versão do sistema (package.json), lida uma vez na subida.
const APP_VERSION = (() => {
  try {
    return (JSON.parse(readFileSync(resolve("package.json"), "utf-8")) as { version?: string }).version ?? null;
  } catch {
    return null;
  }
})();

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados indisponível.");
        await db.execute(sql`SELECT 1`);
        return {
          ok: true,
          version: process.env.BUILD_SHA || "development",
          appVersion: APP_VERSION,
          // APP_ENV distingue homologação de produção (as duas rodam com NODE_ENV=production).
          ambiente: process.env.APP_ENV?.trim() || (process.env.NODE_ENV === "production" ? "Produção" : "Desenvolvimento"),
          banco: "PostgreSQL",
        };
      } catch {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Serviço temporariamente indisponível.",
        });
      }
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
