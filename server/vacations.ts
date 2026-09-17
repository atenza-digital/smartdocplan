import { and, desc, eq, inArray, lte, gte, ne, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  vacations,
  vacationEvents,
  employees,
  companies,
  users,
  userNotifications,
  auditLogs,
} from "../drizzle/schema";
import {
  canManageCompanyData,
  canManageRequestWorkflow,
  isPlatformUser,
} from "../shared/permissions";
import {
  brazilToday,
  deadlineDays,
  vacationStatusLabels,
} from "../shared/vacations";
import { getDb } from "./db";
import { protectedProcedure, router } from "./_core/trpc";
import { saveDocumentFile, validateDocumentFile } from "./uploadFiles";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type User = { id: number; role: string; companyId: number | null };
const id = z.number().int().positive();
const periodFields = z.object({
  acquisitionStart: z.iso.date(),
  acquisitionEnd: z.iso.date(),
  concessionDeadline: z.iso.date().nullable().default(null),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  notes: z.string().trim().max(20000).default(""),
});
function access(user: User, companyId: number, write = false) {
  if (
    (!isPlatformUser(user.role) && user.companyId !== companyId) ||
    (write && !canManageCompanyData(user.role))
  )
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Seu perfil não tem acesso a esta operação de férias.",
    });
}
async function database() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db;
}
async function period(
  tx: Tx,
  vacationId: number,
  user: User,
  revision?: number
) {
  // Employee is always locked first, serializing overlapping periods without deadlocks.
  const [found] = await tx
    .select()
    .from(vacations)
    .where(eq(vacations.id, vacationId));
  if (!found)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Programação não encontrada.",
    });
  access(user, found.companyId, revision !== undefined);
  await tx
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.id, found.employeeId))
    .for("update");
  const [record] = await tx
    .select()
    .from(vacations)
    .where(eq(vacations.id, vacationId))
    .for("update");
  if (revision !== undefined && record.revision !== revision)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Este registro foi atualizado por outra pessoa. Recarregue os dados.",
    });
  return record;
}
async function validatePeriod(
  tx: Tx,
  companyId: number,
  employeeId: number,
  input: Pick<
    z.infer<typeof periodFields>,
    "startDate" | "endDate" | "acquisitionStart" | "acquisitionEnd"
  >,
  exceptId?: number
) {
  if (
    input.endDate < input.startDate ||
    input.acquisitionEnd < input.acquisitionStart
  )
    throw new Error("A data final não pode ser anterior à data inicial.");
  const [employee] = await tx
    .select()
    .from(employees)
    .where(
      and(eq(employees.id, employeeId), eq(employees.companyId, companyId))
    )
    .for("update");
  const [company] = await tx
    .select()
    .from(companies)
    .where(eq(companies.id, companyId));
  if (!employee || employee.status !== "ativo" || company?.status !== "ativo")
    throw new Error(
      "Selecione um colaborador ativo da empresa ativa informada."
    );
  const overlaps = await tx
    .select({ id: vacations.id })
    .from(vacations)
    .where(
      and(
        eq(vacations.employeeId, employeeId),
        inArray(vacations.status, ["rascunho", "pendente", "aprovado"]),
        lte(vacations.startDate, input.endDate),
        gte(vacations.endDate, input.startDate),
        exceptId ? ne(vacations.id, exceptId) : undefined
      )
    );
  if (overlaps.length)
    throw new Error(
      "Já existe uma programação para esse colaborador no período informado."
    );
}
async function event(
  tx: Tx,
  record: typeof vacations.$inferSelect,
  user: User,
  action: string,
  details: unknown
) {
  await tx
    .insert(vacationEvents)
    .values({
      vacationId: record.id,
      userId: user.id,
      action,
      details: JSON.stringify(details),
    });
  await tx
    .insert(auditLogs)
    .values({
      companyId: record.companyId,
      userId: user.id,
      action: `ferias_${action}`,
      entity: "vacations",
      entityId: record.id,
      details: JSON.stringify(details),
    });
}
async function notify(
  tx: Tx,
  record: typeof vacations.$inferSelect,
  status: string
) {
  const recipients = await tx
    .select()
    .from(users)
    .where(
      and(
        eq(users.ativo, true),
        or(
          eq(users.id, record.createdBy),
          inArray(users.role, ["platform_admin", "platform_analyst"])
        )
      )
    );
  const allowed = recipients.filter(
    u => isPlatformUser(u.role) || u.companyId === record.companyId
  );
  if (allowed.length)
    await tx
      .insert(userNotifications)
      .values(
        allowed.map(u => ({
          userId: u.id,
          companyId: record.companyId,
          tipo: "ferias",
          titulo: `Férias: ${vacationStatusLabels[status] ?? status}`,
          mensagem: `A programação #${record.id} foi atualizada. Consulte os detalhes.`,
          link: `${isPlatformUser(u.role) ? "/admin" : "/empresa"}/ferias?periodo=${record.id}&empresa=${record.companyId}`,
        }))
      );
}
export const vacationsRouter = router({
  list: protectedProcedure
    .input(z.object({ companyId: id, employeeId: id.optional() }))
    .query(async ({ ctx, input }) => {
      access(ctx.user, input.companyId);
      const db = await database();
      return db
        .select()
        .from(vacations)
        .where(
          and(
            eq(vacations.companyId, input.companyId),
            input.employeeId
              ? eq(vacations.employeeId, input.employeeId)
              : undefined
          )
        )
        .orderBy(desc(vacations.startDate));
    }),
  history: protectedProcedure
    .input(z.object({ id }))
    .query(async ({ ctx, input }) => {
      const db = await database();
      const [record] = await db
        .select()
        .from(vacations)
        .where(eq(vacations.id, input.id));
      if (!record) throw new Error("Programação não encontrada.");
      access(ctx.user, record.companyId);
      return db
        .select({
          id: vacationEvents.id,
          action: vacationEvents.action,
          details: vacationEvents.details,
          createdAt: vacationEvents.createdAt,
          userName: users.name,
        })
        .from(vacationEvents)
        .leftJoin(users, eq(users.id, vacationEvents.userId))
        .where(eq(vacationEvents.vacationId, input.id))
        .orderBy(desc(vacationEvents.createdAt));
    }),
  create: protectedProcedure
    .input(periodFields.extend({ companyId: id, employeeId: id }))
    .mutation(async ({ ctx, input }) => {
      access(ctx.user, input.companyId, true);
      return (await database()).transaction(async tx => {
        await validatePeriod(tx, input.companyId, input.employeeId, input);
        const [record] = await tx
          .insert(vacations)
          .values({ ...input, createdBy: ctx.user.id })
          .returning();
        await event(tx, record, ctx.user, "criado", input);
        return record;
      });
    }),
  update: protectedProcedure
    .input(periodFields.extend({ id, revision: id }))
    .mutation(async ({ ctx, input }) => {
      return (await database()).transaction(async tx => {
        const record = await period(tx, input.id, ctx.user, input.revision);
        if (!["rascunho", "reprovado"].includes(record.status))
          throw new Error(
            "Somente rascunhos e registros devolvidos podem ser editados."
          );
        await validatePeriod(
          tx,
          record.companyId,
          record.employeeId,
          input,
          record.id
        );
        const { id: recordId, revision, ...data } = input;
        const [updated] = await tx
          .update(vacations)
          .set({
            ...data,
            status: "rascunho",
            revision: revision + 1,
            updatedAt: new Date(),
            noticeFileUrl: null,
            noticeFileName: null,
            reviewReason: null,
            reviewedBy: null,
            reviewedAt: null,
          })
          .where(eq(vacations.id, recordId))
          .returning();
        await event(tx, record, ctx.user, "editado", {
          antes: record,
          depois: data,
          aviso: "Anexar novamente após edição",
        });
        return updated;
      });
    }),
  uploadNotice: protectedProcedure
    .input(
      z.object({
        id,
        revision: id,
        fileName: z.string().trim().min(1).max(255),
        base64: z.string().max(14 * 1024 * 1024),
      })
    )
    .mutation(async ({ ctx, input }) => {
      validateDocumentFile(input.base64);
      let saved: Awaited<ReturnType<typeof saveDocumentFile>> | undefined;
      try {
        return await (
          await database()
        ).transaction(async tx => {
          const record = await period(tx, input.id, ctx.user, input.revision);
          if (!["rascunho", "reprovado"].includes(record.status))
            throw new Error("O aviso não pode ser substituído nesta etapa.");
          saved = await saveDocumentFile(input.base64, `ferias_${record.id}`);
          const [updated] = await tx
            .update(vacations)
            .set({
              noticeFileUrl: saved.url,
              noticeFileName: input.fileName,
              revision: record.revision + 1,
              updatedAt: new Date(),
            })
            .where(eq(vacations.id, record.id))
            .returning();
          await event(tx, record, ctx.user, "aviso_anexado", {
            nome: input.fileName,
          });
          return updated;
        });
      } catch (error) {
        await saved?.cleanup();
        throw error;
      }
    }),
  transition: protectedProcedure
    .input(
      z.object({
        id,
        revision: id,
        action: z.enum(["enviar", "aprovar", "devolver", "cancelar"]),
        reason: z.string().trim().max(20000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return (await database()).transaction(async tx => {
        const record = await period(tx, input.id, ctx.user, input.revision);
        const reviewer = canManageRequestWorkflow(ctx.user.role);
        let status: string;
        if (input.action === "enviar") {
          if (
            !["rascunho", "reprovado"].includes(record.status) ||
            !record.noticeFileUrl
          )
            throw new Error(
              "Anexe o aviso de férias antes de enviar para análise."
            );
          await validatePeriod(
            tx,
            record.companyId,
            record.employeeId,
            record,
            record.id
          );
          status = "pendente";
        } else if (input.action === "aprovar" || input.action === "devolver") {
          if (!reviewer)
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "A avaliação é realizada pela equipe SmartDocPlan.",
            });
          if (record.status !== "pendente" || !record.noticeFileUrl)
            throw new Error(
              "Esta programação não está aguardando análise documental."
            );
          if (input.action === "aprovar")
            await validatePeriod(
              tx,
              record.companyId,
              record.employeeId,
              record,
              record.id
            );
          if (input.action === "devolver" && !input.reason)
            throw new Error("Informe o motivo da devolução.");
          status = input.action === "aprovar" ? "aprovado" : "reprovado";
        } else {
          if (
            record.status === "cancelado" ||
            (record.status === "aprovado" && !reviewer)
          )
            throw new Error(
              "Uma programação aprovada só pode ser cancelada pela SmartDocPlan."
            );
          if (!input.reason)
            throw new Error("Informe o motivo do cancelamento.");
          status = "cancelado";
        }
        const [updated] = await tx
          .update(vacations)
          .set({
            status,
            revision: record.revision + 1,
            updatedAt: new Date(),
            reviewReason: input.reason ?? null,
            ...(input.action === "aprovar" || input.action === "devolver"
              ? { reviewedBy: ctx.user.id, reviewedAt: new Date() }
              : {}),
          })
          .where(eq(vacations.id, record.id))
          .returning();
        await event(tx, record, ctx.user, input.action, {
          antes: record.status,
          depois: status,
          motivo: input.reason ?? null,
        });
        await notify(tx, record, status);
        return updated;
      });
    }),
});

