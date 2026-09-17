import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import {
  companies,
  employees,
  positions,
  worksites,
  contracts,
  organizationalUnits,
  constructionWorks,
  requests,
  positionRequirements,
  documentTypeTemplates,
  requestDocumentUploads,
  auditLogs,
} from "../drizzle/schema";

const id = z.number().int().positive();
export const requestCreationInput = z.object({
  companyId: id,
  employeeId: id.optional(),
  positionId: id.optional(),
  worksiteId: id.optional(),
  contractId: id.optional(),
  unitId: id.optional(),
  constructionWorkId: id.optional(),
  tipo: z.enum([
    "admissao",
    "demissao",
    "mudanca_funcao",
    "afastamento",
    "atestado_medico",
    "outros",
  ]),
  titulo: z.string().trim().min(1).max(255),
  descricao: z.string().trim().max(20000).optional(),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
});

export async function createRequestWithRequirements(
  input: z.infer<typeof requestCreationInput>,
  userId: number
) {
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
    const context: Record<string, { id: number; nome: string }> = {
      empresa: { id: company.id, nome: company.razaoSocial },
    };
    const targets = [
      ["colaborador", employees, input.employeeId],
      ["funcao", positions, input.positionId],
      ["frente", worksites, input.worksiteId],
      ["contrato", contracts, input.contractId],
      ["unidade", organizationalUnits, input.unitId],
      ["obra", constructionWorks, input.constructionWorkId],
    ] as const;
    for (const [label, table, targetId] of targets) {
      if (!targetId) continue;
      const [record] = await tx
        .select()
        .from(table)
        .where(
          and(eq(table.id, targetId), eq(table.companyId, input.companyId))
        );
      if (!record || ("status" in record && record.status !== "ativo")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `O cadastro de ${label} não está ativo ou não pertence à empresa selecionada.`,
        });
      }
      context[label] = { id: record.id, nome: record.nome };
    }
    const templates = await tx
      .select()
      .from(documentTypeTemplates)
      .where(
        and(
          eq(documentTypeTemplates.tipoSolicitacao, input.tipo),
          eq(documentTypeTemplates.ativo, true)
        )
      )
      .orderBy(documentTypeTemplates.ordem);
    const rules = input.positionId
      ? (
          await tx
            .select()
            .from(positionRequirements)
            .where(
              and(
                eq(positionRequirements.positionId, input.positionId),
                eq(positionRequirements.ativo, true)
              )
            )
            .orderBy(positionRequirements.ordem)
        ).filter(
          rule =>
            rule.tipoSolicitacao === "todos" ||
            rule.tipoSolicitacao === input.tipo
        )
      : [];
    // Preserve the rules that applied when opening, never re-read them for old requests.
    const snapshot = {
      version: 1,
      capturedAt: new Date().toISOString(),
      templates,
      positionRequirements: rules,
    };
    const [created] = await tx
      .insert(requests)
      .values({
        ...input,
        criadoPor: userId,
        contextSnapshot: JSON.stringify(context),
        requirementsSnapshot: JSON.stringify(snapshot),
      })
      .returning({ id: requests.id });
    const documents = [
      ...templates.map(t => ({
        requestId: created.id,
        templateId: t.id,
        nome: t.nome,
        categoria: t.categoria,
        obrigatorio: t.obrigatorio,
      })),
      ...rules.map(r => ({
        requestId: created.id,
        templateId: null,
        nome: r.documentoNome,
        categoria: r.categoria,
        obrigatorio: r.obrigatorio,
      })),
    ];
    if (documents.length)
      await tx.insert(requestDocumentUploads).values(documents);
    await tx
      .insert(auditLogs)
      .values({
        userId,
        companyId: input.companyId,
        action: "criou_solicitacao",
        entity: "requests",
        entityId: created.id,
        details: JSON.stringify({
          tipo: input.tipo,
          requisitos: documents.length,
          contexto: context,
        }),
      });
    return { success: true, id: created.id };
  });
}
