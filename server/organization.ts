import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  contracts,
  organizationalUnits,
  constructionWorks,
  companies,
  auditLogs,
} from "../drizzle/schema";
import { canManageCompanyData, isPlatformUser } from "../shared/permissions";
import { getDb } from "./db";
import { protectedProcedure, router } from "./_core/trpc";

const tables = {
  contrato: contracts,
  unidade: organizationalUnits,
  obra: constructionWorks,
};
export const organizationKind = z.enum(["contrato", "unidade", "obra"]);
const fields = z.object({
  nome: z.string().trim().min(2).max(255),
  codigo: z.string().trim().max(60).default(""),
  observacoes: z.string().trim().max(20000).default(""),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});
function authorize(
  user: { role: string; companyId: number | null },
  companyId: number,
  write = false
) {
  if (
    (!isPlatformUser(user.role) && user.companyId !== companyId) ||
    (write && !canManageCompanyData(user.role))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Seu perfil não tem acesso a este cadastro.",
    });
  }
}
export const organizationRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        kind: organizationKind,
        companyId: z.number().int().positive(),
        includeInactive: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      authorize(ctx.user, input.companyId);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const table = tables[input.kind];
      return db
        .select()
        .from(table)
        .where(
          and(
            eq(table.companyId, input.companyId),
            input.includeInactive ? undefined : eq(table.status, "ativo")
          )
        )
        .orderBy(table.nome);
    }),
  create: protectedProcedure
    .input(
      fields.extend({
        kind: organizationKind,
        companyId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      authorize(ctx.user, input.companyId, true);
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return db.transaction(async tx => {
        const [company] = await tx
          .select()
          .from(companies)
          .where(eq(companies.id, input.companyId));
        if (!company || company.status !== "ativo")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selecione uma empresa ativa.",
          });
        const { kind, ...data } = input;
        const [record] = await tx.insert(tables[kind]).values(data).returning();
        await tx
          .insert(auditLogs)
          .values({
            userId: ctx.user.id,
            companyId: input.companyId,
            action: "criou_cadastro_organizacional",
            entity: kind,
            entityId: record.id,
            details: JSON.stringify(data),
          });
        return record;
      });
    }),
  update: protectedProcedure
    .input(
      fields.extend({ kind: organizationKind, id: z.number().int().positive() })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return db.transaction(async tx => {
        const table = tables[input.kind];
        const [record] = await tx
          .select()
          .from(table)
          .where(eq(table.id, input.id))
          .for("update");
        if (!record)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cadastro não encontrado.",
          });
        authorize(ctx.user, record.companyId, true);
        const { kind, id, ...data } = input;
        const [updated] = await tx
          .update(table)
          .set(data)
          .where(eq(table.id, id))
          .returning();
        await tx
          .insert(auditLogs)
          .values({
            userId: ctx.user.id,
            companyId: record.companyId,
            action: "atualizou_cadastro_organizacional",
            entity: kind,
            entityId: id,
            details: JSON.stringify({ antes: record, depois: data }),
          });
        return updated;
      });
    }),
});