export async function notifyVacationDeadlines(today = brazilToday()) {
  const db = await getDb();
  if (!db) return;
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(20260917, 2)`);
    const pending = await tx
      .select()
      .from(vacations)
      .where(inArray(vacations.status, ["rascunho", "pendente", "reprovado"]));
    for (const record of pending) {
      const days = deadlineDays(record.concessionDeadline, today);
      if (days === null || days > 30) continue;
      const threshold = days < 0 ? "vencido" : days <= 7 ? "7" : "30";
      const type = `ferias_prazo_${record.id}_${record.revision}_${threshold}`;
      const recipients = await tx
        .select()
        .from(users)
        .where(
          and(
            eq(users.ativo, true),
            or(
              inArray(users.role, ["platform_admin", "platform_analyst"]),
              and(
                eq(users.companyId, record.companyId),
                inArray(users.role, ["company_admin", "company_hr"])
              )
            )
          )
        );
      for (const user of recipients) {
        const [existing] = await tx
          .select({ id: userNotifications.id })
          .from(userNotifications)
          .where(
            and(
              eq(userNotifications.userId, user.id),
              eq(userNotifications.tipo, type)
            )
          );
        if (!existing)
          await tx
            .insert(userNotifications)
            .values({
              userId: user.id,
              companyId: record.companyId,
              tipo: type,
              titulo:
                days < 0
                  ? "Prazo informado de férias ultrapassado"
                  : "Prazo informado de férias próximo",
              mensagem: `A programação #${record.id} precisa de atenção. O prazo foi informado pelo RH; não é um cálculo automático de saldo legal.`,
              link: `${isPlatformUser(user.role) ? "/admin" : "/empresa"}/ferias?periodo=${record.id}&empresa=${record.companyId}`,
            });
      }
    }
  });
}
