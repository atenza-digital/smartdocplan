import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import {
  canCreateRequests,
  canAccessHealthData,
  isHealthCategory,
  canCreateTickets,
  canManageCompanyData,
  canManageRequestWorkflow,
  isPlatformOperator,
  isPlatformUser,
  canManagePlatformSettings,
} from "@shared/permissions";
import { REQUEST_STATUS_LABELS, canTransitionRequest, type RequestStatus } from "@shared/requestStatus";
import { getSessionCookieOptions } from "./_core/cookies";
import { revokeSessionFromCookie } from "./_core/localAuth";
import { systemRouter } from "./_core/systemRouter";
import { organizationRouter } from "./organization";
import { vacationsRouter } from "./vacations";
import { biRouter } from "./bi";
import { saveDocumentFile, uploadRoot, validateDocumentFile } from "./uploadFiles";
import { createRequestWithRequirements, requestCreationInput } from "./requestCreation";
import { publicProcedure, protectedProcedure, adminProcedure, superAdminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb, getUserByEmail, createLocalUser } from "./db";
import {
  companies, employees, requests, tickets, auditLogs,
  positions, worksites, companyDocuments, employeeDocuments,
  legalRequirements, positionRequirements, recurringDocumentTypes, healthCampaigns, users, documentTypeTemplates, requestDocumentUploads,
  companyUpdateRequests, userNotifications, ticketMessages, userWorksites
} from "../drizzle/schema";
import { eq, and, desc, or, sql, ne, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auditClientFields } from "./_core/clientInfo";
import { addressForDb, addressInput } from "@shared/address";
import { COMPANY_DOCUMENT_TYPES, COMPANY_MONTHLY_DOCUMENT_TIPO, latestCompanyDocuments } from "@shared/companyDocuments";
import { getEmployeeChecklist, recalcCompliance, recalcComplianceForPositions } from "./compliance";
import { buildCompanyMonthlyGrid, buildCompanyMonthlyOverview, buildEmployeeMonthlyGrid } from "./recurring";
import { PERIODICIDADES, asPeriodicidade, formatPeriod, isPeriodAllowed } from "@shared/recurring";
import { brazilToday } from "@shared/vacations";
import { campaignVisibleTo, isSafeCampaignLink } from "@shared/campaigns";
import {
  formatCnpj,
  formatCpf,
  formatPhone,
  getDocumentDatesError,
  getValidityState,
  hasFullName,
  isAtLeastYearsOld,
  isValidCnpj,
  isValidCpf,
  isValidPhone,
} from "../shared/formValidation";


// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function insertAuditLog(opts: {
  userId?: number | null;
  companyId?: number | null;
  acao: string;
  entidade?: string;
  entidadeId?: number | null;
  dadosDepois?: unknown;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values({
      userId: opts.userId ?? null,
      companyId: opts.companyId ?? null,
      action: opts.acao,
      entity: opts.entidade ?? null,
      entityId: opts.entidadeId ?? null,
      details: opts.dadosDepois ? JSON.stringify(opts.dadosDepois) : null,
      ...auditClientFields(),
    } as any);
  } catch { /* não bloquear a operação principal */ }
}

/** Verifica se o usuário é da plataforma (admin, analista ou auditor) */
function canAccessCompany(userRole: string, userCompanyId: number | null | undefined, targetCompanyId: number) {
  if (isPlatformUser(userRole)) return true;
  return userCompanyId === targetCompanyId;
}

function assertAccess(condition: unknown, message: string = "Acesso negado") {
  if (!condition) throw new TRPCError({ code: "FORBIDDEN", message });
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeCompanyPayload(input: {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  status?: "ativo" | "inativo" | "suspenso";
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}) {
  const payload: Record<string, unknown> = {};
  // Endereço vai inteiro quando qualquer campo dele vier no input (formulário envia o bloco todo).
  const enderecoInformado = ["cep", "endereco", "numero", "complemento", "bairro", "cidade", "estado"].some((key) => (input as Record<string, unknown>)[key] !== undefined);
  if (enderecoInformado) Object.assign(payload, addressForDb(input));

  if (input.razaoSocial !== undefined) payload.razaoSocial = input.razaoSocial.trim();
  if (input.nomeFantasia !== undefined) payload.nomeFantasia = normalizeOptionalText(input.nomeFantasia) ?? null;

  if (input.cnpj !== undefined) {
    const cnpj = normalizeOptionalText(input.cnpj);
    if (cnpj) {
      if (!isValidCnpj(cnpj)) throw new Error("Informe um CNPJ válido.");
      payload.cnpj = formatCnpj(cnpj);
    } else {
      payload.cnpj = null;
    }
  }

  if (input.email !== undefined) payload.email = normalizeOptionalText(input.email) ?? null;

  if (input.telefone !== undefined) {
    const telefone = normalizeOptionalText(input.telefone);
    if (telefone) {
      if (!isValidPhone(telefone)) throw new Error("Informe um telefone válido com DDD.");
      payload.telefone = formatPhone(telefone);
    } else {
      payload.telefone = null;
    }
  }

  if (input.status !== undefined) payload.status = input.status;

  return payload;
}

function parseJsonText<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function createNotifications(opts: {
  userIds: number[];
  companyId?: number | null;
  tipo?: string;
  titulo: string;
  mensagem?: string | null;
  link?: string | null;
}) {
  if (!opts.userIds.length) return;
  const db = await getDb();
  if (!db) return;
  const uniqueUserIds = Array.from(new Set(opts.userIds));
  await db.insert(userNotifications).values(
    uniqueUserIds.map((userId) => ({
      userId,
      companyId: opts.companyId ?? null,
      tipo: opts.tipo ?? "geral",
      titulo: opts.titulo,
      mensagem: opts.mensagem ?? null,
      link: opts.link ?? null,
    })) as any,
  );
}

// Categorias do dossiê; inclui as dos requisitos por cargo (psicossocial, outros) para o checklist.
const EMPLOYEE_DOC_CATEGORIES = ["pessoal","contratual","exame_medico","treinamento","psicossocial","advertencia","afastamento","atestado","opcional","outros"] as const;

// Data opcional de documento: AAAA-MM-DD ou vazio (limpa o campo).
const documentDateInput = z.union([z.iso.date(), z.literal("")]).optional();

function assertDocumentDates(dataEmissao?: string | null, validade?: string | null) {
  const error = getDocumentDatesError(dataEmissao, validade);
  if (error) throw new Error(error);
}

/** Datas efetivas após uma atualização parcial: o que veio no input ou o valor já gravado. */
function mergedDocumentDates(
  input: { dataEmissao?: string; validade?: string },
  current: { dataEmissao?: string | Date | null; validade?: string | Date | null }
) {
  const asText = (value?: string | Date | null) => (value ? String(value instanceof Date ? value.toISOString() : value).slice(0, 10) : null);
  return {
    dataEmissao: input.dataEmissao !== undefined ? input.dataEmissao || null : asText(current.dataEmissao),
    validade: input.validade !== undefined ? input.validade || null : asText(current.validade),
  };
}

function assertMinimumEmployeeAge(dataNascimento?: string) {
  if (!dataNascimento) return;
  if (!isAtLeastYearsOld(dataNascimento, 12)) {
    throw new Error("A pessoa deve ter pelo menos 12 anos completos.");
  }
}

function assertFullName(value?: string) {
  if (!value) return;
  if (!hasFullName(value)) {
    throw new Error("Informe o nome completo com nome e sobrenome.");
  }
}

async function getEmployeeByIdOrThrow(db: Awaited<ReturnType<typeof getDb>>, id: number) {
  const result = await db!.select().from(employees).where(eq(employees.id, id)).limit(1);
  const employee = result[0];
  if (!employee) throw new Error("Colaborador não encontrado");
  return employee;
}

async function getEmployeeDocByIdOrThrow(db: Awaited<ReturnType<typeof getDb>>, id: number) {
  const result = await db!.select().from(employeeDocuments).where(eq(employeeDocuments.id, id)).limit(1);
  const doc = result[0];
  if (!doc || doc.status === "excluido") throw new Error("Documento do colaborador não encontrado");
  return doc;
}

async function getPositionByIdOrThrow(db: Awaited<ReturnType<typeof getDb>>, id: number) {
  const result = await db!.select().from(positions).where(eq(positions.id, id)).limit(1);
  const position = result[0];
  if (!position) throw new Error("Função não encontrada");
  return position;
}

async function getRequestByIdOrThrow(db: Awaited<ReturnType<typeof getDb>>, id: number) {
  const result = await db!.select().from(requests).where(eq(requests.id, id)).limit(1);
  const request = result[0];
  if (!request) throw new Error("Solicitação não encontrada");
  return request;
}

async function getTicketByIdOrThrow(db: Awaited<ReturnType<typeof getDb>>, id: number) {
  const result = await db!.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  const ticket = result[0];
  if (!ticket) throw new Error("Chamado não encontrado");
  return ticket;
}

const TICKET_STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando retorno",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

/** Avisa o outro lado da conversa: equipe → quem abriu o chamado; empresa → responsável ou equipe. */
async function notifyTicketMessage(
  db: Awaited<ReturnType<typeof getDb>>,
  ticket: typeof tickets.$inferSelect,
  fromPlatform: boolean,
  autorNome: string | null | undefined,
  novoStatus: string | null = null,
) {
  try {
    if (fromPlatform) {
      await createNotifications({
        userIds: [ticket.criadoPor],
        companyId: ticket.companyId,
        tipo: "chamado_resposta",
        titulo: novoStatus
          ? `Chamado #${ticket.id}: ${TICKET_STATUS_LABELS[novoStatus] ?? novoStatus}`
          : `Nova resposta no chamado #${ticket.id}`,
        mensagem: `${autorNome ?? "Equipe SmartDocPlan"} atualizou "${ticket.titulo}".`,
        link: "/empresa/chamados",
      });
      return;
    }
    const destinatarios = ticket.responsavelId
      ? [ticket.responsavelId]
      : (await db!.select({ id: users.id }).from(users)
          .where(and(or(eq(users.role, "platform_admin"), eq(users.role, "platform_analyst")), eq(users.ativo, true))))
          .map(item => item.id);
    await createNotifications({
      userIds: destinatarios,
      companyId: ticket.companyId,
      tipo: "chamado_resposta",
      titulo: `Empresa respondeu o chamado #${ticket.id}`,
      mensagem: `${autorNome ?? "Usuário da empresa"} escreveu em "${ticket.titulo}".`,
      link: "/admin/chamados",
    });
  } catch { /* não bloquear a resposta */ }
}

// â”€â”€â”€ COMPANIES ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const companiesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    if (isPlatformUser(ctx.user.role)) {
      return db.select().from(companies).orderBy(desc(companies.createdAt));
    }
    // Usuário de empresa só vê a própria empresa
    if (!ctx.user.companyId) return [];
    return db.select().from(companies).where(eq(companies.id, ctx.user.companyId));
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.id)) return null;
    const result = await db.select().from(companies).where(eq(companies.id, input.id)).limit(1);
    return result[0] ?? null;
  }),

  updateLogo: protectedProcedure.input(z.object({
    companyId: z.number(),
    fileBase64: z.string().max(3_000_000).nullable(), // ~2 MB em base64; null remove a logo
  })).mutation(async ({ ctx, input }) => {
    const podeAlterar = ctx.user.role === "platform_admin" || (ctx.user.role === "company_admin" && ctx.user.companyId === input.companyId);
    assertAccess(podeAlterar, "Só o administrador da plataforma ou da própria empresa pode alterar a logo.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    let logoUrl: string | null = null;
    let saved: Awaited<ReturnType<typeof saveDocumentFile>> | null = null;
    if (input.fileBase64) {
      assertAccess(Buffer.byteLength(input.fileBase64, "base64") <= 2 * 1024 * 1024, "A logo deve ter no máximo 2 MB.");
      assertAccess(validateDocumentFile(input.fileBase64).ext !== "pdf", "Envie a logo em PNG ou JPG.");
      saved = await saveDocumentFile(input.fileBase64, `logo_company_${input.companyId}`);
      logoUrl = saved.url;
    }
    try {
      await db.update(companies).set({ logoUrl, updatedAt: new Date() }).where(eq(companies.id, input.companyId));
    } catch (error) { await saved?.cleanup(); throw error; }
    await insertAuditLog({ userId: ctx.user.id, companyId: input.companyId, acao: logoUrl ? "alterou_logo_empresa" : "removeu_logo_empresa", entidade: "companies", entidadeId: input.companyId });
    return { success: true, logoUrl };
  }),

  /** Parâmetros da empresa (prazos de férias). Leitura para quem acessa a empresa. */
  parameters: protectedProcedure.input(z.object({ companyId: z.number() })).query(async ({ ctx, input }) => {
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const [row] = await db.select({
      feriasMesesAquisicao: companies.feriasMesesAquisicao,
      feriasMesesParaSolicitar: companies.feriasMesesParaSolicitar,
    }).from(companies).where(eq(companies.id, input.companyId)).limit(1);
    if (!row) throw new Error("Empresa não encontrada");
    return row;
  }),

  /** Altera os parâmetros direto (não passa pela aprovação de alteração cadastral) e registra na auditoria. */
  updateParameters: protectedProcedure.input(z.object({
    companyId: z.number(),
    feriasMesesAquisicao: z.number().int().min(1, "Use de 1 a 24 meses para adquirir férias.").max(24, "Use de 1 a 24 meses para adquirir férias."),
    feriasMesesParaSolicitar: z.number().int().min(1, "Use de 1 a 12 meses para solicitar.").max(12, "Use de 1 a 12 meses para solicitar."),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode alterar os parâmetros da empresa.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const [antes] = await db.select({
      feriasMesesAquisicao: companies.feriasMesesAquisicao,
      feriasMesesParaSolicitar: companies.feriasMesesParaSolicitar,
    }).from(companies).where(eq(companies.id, input.companyId)).limit(1);
    if (!antes) throw new Error("Empresa não encontrada");
    const depois = { feriasMesesAquisicao: input.feriasMesesAquisicao, feriasMesesParaSolicitar: input.feriasMesesParaSolicitar };
    await db.update(companies).set({ ...depois, updatedAt: new Date() }).where(eq(companies.id, input.companyId));
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: input.companyId,
      acao: "alterou_parametros_empresa",
      entidade: "companies",
      entidadeId: input.companyId,
      dadosDepois: { antes, depois },
    });
    return { success: true };
  }),

  create: superAdminProcedure.input(z.object({
    razaoSocial: z.string().min(1),
    nomeFantasia: z.string().optional(),
    cnpj: z.string().optional(),
    email: z.string().email().optional(),
    telefone: z.string().optional(),
    ...addressInput,
    status: z.enum(["ativo", "inativo", "suspenso"]).default("ativo"),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const payload = normalizeCompanyPayload(input);
    await db.insert(companies).values(payload as any);
    await insertAuditLog({
      userId: ctx.user.id,
      acao: "criou_empresa",
      entidade: "companies",
      dadosDepois: { razaoSocial: payload.razaoSocial, nomeFantasia: payload.nomeFantasia ?? null, status: payload.status ?? "ativo" },
    });
    return { success: true };
  }),

  update: superAdminProcedure.input(z.object({
    id: z.number(),
    razaoSocial: z.string().min(1).optional(),
    nomeFantasia: z.string().optional(),
    cnpj: z.string().optional(),
    email: z.string().email().optional(),
    telefone: z.string().optional(),
    ...addressInput,
    status: z.enum(["ativo", "inativo", "suspenso"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const { id, ...data } = input;
    const payload = normalizeCompanyPayload(data);
    await db.update(companies).set(payload).where(eq(companies.id, id));
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: id,
      acao: "atualizou_empresa",
      entidade: "companies",
      entidadeId: id,
      dadosDepois: payload,
    });
    return { success: true };
  }),

  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, ativas: 0 };
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(companies);
    const [ativas] = await db.select({ count: sql<number>`count(*)` }).from(companies).where(eq(companies.status, "ativo"));
    return { total: total?.count ?? 0, ativas: ativas?.count ?? 0 };
  }),
});

const companyUpdateRequestsRouter = router({
  listByCompany: protectedProcedure.input(z.object({ companyId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");

    const items = await db
      .select({
        id: companyUpdateRequests.id,
        companyId: companyUpdateRequests.companyId,
        requestedBy: companyUpdateRequests.requestedBy,
        requestedByName: users.name,
        status: companyUpdateRequests.status,
        payload: companyUpdateRequests.payload,
        motivo: companyUpdateRequests.motivo,
        reviewedBy: companyUpdateRequests.reviewedBy,
        reviewedAt: companyUpdateRequests.reviewedAt,
        createdAt: companyUpdateRequests.createdAt,
        updatedAt: companyUpdateRequests.updatedAt,
      })
      .from(companyUpdateRequests)
      .leftJoin(users, eq(users.id, companyUpdateRequests.requestedBy))
      .where(eq(companyUpdateRequests.companyId, input.companyId))
      .orderBy(desc(companyUpdateRequests.createdAt));

    return items.map((item) => ({
      ...item,
      payload: parseJsonText<Record<string, unknown>>(item.payload) ?? {},
    }));
  }),

  create: protectedProcedure.input(z.object({
    companyId: z.number(),
    razaoSocial: z.string().min(1),
    nomeFantasia: z.string().optional(),
    cnpj: z.string().optional(),
    email: z.string().email().optional(),
    telefone: z.string().optional(),
    ...addressInput,
    motivo: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode solicitar alteração cadastral.");

    const company = await db.select().from(companies).where(eq(companies.id, input.companyId)).limit(1);
    const currentCompany = company[0];
    if (!currentCompany) throw new Error("Empresa não encontrada");

    const payload = normalizeCompanyPayload({
      razaoSocial: input.razaoSocial,
      nomeFantasia: input.nomeFantasia,
      cnpj: input.cnpj,
      email: input.email,
      telefone: input.telefone,
      cep: input.cep,
      endereco: input.endereco,
      numero: input.numero,
      complemento: input.complemento,
      bairro: input.bairro,
      cidade: input.cidade,
      estado: input.estado,
    });

    const [created] = await db.insert(companyUpdateRequests).values({
      companyId: input.companyId,
      requestedBy: ctx.user.id,
      status: "pendente",
      payload: JSON.stringify(payload),
      motivo: normalizeOptionalText(input.motivo) ?? null,
    } as any).returning({ id: companyUpdateRequests.id });

    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "platform_admin"), eq(users.ativo, true)));

    await createNotifications({
      userIds: adminUsers.map((item) => item.id),
      companyId: input.companyId,
      tipo: "company_update_request",
      titulo: "Atualização cadastral aguardando aprovação",
      mensagem: `${ctx.user.name ?? "Usuário"} enviou uma solicitação para ${currentCompany.razaoSocial}.`,
      link: `/admin/empresas/${input.companyId}`,
    });

    await insertAuditLog({
      userId: ctx.user.id,
      companyId: input.companyId,
      acao: "solicitou_atualizacao_empresa",
      entidade: "company_update_requests",
      entidadeId: created?.id ?? null,
      dadosDepois: payload,
    });

    return { success: true };
  }),

  approve: superAdminProcedure.input(z.object({
    requestId: z.number(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const result = await db.select().from(companyUpdateRequests).where(eq(companyUpdateRequests.id, input.requestId)).limit(1);
    const request = result[0];
    if (!request) throw new Error("Solicitação não encontrada");
    if (request.status !== "pendente") throw new Error("Essa solicitação já foi tratada.");

    const payload = parseJsonText<Record<string, unknown>>(request.payload);
    if (!payload) throw new Error("Payload da solicitação inválido.");

    await db.update(companies).set({
      ...(payload as any),
      updatedAt: new Date(),
    }).where(eq(companies.id, request.companyId));

    await db.update(companyUpdateRequests).set({
      status: "aprovada",
      reviewedBy: ctx.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    } as any).where(eq(companyUpdateRequests.id, request.id));

    const companyUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.companyId, request.companyId),
        eq(users.ativo, true),
        or(eq(users.role, "company_admin"), eq(users.role, "company_hr"))
      ));

    await createNotifications({
      userIds: [request.requestedBy, ...companyUsers.map((item) => item.id)],
      companyId: request.companyId,
      tipo: "company_update_request_approved",
      titulo: "Atualização cadastral aprovada",
      mensagem: "A SmartDocPlan aprovou a atualização cadastral da empresa.",
      link: "/empresa/parametros?aba=empresa",
    });

    await insertAuditLog({
      userId: ctx.user.id,
      companyId: request.companyId,
      acao: "aprovou_atualizacao_empresa",
      entidade: "company_update_requests",
      entidadeId: request.id,
      dadosDepois: payload,
    });

    return { success: true };
  }),

  reject: superAdminProcedure.input(z.object({
    requestId: z.number(),
    motivo: z.string().min(3),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const result = await db.select().from(companyUpdateRequests).where(eq(companyUpdateRequests.id, input.requestId)).limit(1);
    const request = result[0];
    if (!request) throw new Error("Solicitação não encontrada");
    if (request.status !== "pendente") throw new Error("Essa solicitação já foi tratada.");

    await db.update(companyUpdateRequests).set({
      status: "rejeitada",
      motivo: input.motivo.trim(),
      reviewedBy: ctx.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    } as any).where(eq(companyUpdateRequests.id, request.id));

    await createNotifications({
      userIds: [request.requestedBy],
      companyId: request.companyId,
      tipo: "company_update_request_rejected",
      titulo: "Atualização cadastral devolvida",
      mensagem: input.motivo.trim(),
      link: "/empresa/parametros?aba=empresa",
    });

    await insertAuditLog({
      userId: ctx.user.id,
      companyId: request.companyId,
      acao: "rejeitou_atualizacao_empresa",
      entidade: "company_update_requests",
      entidadeId: request.id,
      dadosDepois: { motivo: input.motivo.trim() },
    });

    return { success: true };
  }),
});

const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, ctx.user.id))
      .orderBy(desc(userNotifications.createdAt));
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0 };
    const [countRow] = await db
      .select({ total: sql<number>`count(*)` })
      .from(userNotifications)
      .where(and(eq(userNotifications.userId, ctx.user.id), sql`${userNotifications.lidaAt} IS NULL`));
    return { total: countRow?.total ?? 0 };
  }),

  markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    await db.update(userNotifications).set({ lidaAt: new Date() } as any).where(and(
      eq(userNotifications.id, input.id),
      eq(userNotifications.userId, ctx.user.id),
    ));
    return { success: true };
  }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    await db.update(userNotifications).set({ lidaAt: new Date() } as any).where(and(
      eq(userNotifications.userId, ctx.user.id),
      sql`${userNotifications.lidaAt} IS NULL`,
    ));
    return { success: true };
  }),
});

const companyDocumentsRouter = router({
  listByCompany: protectedProcedure.input(z.object({ companyId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return [];
    return db
      .select()
      .from(companyDocuments)
      .where(eq(companyDocuments.companyId, input.companyId))
      .orderBy(companyDocuments.tipo, desc(companyDocuments.updatedAt));
  }),

  statsByCompany: protectedProcedure.input(z.object({ companyId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      return { total: 0, enviados: 0, obrigatoriosPendentes: 0, vencidos: 0, aVencer: 0 };
    }
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) {
      return { total: 0, enviados: 0, obrigatoriosPendentes: 0, vencidos: 0, aVencer: 0 };
    }

    const docs = await db.select().from(companyDocuments).where(eq(companyDocuments.companyId, input.companyId));
    // Só a versão atual de cada tipo conta: versões antigas vencidas não são pendência.
    const latest = latestCompanyDocuments(docs);
    const atuais = COMPANY_DOCUMENT_TYPES.map((item) => latest.get(item.tipo)).filter((doc): doc is NonNullable<typeof doc> => !!doc);
    const obrigatoriosPendentes = COMPANY_DOCUMENT_TYPES.filter((item) => item.obrigatorio && !latest.has(item.tipo)).length;
    const vencidos = atuais.filter((doc) => getValidityState(doc.validade) === "vencido").length;
    const aVencer = atuais.filter((doc) => getValidityState(doc.validade) === "a_vencer").length;

    return {
      total: COMPANY_DOCUMENT_TYPES.length,
      enviados: atuais.length,
      obrigatoriosPendentes,
      vencidos,
      aVencer,
    };
  }),

  create: protectedProcedure.input(z.object({
    companyId: z.number(),
    tipo: z.string().min(1),
    nome: z.string().min(1),
    dataEmissao: documentDateInput,
    validade: documentDateInput,
    observacao: z.string().optional(),
    fileNome: z.string(),
    fileBase64: z.string(),
    recurringTypeId: z.number().optional(),
    competencia: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role) || isPlatformOperator(ctx.user.role), "Seu perfil não pode gerenciar documentos da empresa.");
    assertDocumentDates(input.dataEmissao, input.validade);
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const mensal = await assertRecurringUpload(db, { recurringTypeId: input.recurringTypeId, competencia: input.competencia, companyId: input.companyId, alvo: "empresa" });
    assertAccess(mensal || COMPANY_DOCUMENT_TYPES.some((item) => item.tipo === input.tipo.trim()), "Tipo de documento da empresa inválido.");

    const saved = await saveDocumentFile(input.fileBase64, `company_${input.companyId}`);
    const fileUrl = saved.url;
    try {
    await db.insert(companyDocuments).values({
      companyId: input.companyId,
      tipo: mensal ? COMPANY_MONTHLY_DOCUMENT_TIPO : input.tipo.trim(),
      nome: input.nome.trim(),
      recurringTypeId: mensal ? input.recurringTypeId : undefined,
      competencia: mensal ? input.competencia : undefined,
      fileUrl,
      fileKey: fileUrl.replace("/uploads/", ""),
      dataEmissao: input.dataEmissao || undefined,
      validade: input.validade || undefined,
      observacao: normalizeOptionalText(input.observacao) ?? undefined,
    });
    } catch (error) { await saved.cleanup(); throw error; }
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: input.companyId,
      acao: "criou_documento_empresa",
      entidade: "company_documents",
      dadosDepois: { tipo: input.tipo, nome: input.nome, fileNome: input.fileNome },
    });
    return { success: true, fileUrl };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    nome: z.string().min(1).optional(),
    dataEmissao: documentDateInput,
    validade: documentDateInput,
    observacao: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const result = await db.select().from(companyDocuments).where(eq(companyDocuments.id, input.id)).limit(1);
    const doc = result[0];
    if (!doc) throw new Error("Documento da empresa não encontrado");
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, doc.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role) || isPlatformOperator(ctx.user.role), "Seu perfil não pode gerenciar documentos da empresa.");
    const datas = mergedDocumentDates(input, doc);
    assertDocumentDates(datas.dataEmissao, datas.validade);

    const payload = {
      nome: input.nome?.trim() ?? doc.nome,
      dataEmissao: input.dataEmissao !== undefined ? input.dataEmissao || null : undefined,
      validade: input.validade !== undefined ? input.validade || null : undefined,
      observacao: input.observacao !== undefined ? normalizeOptionalText(input.observacao) ?? null : undefined,
    };
    await db.update(companyDocuments).set(payload as any).where(eq(companyDocuments.id, input.id));
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: doc.companyId,
      acao: "atualizou_documento_empresa",
      entidade: "company_documents",
      entidadeId: doc.id,
      dadosDepois: payload,
    });
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const result = await db.select().from(companyDocuments).where(eq(companyDocuments.id, input.id)).limit(1);
    const doc = result[0];
    if (!doc) throw new Error("Documento da empresa não encontrado");
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, doc.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role) || isPlatformOperator(ctx.user.role), "Seu perfil não pode gerenciar documentos da empresa.");
    await db.delete(companyDocuments).where(eq(companyDocuments.id, input.id));
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: doc.companyId,
      acao: "removeu_documento_empresa",
      entidade: "company_documents",
      entidadeId: doc.id,
      dadosDepois: { tipo: doc.tipo, nome: doc.nome },
    });
    return { success: true };
  }),
});

// â”€â”€â”€ EMPLOYEES ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const employeesRouter = router({
  list: protectedProcedure.input(z.object({
    companyId: z.number(),
    status: z.enum(["ativo", "afastado", "desligado"]).optional(),
    positionId: z.number().optional(),
    worksiteId: z.number().optional(),
    liberacao: z.enum(["sem_requisitos", "aguardando_documentacao", "em_analise", "liberado"]).optional(),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return [];
    const conditions = [eq(employees.companyId, input.companyId)];
    if (input.status) conditions.push(eq(employees.status, input.status));
    if (input.liberacao) conditions.push(eq(employees.liberacao, input.liberacao));
    if (input.positionId) conditions.push(eq(employees.positionId, input.positionId));
    if (input.worksiteId) conditions.push(eq(employees.worksiteId, input.worksiteId));
    return db.select().from(employees).where(and(...conditions)).orderBy(employees.nome);
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(employees).where(eq(employees.id, input.id)).limit(1);
    const emp = result[0];
    if (!emp) return null;
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, emp.companyId)) return null;
    return emp;
  }),

  create: protectedProcedure.input(z.object({
    companyId: z.number(),
    nome: z.string().min(1),
    cpf: z.string().min(11),
    dataNascimento: z.union([z.iso.date(), z.literal("")]).optional(),
    positionId: z.number().optional(),
    worksiteId: z.number().optional(),
    dataAdmissao: z.union([z.iso.date(), z.literal("")]).optional(),
    salario: z.string().optional(),
    email: z.string().email().optional(),
    telefone: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode cadastrar colaboradores.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    assertFullName(input.nome);
    if (!isValidCpf(input.cpf)) {
      throw new Error("Informe um CPF válido.");
    }
    if (input.telefone && !isValidPhone(input.telefone)) {
      throw new Error("Informe um telefone válido com DDD.");
    }
    assertMinimumEmployeeAge(input.dataNascimento);
    const [created] = await db.insert(employees).values({
      ...input,
      nome: input.nome.trim(),
      cpf: formatCpf(input.cpf),
      dataNascimento: input.dataNascimento || undefined,
      dataAdmissao: input.dataAdmissao || undefined,
      email: normalizeOptionalText(input.email) ?? undefined,
      telefone: normalizeOptionalText(input.telefone) ? formatPhone(input.telefone!) : undefined,
    } as any).returning({ id: employees.id });
    if (created) await recalcCompliance(db, [created.id]);
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: input.companyId,
      acao: "criou_colaborador",
      entidade: "employees",
      dadosDepois: { nome: input.nome.trim(), cpf: formatCpf(input.cpf), positionId: input.positionId ?? null, worksiteId: input.worksiteId ?? null },
    });
    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    nome: z.string().min(1).optional(),
    positionId: z.number().optional(),
    worksiteId: z.number().optional(),
    status: z.enum(["ativo", "afastado", "desligado"]).optional(),
    email: z.string().email().optional(),
    telefone: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const employee = await getEmployeeByIdOrThrow(db, input.id);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, employee.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode editar colaboradores.");
    const { id, ...data } = input;
    assertFullName(data.nome);
    if (data.telefone && !isValidPhone(data.telefone)) {
      throw new Error("Informe um telefone válido com DDD.");
    }
    if (data.status && data.status !== employee.status && ctx.user.role !== "platform_admin") {
      throw new Error("Somente o administrador SmartDocPlan pode inativar ou alterar o status do colaborador.");
    }
    const payload = {
      ...data,
      nome: data.nome?.trim(),
      email: data.email !== undefined ? normalizeOptionalText(data.email) ?? null : undefined,
      telefone: data.telefone !== undefined ? (normalizeOptionalText(data.telefone) ? formatPhone(data.telefone) : null) : undefined,
    };
    await db.update(employees).set(payload).where(eq(employees.id, id));
    if (payload.positionId !== undefined) await recalcCompliance(db, [id]);
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: employee.companyId,
      acao: "atualizou_colaborador",
      entidade: "employees",
      entidadeId: employee.id,
      dadosDepois: payload,
    });
    return { success: true };
  }),

  /** Lista paginada por seção (Ativos, Em efetivação, Desligados) com filtros e contagem de cada seção. */
  listPaged: protectedProcedure.input(z.object({
    companyId: z.number(),
    secao: z.enum(["ativos", "efetivacao", "desligados"]),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(12),
    search: z.string().trim().max(120).optional(),
    status: z.enum(["ativo", "afastado"]).optional(),
    liberacao: z.enum(["aguardando_documentacao", "em_analise"]).optional(),
    positionId: z.number().optional(),
    worksiteId: z.number().optional(),
  })).query(async ({ ctx, input }) => {
    const empty = { rows: [] as (typeof employees.$inferSelect)[], total: 0, contagens: { ativos: 0, efetivacao: 0, desligados: 0 } };
    const db = await getDb();
    if (!db) return empty;
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return empty;

    // Mesma regra de shared/employeeSections.ts, em SQL.
    const emEfetivacao = inArray(employees.liberacao, ["aguardando_documentacao", "em_analise"]);
    const secaoWhere = {
      ativos: and(ne(employees.status, "desligado"), sql`NOT (${emEfetivacao})`),
      efetivacao: and(ne(employees.status, "desligado"), emEfetivacao),
      desligados: eq(employees.status, "desligado"),
    };
    const filtros = [eq(employees.companyId, input.companyId)];
    if (input.positionId) filtros.push(eq(employees.positionId, input.positionId));
    if (input.worksiteId) filtros.push(eq(employees.worksiteId, input.worksiteId));
    if (input.search) {
      const termo = `%${input.search.replace(/[%_\\]/g, "\\$&")}%`;
      const digitos = input.search.replace(/\D/g, "");
      filtros.push(or(
        sql`${employees.nome} ILIKE ${termo}`,
        sql`${employees.email} ILIKE ${termo}`,
        sql`${employees.telefone} ILIKE ${termo}`,
        ...(digitos.length >= 3 ? [sql`regexp_replace(${employees.cpf}, '[^0-9]', '', 'g') LIKE ${`%${digitos}%`}`] : []),
      )!);
    }
    const where = [...filtros, secaoWhere[input.secao]];
    if (input.secao === "ativos" && input.status) where.push(eq(employees.status, input.status));
    if (input.secao === "efetivacao" && input.liberacao) where.push(eq(employees.liberacao, input.liberacao));

    const [rows, [{ total }], [contagens]] = await Promise.all([
      db.select().from(employees).where(and(...where)).orderBy(employees.nome)
        .limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ total: sql<number>`count(*)::int` }).from(employees).where(and(...where)),
      // Contagens das abas consideram busca, função e local, mas não os filtros próprios de cada aba.
      db.select({
        ativos: sql<number>`count(*) FILTER (WHERE ${secaoWhere.ativos})::int`,
        efetivacao: sql<number>`count(*) FILTER (WHERE ${secaoWhere.efetivacao})::int`,
        desligados: sql<number>`count(*) FILTER (WHERE ${secaoWhere.desligados})::int`,
      }).from(employees).where(and(...filtros)),
    ]);
    return { rows, total: Number(total ?? 0), contagens };
  }),

  stats: protectedProcedure.input(z.object({ companyId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    const empty = { total: 0, ativos: 0, afastados: 0, desligados: 0, liberados: 0, emAnalise: 0, aguardandoDocumentacao: 0, semRequisitos: 0 };
    if (!db) return empty;
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return empty;
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(employees).where(eq(employees.companyId, input.companyId));
    const [ativos] = await db.select({ count: sql<number>`count(*)` }).from(employees).where(and(eq(employees.companyId, input.companyId), eq(employees.status, "ativo")));
    const [afastados] = await db.select({ count: sql<number>`count(*)` }).from(employees).where(and(eq(employees.companyId, input.companyId), eq(employees.status, "afastado")));
    const [desligados] = await db.select({ count: sql<number>`count(*)` }).from(employees).where(and(eq(employees.companyId, input.companyId), eq(employees.status, "desligado")));
    // Liberação considera só quem não está desligado.
    const liberacaoRows = await db.select({ liberacao: employees.liberacao, count: sql<number>`count(*)::int` })
      .from(employees)
      .where(and(eq(employees.companyId, input.companyId), ne(employees.status, "desligado")))
      .groupBy(employees.liberacao);
    const porLiberacao = Object.fromEntries(liberacaoRows.map((row) => [row.liberacao, Number(row.count)]));
    return {
      total: total?.count ?? 0,
      ativos: ativos?.count ?? 0,
      afastados: afastados?.count ?? 0,
      desligados: desligados?.count ?? 0,
      liberados: porLiberacao.liberado ?? 0,
      emAnalise: porLiberacao.em_analise ?? 0,
      aguardandoDocumentacao: porLiberacao.aguardando_documentacao ?? 0,
      semRequisitos: porLiberacao.sem_requisitos ?? 0,
    };
  }),
});

// â”€â”€â”€ REQUESTS ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const requestsRouter = router({
  list: protectedProcedure.input(z.object({
    companyId: z.number(),
    status: z.enum(["nova","em_analise","aguardando_correcao","aguardando_documentos","aprovado","concluido","rejeitado"]).optional(),
    tipo: z.enum(["admissao","demissao","mudanca_funcao","afastamento","atestado_medico","outros"]).optional(),
    employeeId: z.number().optional(),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    // companyId = 0 significa "todas" — apenas para platform users
    if (input.companyId === 0) {
      if (!isPlatformUser(ctx.user.role)) return [];
      const conditions = [];
      if (!canAccessHealthData(ctx.user.role)) conditions.push(sql`${requests.tipo} NOT IN ('atestado_medico', 'afastamento')`);
      if (input.status) conditions.push(eq(requests.status, input.status));
      if (input.tipo) conditions.push(eq(requests.tipo, input.tipo));
      if (input.employeeId) conditions.push(eq(requests.employeeId, input.employeeId));
      return db.select().from(requests).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(requests.createdAt));
    }
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return [];
    const conditions = [eq(requests.companyId, input.companyId)] as any[];
    if (!canAccessHealthData(ctx.user.role)) conditions.push(sql`${requests.tipo} NOT IN ('atestado_medico', 'afastamento')`);
    if (input.status) conditions.push(eq(requests.status, input.status));
    if (input.tipo) conditions.push(eq(requests.tipo, input.tipo));
    if (input.employeeId) conditions.push(eq(requests.employeeId, input.employeeId));
    return db.select().from(requests).where(and(...conditions)).orderBy(desc(requests.createdAt));
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(requests).where(eq(requests.id, input.id)).limit(1);
    const req = result[0];
    if (!req) return null;
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, req.companyId)) return null;
    if (isHealthCategory(req.tipo) && !canAccessHealthData(ctx.user.role)) return null;
    return req;
  }),

  create: protectedProcedure.input(requestCreationInput).mutation(async ({ ctx, input }) => {
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    assertAccess(canCreateRequests(ctx.user.role), "Seu perfil não pode abrir solicitações.");
    assertAccess(!isHealthCategory(input.tipo) || canAccessHealthData(ctx.user.role), "Acesso a dados de saúde restrito ao Administrador Geral e RH.");
    return createRequestWithRequirements(input, ctx.user.id);
  }),

  updateStatus: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["nova","em_analise","aguardando_correcao","aguardando_documentos","aprovado","concluido","rejeitado"]),
    observacoes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const request = await getRequestByIdOrThrow(db, input.id);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, request.companyId), "Acesso negado");
    assertAccess(!isHealthCategory(request.tipo) || canAccessHealthData(ctx.user.role), "Acesso a dados de saúde restrito ao Administrador Geral e RH.");
    assertAccess(canManageRequestWorkflow(ctx.user.role), "Seu perfil não pode alterar o status da solicitação.");
    assertAccess(
      canTransitionRequest(request.status, input.status),
      `Não é possível mover de "${REQUEST_STATUS_LABELS[request.status as RequestStatus] ?? request.status}" para "${REQUEST_STATUS_LABELS[input.status]}".`
    );
    assertAccess(
      input.status !== "rejeitado" || request.status === "rejeitado" || !!input.observacoes?.trim(),
      "Informe o motivo da rejeição."
    );
    const updateData: Record<string, unknown> = { status: input.status };
    if (input.observacoes) updateData.observacoes = input.observacoes;
    if (input.status === "concluido") updateData.concluidoAt = new Date();
    await db.update(requests).set(updateData).where(eq(requests.id, input.id));
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: request.companyId,
      acao: "atualizou_status_solicitacao",
      entidade: "requests",
      entidadeId: request.id,
      dadosDepois: { status: input.status, observacoes: input.observacoes ?? null },
    });
    return { success: true };
  }),

  stats: protectedProcedure.input(z.object({ companyId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { total: 0, novas: 0, emAnalise: 0, concluidas: 0, rejeitadas: 0 };
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return { total: 0, novas: 0, emAnalise: 0, concluidas: 0, rejeitadas: 0 };
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(requests).where(eq(requests.companyId, input.companyId));
    const [novas] = await db.select({ count: sql<number>`count(*)` }).from(requests).where(and(eq(requests.companyId, input.companyId), eq(requests.status, "nova")));
    const [emAnalise] = await db.select({ count: sql<number>`count(*)` }).from(requests).where(and(eq(requests.companyId, input.companyId), eq(requests.status, "em_analise")));
    const [concluidas] = await db.select({ count: sql<number>`count(*)` }).from(requests).where(and(eq(requests.companyId, input.companyId), eq(requests.status, "concluido")));
    const [rejeitadas] = await db.select({ count: sql<number>`count(*)` }).from(requests).where(and(eq(requests.companyId, input.companyId), eq(requests.status, "rejeitado")));
    return {
      total: total?.count ?? 0,
      novas: novas?.count ?? 0,
      emAnalise: emAnalise?.count ?? 0,
      concluidas: concluidas?.count ?? 0,
      rejeitadas: rejeitadas?.count ?? 0,
    };
  }),

  // Stats globais para admin da plataforma
  globalStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, novas: 0, concluidas: 0 };
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(requests);
    const [novas] = await db.select({ count: sql<number>`count(*)` }).from(requests).where(eq(requests.status, "nova"));
    const [concluidas] = await db.select({ count: sql<number>`count(*)` }).from(requests).where(eq(requests.status, "concluido"));
    return { total: total?.count ?? 0, novas: novas?.count ?? 0, concluidas: concluidas?.count ?? 0 };
  }),
});

// â”€â”€â”€ TICKETS ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ticketsRouter = router({
  list: protectedProcedure.input(z.object({
    companyId: z.number().optional(),
    status: z.enum(["aberto","em_atendimento","aguardando_cliente","resolvido","fechado"]).optional(),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [];
    if (input.companyId) {
      if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return [];
      conditions.push(eq(tickets.companyId, input.companyId));
    } else if (!isPlatformUser(ctx.user.role)) {
      if (!ctx.user.companyId) return [];
      conditions.push(eq(tickets.companyId, ctx.user.companyId));
    }
    if (input.status) conditions.push(eq(tickets.status, input.status));
    const rows = await db.select().from(tickets).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(tickets.createdAt));
    if (!rows.length) return [];
    // Resumo da conversa de cada chamado para os cards (total e origem da última mensagem).
    const resumo = await db.select({
      ticketId: ticketMessages.ticketId,
      total: sql<number>`count(*)::int`,
      ultimaOrigem: sql<string | null>`(array_agg(${ticketMessages.origem} ORDER BY ${ticketMessages.createdAt} DESC, ${ticketMessages.id} DESC))[1]`,
      ultimaMensagemEm: sql<Date | null>`max(${ticketMessages.createdAt})`,
    }).from(ticketMessages)
      .where(inArray(ticketMessages.ticketId, rows.map(row => row.id)))
      .groupBy(ticketMessages.ticketId);
    const porChamado = new Map(resumo.map(item => [item.ticketId, item]));
    return rows.map(row => ({
      ...row,
      totalMensagens: Number(porChamado.get(row.id)?.total ?? 0),
      ultimaOrigem: porChamado.get(row.id)?.ultimaOrigem ?? null,
      ultimaMensagemEm: porChamado.get(row.id)?.ultimaMensagemEm ?? null,
    }));
  }),

  messages: protectedProcedure.input(z.object({ ticketId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const ticket = await getTicketByIdOrThrow(db, input.ticketId);
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, ticket.companyId)) return [];
    return db.select({
      id: ticketMessages.id,
      origem: ticketMessages.origem,
      mensagem: ticketMessages.mensagem,
      statusAnterior: ticketMessages.statusAnterior,
      statusNovo: ticketMessages.statusNovo,
      createdAt: ticketMessages.createdAt,
      autorNome: users.name,
    }).from(ticketMessages)
      .leftJoin(users, eq(users.id, ticketMessages.autorId))
      .where(eq(ticketMessages.ticketId, ticket.id))
      .orderBy(ticketMessages.createdAt, ticketMessages.id);
  }),

  reply: protectedProcedure.input(z.object({
    ticketId: z.number(),
    mensagem: z.string().trim().min(1, "Escreva a mensagem.").max(5000),
  })).mutation(async ({ ctx, input }) => {
    const isPlatform = canManageRequestWorkflow(ctx.user.role);
    assertAccess(isPlatform || canCreateTickets(ctx.user.role), "Seu perfil não pode responder chamados.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const ticket = await getTicketByIdOrThrow(db, input.ticketId);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, ticket.companyId), "Acesso negado");
    assertAccess(isPlatform || ctx.user.companyId === ticket.companyId, "Acesso negado");
    assertAccess(ticket.status !== "fechado", "Este chamado está fechado e não aceita novas mensagens.");

    // Resposta da empresa a um chamado aguardando retorno devolve o atendimento para a equipe.
    const novoStatus = !isPlatform && ticket.status === "aguardando_cliente" ? "em_atendimento" : null;
    await db.insert(ticketMessages).values({
      ticketId: ticket.id,
      companyId: ticket.companyId,
      autorId: ctx.user.id,
      origem: isPlatform ? "plataforma" : "empresa",
      mensagem: input.mensagem,
      statusAnterior: novoStatus ? ticket.status : null,
      statusNovo: novoStatus,
    });
    await db.update(tickets).set({ ...(novoStatus ? { status: novoStatus } : {}), updatedAt: new Date() }).where(eq(tickets.id, ticket.id));
    await notifyTicketMessage(db, ticket, isPlatform, ctx.user.name);
    await insertAuditLog({ userId: ctx.user.id, companyId: ticket.companyId, acao: "respondeu_chamado", entidade: "tickets", entidadeId: ticket.id, dadosDepois: { origem: isPlatform ? "plataforma" : "empresa", novoStatus } });
    return { success: true, status: novoStatus ?? ticket.status };
  }),

  create: protectedProcedure.input(z.object({
    companyId: z.number(),
    tipo: z.enum(["criacao_usuario","bloqueio_usuario","alteracao_acesso","suporte_tecnico","duvida","outros"]),
    titulo: z.string().min(1),
    descricao: z.string().optional(),
    prioridade: z.enum(["baixa","media","alta","urgente"]).default("media"),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    assertAccess(canCreateTickets(ctx.user.role), "Seu perfil não pode abrir chamados.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    await db.insert(tickets).values({ ...input, criadoPor: ctx.user.id });
    await insertAuditLog({ userId: ctx.user.id, companyId: input.companyId, acao: "criou_chamado", entidade: "tickets", dadosDepois: { tipo: input.tipo, titulo: input.titulo } });
    return { success: true };
  }),

  updateStatus: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["aberto","em_atendimento","aguardando_cliente","resolvido","fechado"]),
    mensagem: z.string().trim().max(5000).optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canManageRequestWorkflow(ctx.user.role), "Seu perfil não pode alterar o status do chamado.");
    const mensagem = input.mensagem?.trim() || null;
    const encerrando = input.status === "resolvido" || input.status === "fechado";
    assertAccess(!encerrando || !!mensagem, "Escreva a resposta para a empresa antes de resolver ou fechar o chamado.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const ticket = await getTicketByIdOrThrow(db, input.id);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, ticket.companyId), "Acesso negado");
    const mudouStatus = ticket.status !== input.status;
    if (!mudouStatus && !mensagem) return { success: true };
    const updateData: Record<string, unknown> = { status: input.status, updatedAt: new Date() };
    if (mudouStatus && encerrando) updateData.resolvidoAt = new Date();
    if (!ticket.responsavelId) updateData.responsavelId = ctx.user.id;
    await db.update(tickets).set(updateData).where(eq(tickets.id, input.id));
    await db.insert(ticketMessages).values({
      ticketId: ticket.id,
      companyId: ticket.companyId,
      autorId: ctx.user.id,
      origem: "plataforma",
      mensagem: mensagem ?? "",
      statusAnterior: mudouStatus ? ticket.status : null,
      statusNovo: mudouStatus ? input.status : null,
    });
    await notifyTicketMessage(db, ticket, true, ctx.user.name, mudouStatus ? input.status : null);
    await insertAuditLog({ userId: ctx.user.id, companyId: ticket.companyId, acao: mensagem && !mudouStatus ? "respondeu_chamado" : "atualizou_status_chamado", entidade: "tickets", entidadeId: ticket.id, dadosDepois: { status: input.status, comResposta: !!mensagem } });
    return { success: true };
  }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, abertos: 0, emAtendimento: 0, resolvidos: 0 };
    const conditions = isPlatformUser(ctx.user.role) ? [] : ctx.user.companyId ? [eq(tickets.companyId, ctx.user.companyId)] : [];
    const whereClause = conditions.length ? and(...conditions) : undefined;
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(tickets).where(whereClause);
    const [abertos] = await db.select({ count: sql<number>`count(*)` }).from(tickets).where(conditions.length ? and(...conditions, eq(tickets.status, "aberto")) : eq(tickets.status, "aberto"));
    const [emAtendimento] = await db.select({ count: sql<number>`count(*)` }).from(tickets).where(conditions.length ? and(...conditions, eq(tickets.status, "em_atendimento")) : eq(tickets.status, "em_atendimento"));
    const [resolvidos] = await db.select({ count: sql<number>`count(*)` }).from(tickets).where(conditions.length ? and(...conditions, eq(tickets.status, "resolvido")) : eq(tickets.status, "resolvido"));
    return {
      total: total?.count ?? 0,
      abertos: abertos?.count ?? 0,
      emAtendimento: emAtendimento?.count ?? 0,
      resolvidos: resolvidos?.count ?? 0,
    };
  }),
});

// â”€â”€â”€ POSITIONS ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const positionsRouter = router({
  list: protectedProcedure.input(z.object({ companyId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return [];
    return db.select().from(positions).where(eq(positions.companyId, input.companyId)).orderBy(positions.nome);
  }),

  create: protectedProcedure.input(z.object({
    companyId: z.number(),
    nome: z.string().min(1),
    descricao: z.string().optional(),
    cbo: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode cadastrar cargos.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    await db.insert(positions).values({
      ...input,
      nome: input.nome.trim(),
      descricao: normalizeOptionalText(input.descricao) ?? undefined,
      cbo: normalizeOptionalText(input.cbo) ?? undefined,
    });
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: input.companyId,
      acao: "criou_funcao",
      entidade: "positions",
      dadosDepois: { nome: input.nome, cbo: input.cbo ?? null },
    });
    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    nome: z.string().min(1),
    descricao: z.string().optional(),
    cbo: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const position = await getPositionByIdOrThrow(db, input.id);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, position.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode editar cargos.");

    const payload = {
      nome: input.nome.trim(),
      descricao: normalizeOptionalText(input.descricao) ?? null,
      cbo: normalizeOptionalText(input.cbo) ?? null,
    };

    await db.update(positions).set(payload).where(eq(positions.id, input.id));
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: position.companyId,
      acao: "atualizou_funcao",
      entidade: "positions",
      entidadeId: position.id,
      dadosDepois: payload,
    });
    return { success: true };
  }),
});

// â”€â”€â”€ WORKSITES ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const worksitesRouter = router({
  list: protectedProcedure.input(z.object({ companyId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return [];
    return db.select().from(worksites).where(eq(worksites.companyId, input.companyId)).orderBy(worksites.nome);
  }),

  create: protectedProcedure.input(z.object({
    companyId: z.number(),
    nome: z.string().min(1),
    cnos: z.string().optional(),
    ...addressInput,
    dataInicio: z.string().optional(),
    dataFim: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode cadastrar frentes de trabalho.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    if (input.dataInicio && input.dataFim && input.dataFim < input.dataInicio) throw new Error("A data final deve ser posterior à inicial.");
    await db.insert(worksites).values({
      ...input,
      ...addressForDb(input),
      dataInicio: input.dataInicio || undefined,
      dataFim: input.dataFim || undefined,
    });
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: input.companyId,
      acao: "criou_frente_local",
      entidade: "worksites",
      dadosDepois: { nome: input.nome, cidade: input.cidade ?? null, estado: input.estado ?? null },
    });
    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    nome: z.string().min(1),
    cnos: z.string().optional(),
    ...addressInput,
    dataInicio: z.string().optional(),
    dataFim: z.string().optional(),
    status: z.enum(["ativo", "concluido", "cancelado"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const result = await db.select().from(worksites).where(eq(worksites.id, input.id)).limit(1);
    const worksite = result[0];
    if (!worksite) throw new Error("Frente / local não encontrado");
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, worksite.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode editar frentes de trabalho.");

    const payload = {
      nome: input.nome.trim(),
      cnos: normalizeOptionalText(input.cnos) ?? null,
      ...addressForDb(input),
      dataInicio: input.dataInicio || null,
      dataFim: input.dataFim || null,
      status: input.status ?? worksite.status,
    };

    if (input.dataInicio && input.dataFim && input.dataFim < input.dataInicio) throw new Error("A data final deve ser posterior à inicial.");
    await db.update(worksites).set(payload).where(eq(worksites.id, input.id));
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: worksite.companyId,
      acao: "atualizou_frente_local",
      entidade: "worksites",
      entidadeId: worksite.id,
      dadosDepois: payload,
    });
    return { success: true };
  }),
});

const positionRequirementsRouter = router({
  listByPosition: protectedProcedure.input(z.object({ positionId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const position = await getPositionByIdOrThrow(db, input.positionId);
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, position.companyId)) return [];

    return db
      .select({
        id: positionRequirements.id,
        positionId: positionRequirements.positionId,
        legalRequirementId: positionRequirements.legalRequirementId,
        categoria: positionRequirements.categoria,
        tipoSolicitacao: positionRequirements.tipoSolicitacao,
        documentoNome: positionRequirements.documentoNome,
        descricao: positionRequirements.descricao,
        obrigatorio: positionRequirements.obrigatorio,
        validadeMeses: positionRequirements.validadeMeses,
        ordem: positionRequirements.ordem,
        ativo: positionRequirements.ativo,
        createdAt: positionRequirements.createdAt,
        updatedAt: positionRequirements.updatedAt,
        norma: legalRequirements.norma,
        requisitoLegal: legalRequirements.requisito,
      })
      .from(positionRequirements)
      .leftJoin(legalRequirements, eq(positionRequirements.legalRequirementId, legalRequirements.id))
      .where(and(eq(positionRequirements.positionId, input.positionId), eq(positionRequirements.ativo, true)))
      .orderBy(positionRequirements.ordem, positionRequirements.documentoNome);
  }),

  listByContext: protectedProcedure.input(z.object({
    companyId: z.number(),
    positionId: z.number(),
    tipoSolicitacao: z.enum(["admissao", "demissao", "mudanca_funcao", "afastamento", "atestado_medico", "outros"]),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const position = await getPositionByIdOrThrow(db, input.positionId);
    if (position.companyId !== input.companyId) return [];
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return [];

    const allowedTypes =
      input.tipoSolicitacao === "admissao" || input.tipoSolicitacao === "demissao" || input.tipoSolicitacao === "mudanca_funcao"
        ? [input.tipoSolicitacao, "todos"]
        : ["todos"];

    return db
      .select({
        id: positionRequirements.id,
        positionId: positionRequirements.positionId,
        legalRequirementId: positionRequirements.legalRequirementId,
        categoria: positionRequirements.categoria,
        tipoSolicitacao: positionRequirements.tipoSolicitacao,
        documentoNome: positionRequirements.documentoNome,
        descricao: positionRequirements.descricao,
        obrigatorio: positionRequirements.obrigatorio,
        validadeMeses: positionRequirements.validadeMeses,
        ordem: positionRequirements.ordem,
        ativo: positionRequirements.ativo,
        createdAt: positionRequirements.createdAt,
        updatedAt: positionRequirements.updatedAt,
        norma: legalRequirements.norma,
        requisitoLegal: legalRequirements.requisito,
      })
      .from(positionRequirements)
      .leftJoin(legalRequirements, eq(positionRequirements.legalRequirementId, legalRequirements.id))
      .where(
        and(
          eq(positionRequirements.positionId, input.positionId),
          eq(positionRequirements.ativo, true),
          or(
            eq(positionRequirements.tipoSolicitacao, allowedTypes[0] as "admissao" | "demissao" | "mudanca_funcao" | "todos"),
            allowedTypes[1]
              ? eq(positionRequirements.tipoSolicitacao, allowedTypes[1] as "todos")
              : eq(positionRequirements.tipoSolicitacao, "todos")
          )
        )
      )
      .orderBy(positionRequirements.ordem, positionRequirements.documentoNome);
  }),

  create: protectedProcedure.input(z.object({
    positionId: z.number(),
    legalRequirementId: z.number().optional(),
    categoria: z.enum(["treinamento", "exame_medico", "psicossocial", "outros"]).default("treinamento"),
    tipoSolicitacao: z.enum(["admissao", "demissao", "mudanca_funcao", "todos"]).default("todos"),
    documentoNome: z.string().min(1),
    descricao: z.string().optional(),
    obrigatorio: z.boolean().default(true),
    validadeMeses: z.number().optional(),
    ordem: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const position = await getPositionByIdOrThrow(db, input.positionId);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, position.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode editar requisitos por função.");

    if (input.legalRequirementId) {
      const legalResult = await db.select().from(legalRequirements).where(eq(legalRequirements.id, input.legalRequirementId)).limit(1);
      const legalRequirement = legalResult[0];
      if (!legalRequirement || legalRequirement.companyId !== position.companyId) {
        throw new Error("O requisito legal informado não pertence à mesma empresa.");
      }
    }

    await db.insert(positionRequirements).values({
      positionId: input.positionId,
      legalRequirementId: input.legalRequirementId ?? null,
      categoria: input.categoria,
      tipoSolicitacao: input.tipoSolicitacao,
      documentoNome: input.documentoNome.trim(),
      descricao: normalizeOptionalText(input.descricao) ?? undefined,
      obrigatorio: input.obrigatorio,
      validadeMeses: input.validadeMeses ?? null,
      ordem: input.ordem ?? 0,
    } as any);

    await insertAuditLog({
      userId: ctx.user.id,
      companyId: position.companyId,
      acao: "criou_requisito_funcao",
      entidade: "position_requirements",
      dadosDepois: {
        positionId: input.positionId,
        categoria: input.categoria,
        tipoSolicitacao: input.tipoSolicitacao,
        documentoNome: input.documentoNome,
      },
    });
    await recalcComplianceForPositions(db, [input.positionId]);
    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    legalRequirementId: z.number().optional(),
    categoria: z.enum(["treinamento", "exame_medico", "psicossocial", "outros"]),
    tipoSolicitacao: z.enum(["admissao", "demissao", "mudanca_funcao", "todos"]),
    documentoNome: z.string().min(1),
    descricao: z.string().optional(),
    obrigatorio: z.boolean(),
    validadeMeses: z.number().optional(),
    ordem: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const result = await db.select().from(positionRequirements).where(eq(positionRequirements.id, input.id)).limit(1);
    const requirement = result[0];
    if (!requirement) throw new Error("Requisito da função não encontrado");
    const position = await getPositionByIdOrThrow(db, requirement.positionId);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, position.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode editar requisitos por função.");

    if (input.legalRequirementId) {
      const legalResult = await db.select().from(legalRequirements).where(eq(legalRequirements.id, input.legalRequirementId)).limit(1);
      const legalRequirement = legalResult[0];
      if (!legalRequirement || legalRequirement.companyId !== position.companyId) {
        throw new Error("O requisito legal informado não pertence à mesma empresa.");
      }
    }

    const payload = {
      legalRequirementId: input.legalRequirementId ?? null,
      categoria: input.categoria,
      tipoSolicitacao: input.tipoSolicitacao,
      documentoNome: input.documentoNome.trim(),
      descricao: normalizeOptionalText(input.descricao) ?? null,
      obrigatorio: input.obrigatorio,
      validadeMeses: input.validadeMeses ?? null,
      ordem: input.ordem ?? 0,
    };

    await db.update(positionRequirements).set(payload).where(eq(positionRequirements.id, input.id));
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: position.companyId,
      acao: "atualizou_requisito_funcao",
      entidade: "position_requirements",
      entidadeId: requirement.id,
      dadosDepois: payload,
    });
    await recalcComplianceForPositions(db, [requirement.positionId]);
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const result = await db.select().from(positionRequirements).where(eq(positionRequirements.id, input.id)).limit(1);
    const requirement = result[0];
    if (!requirement) throw new Error("Requisito da função não encontrado");
    const position = await getPositionByIdOrThrow(db, requirement.positionId);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, position.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode editar requisitos por função.");

    await db.update(positionRequirements).set({ ativo: false }).where(eq(positionRequirements.id, input.id));
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: position.companyId,
      acao: "removeu_requisito_funcao",
      entidade: "position_requirements",
      entidadeId: requirement.id,
      dadosDepois: { documentoNome: requirement.documentoNome, categoria: requirement.categoria },
    });
    await recalcComplianceForPositions(db, [requirement.positionId]);
    return { success: true };
  }),
});

// â”€â”€â”€ LEGAL REQUIREMENTS ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const legalReqRouter = router({
  // Lista requisitos legais por empresa
  list: protectedProcedure.input(z.object({ companyId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return [];
    return db.select().from(legalRequirements)
      .where(and(eq(legalRequirements.companyId, input.companyId), eq(legalRequirements.ativo, true)))
      .orderBy(legalRequirements.norma);
  }),

  create: protectedProcedure.input(z.object({
    companyId: z.number(),
    norma: z.string().min(1),
    requisito: z.string().min(1),
    documentoExigido: z.string().min(1),
    validadeMeses: z.number().optional(),
    descricao: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode editar a matriz legal.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    await db.insert(legalRequirements).values({
      ...input,
      norma: input.norma.trim(),
      requisito: input.requisito.trim(),
      documentoExigido: input.documentoExigido.trim(),
      descricao: normalizeOptionalText(input.descricao) ?? undefined,
    });
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: input.companyId,
      acao: "criou_requisito_legal",
      entidade: "legal_requirements",
      dadosDepois: { norma: input.norma, requisito: input.requisito, documentoExigido: input.documentoExigido },
    });
    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    norma: z.string().min(1),
    requisito: z.string().min(1),
    documentoExigido: z.string().min(1),
    validadeMeses: z.number().optional(),
    descricao: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const result = await db.select().from(legalRequirements).where(eq(legalRequirements.id, input.id)).limit(1);
    const requirement = result[0];
    if (!requirement) throw new Error("Requisito legal não encontrado");
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, requirement.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode editar a matriz legal.");

    const payload = {
      norma: input.norma.trim(),
      requisito: input.requisito.trim(),
      documentoExigido: input.documentoExigido.trim(),
      validadeMeses: input.validadeMeses ?? null,
      descricao: normalizeOptionalText(input.descricao) ?? null,
    };

    await db.update(legalRequirements).set(payload).where(eq(legalRequirements.id, input.id));
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: requirement.companyId,
      acao: "atualizou_requisito_legal",
      entidade: "legal_requirements",
      entidadeId: requirement.id,
      dadosDepois: payload,
    });
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const result = await db.select().from(legalRequirements).where(eq(legalRequirements.id, input.id)).limit(1);
    const requirement = result[0];
    if (!requirement) throw new Error("Requisito legal não encontrado");
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, requirement.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode editar a matriz legal.");
    await db.update(legalRequirements).set({ ativo: false }).where(eq(legalRequirements.id, input.id));
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: requirement.companyId,
      acao: "removeu_requisito_legal",
      entidade: "legal_requirements",
      entidadeId: requirement.id,
      dadosDepois: { norma: requirement.norma, requisito: requirement.requisito },
    });
    return { success: true };
  }),
});

// â”€â”€â”€ AUDIT ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const auditRouter = router({
  list: adminProcedure.input(z.object({
    companyId: z.number().optional(),
    userId: z.number().optional(),
    acao: z.string().optional(),
    dataInicio: z.iso.date().optional(),
    dataFim: z.iso.date().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(50),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { rows: [], total: 0 };
    const conditions: any[] = [];
    if (input.companyId) conditions.push(eq(auditLogs.companyId, input.companyId));
    if (input.userId) conditions.push(eq(auditLogs.userId, input.userId));
    if (input.acao) conditions.push(eq(auditLogs.action, input.acao));
    if (input.dataInicio) conditions.push(sql`${auditLogs.createdAt} >= ${input.dataInicio}::date`);
    if (input.dataFim) conditions.push(sql`${auditLogs.createdAt} < (${input.dataFim}::date + interval '1 day')`);
    const where = conditions.length ? and(...conditions) : undefined;

    // Obra afetada: vem do colaborador (direto ou via documento) ou da solicitação.
    const docAlvo = alias(employeeDocuments, "audit_doc");
    const colaboradorAlvo = alias(employees, "audit_employee");
    const solicitacaoAlvo = alias(requests, "audit_request");
    const obraColaborador = alias(worksites, "audit_worksite_employee");
    const obraSolicitacao = alias(worksites, "audit_worksite_request");

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        usuarioNome: users.name,
        usuarioEmail: users.email,
        usuarioPapel: users.role,
        companyId: auditLogs.companyId,
        empresaNome: sql<string | null>`coalesce(${companies.nomeFantasia}, ${companies.razaoSocial})`,
        obraNome: sql<string | null>`coalesce(${obraColaborador.nome}, ${obraSolicitacao.nome})`,
        obrasUsuario: sql<string | null>`(select string_agg(w.nome, ', ' order by w.nome) from smartdocplan.user_worksites uw join smartdocplan.worksites w on w.id = uw."worksiteId" where uw."userId" = ${auditLogs.userId})`,
        acao: auditLogs.action,
        entidade: auditLogs.entity,
        entidadeId: auditLogs.entityId,
        dadosDepois: auditLogs.details,
        ip: auditLogs.ip,
        navegador: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
      }).from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.userId))
        .leftJoin(companies, eq(companies.id, auditLogs.companyId))
        .leftJoin(docAlvo, and(eq(auditLogs.entity, "employee_documents"), eq(docAlvo.id, auditLogs.entityId)))
        .leftJoin(colaboradorAlvo, or(
          and(eq(auditLogs.entity, "employees"), eq(colaboradorAlvo.id, auditLogs.entityId)),
          eq(colaboradorAlvo.id, docAlvo.employeeId),
        ))
        .leftJoin(obraColaborador, eq(obraColaborador.id, colaboradorAlvo.worksiteId))
        .leftJoin(solicitacaoAlvo, and(eq(auditLogs.entity, "requests"), eq(solicitacaoAlvo.id, auditLogs.entityId)))
        .leftJoin(obraSolicitacao, eq(obraSolicitacao.id, solicitacaoAlvo.worksiteId))
        .where(where)
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      db.select({ total: sql<number>`count(*)::int` }).from(auditLogs).where(where),
    ]);
    // Raw document/request payloads may contain health information from older events.
    const canSeeHealth = canAccessHealthData(ctx.user.role);
    // IP e navegador são dados pessoais: só o Administrador Geral vê.
    const canSeeClient = canManagePlatformSettings(ctx.user.role);
    const visibleRows = rows
      .map(row => (canSeeClient ? row : { ...row, ip: null, navegador: null }))
      .map(row =>
        !canSeeHealth && row.dadosDepois && ["requests", "request_document_uploads", "employee_documents", "documento"].includes(row.entidade ?? "")
          ? { ...row, dadosDepois: null, detalhesOcultos: true }
          : { ...row, detalhesOcultos: false }
      );
    return { rows: visibleRows, total: Number(total ?? 0) };
  }),

  actions: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.selectDistinct({ acao: auditLogs.action }).from(auditLogs).orderBy(auditLogs.action);
    return rows.map(row => row.acao);
  }),
});

// USERS ROUTER (gestão de usuários das empresas)
const usersRouter = router({
  create: superAdminProcedure.input(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["platform_admin","platform_analyst","platform_auditor","company_admin","company_hr","company_manager","company_viewer"]),
    companyId: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    // Verificar se email ja existe
    const existing = await getUserByEmail(input.email);
    if (existing) throw new Error("E-mail já cadastrado.");
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash(input.password, 12);
    await createLocalUser({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      companyId: input.companyId ?? null,
    });
    await insertAuditLog({ userId: ctx.user.id, companyId: input.companyId ?? null, acao: 'criou_usuario', entidade: 'users', dadosDepois: { email: input.email, role: input.role } });
    return { success: true };
  }),

  toggleAtivo: superAdminProcedure.input(z.object({
    userId: z.number(),
    ativo: z.boolean(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    await db.update(users).set({ ativo: input.ativo }).where(eq(users.id, input.userId));
    await insertAuditLog({ userId: ctx.user.id, acao: input.ativo ? 'ativou_usuario' : 'desativou_usuario', entidade: 'users', entidadeId: input.userId });
    return { success: true };
  }),

  resetPassword: superAdminProcedure.input(z.object({
    userId: z.number(),
    newPassword: z.string().min(6),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash(input.newPassword, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, input.userId));
    return { success: true };
  }),

  list: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      id: users.id, name: users.name, email: users.email,
      role: users.role, companyId: users.companyId, createdAt: users.createdAt,
      ativo: users.ativo,
    }).from(users).orderBy(desc(users.createdAt));
    const vinculos = await db.select({ userId: userWorksites.userId, worksiteId: worksites.id, nome: worksites.nome })
      .from(userWorksites)
      .innerJoin(worksites, eq(worksites.id, userWorksites.worksiteId))
      .orderBy(worksites.nome);
    return rows.map(row => ({
      ...row,
      obras: vinculos.filter(v => v.userId === row.id).map(v => ({ id: v.worksiteId, nome: v.nome })),
    }));
  }),

  setWorksites: superAdminProcedure.input(z.object({
    userId: z.number(),
    worksiteIds: z.array(z.number()).max(200),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const [alvo] = await db.select({ id: users.id, companyId: users.companyId }).from(users).where(eq(users.id, input.userId)).limit(1);
    if (!alvo) throw new Error("Usuário não encontrado.");
    const ids = Array.from(new Set(input.worksiteIds));
    assertAccess(!!alvo.companyId || ids.length === 0, "Usuários da plataforma não são vinculados a obras.");
    if (ids.length) {
      const validas = await db.select({ id: worksites.id }).from(worksites)
        .where(and(inArray(worksites.id, ids), eq(worksites.companyId, alvo.companyId!)));
      assertAccess(validas.length === ids.length, "Todas as obras precisam pertencer à empresa do usuário.");
    }
    await db.transaction(async (tx) => {
      await tx.delete(userWorksites).where(eq(userWorksites.userId, alvo.id));
      if (ids.length) await tx.insert(userWorksites).values(ids.map(worksiteId => ({ userId: alvo.id, worksiteId })));
    });
    await insertAuditLog({ userId: ctx.user.id, companyId: alvo.companyId, acao: "vinculou_obras_usuario", entidade: "users", entidadeId: alvo.id, dadosDepois: { obras: ids } });
    return { success: true };
  }),

  listByCompany: superAdminProcedure.input(z.object({ companyId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: users.id, name: users.name, email: users.email,
      role: users.role, companyId: users.companyId, createdAt: users.createdAt,
      ativo: users.ativo,
    }).from(users).where(eq(users.companyId, input.companyId));
  }),

  updateRole: superAdminProcedure.input(z.object({
    userId: z.number(),
    role: z.enum(["platform_admin","platform_analyst","platform_auditor","company_admin","company_hr","company_manager","company_viewer"]),
    companyId: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    await db.update(users).set({ role: input.role, companyId: input.companyId ?? null }).where(eq(users.id, input.userId));
    return { success: true };
  }),
});

// â”€â”€â”€ EMPLOYEE DOCUMENTS ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Documento recorrente: tipo e período (competência) vêm juntos, o tipo é ativo, da empresa e do alvo certo,
 * a competência não é futura e ainda não existe documento para ela. Retorna true quando é mensal.
 */
async function assertRecurringUpload(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  opts: { recurringTypeId?: number; competencia?: string; companyId: number; alvo: "colaborador" | "empresa"; employeeId?: number }
) {
  if (!opts.recurringTypeId && !opts.competencia) return false;
  if (!opts.recurringTypeId || !opts.competencia) throw new Error("Informe o tipo e o período do documento recorrente.");
  const [tipo] = await db.select().from(recurringDocumentTypes).where(eq(recurringDocumentTypes.id, opts.recurringTypeId)).limit(1);
  assertAccess(!!tipo && tipo.ativo && tipo.companyId === opts.companyId && tipo.alvo === opts.alvo, "Tipo de documento recorrente inválido para esta empresa.");
  const periodicidade = asPeriodicidade(tipo.periodicidade);
  if (!isPeriodAllowed(opts.competencia, periodicidade, brazilToday())) throw new Error("Período inválido: use um período já iniciado deste documento.");
  const existing = opts.alvo === "colaborador"
    ? await db.select({ id: employeeDocuments.id }).from(employeeDocuments).where(and(
        eq(employeeDocuments.employeeId, opts.employeeId!), eq(employeeDocuments.recurringTypeId, opts.recurringTypeId),
        eq(employeeDocuments.competencia, opts.competencia), ne(employeeDocuments.status, "excluido"))).limit(1)
    : await db.select({ id: companyDocuments.id }).from(companyDocuments).where(and(
        eq(companyDocuments.companyId, opts.companyId), eq(companyDocuments.recurringTypeId, opts.recurringTypeId),
        eq(companyDocuments.competencia, opts.competencia))).limit(1);
  if (existing.length) throw new Error(`Já existe ${tipo.nome} do período ${formatPeriod(opts.competencia, periodicidade)}. Use "Editar" para substituir o arquivo.`);
  return true;
}

// Categorias permitidas para documentos recorrentes (sem dados de saúde).
const RECURRING_CATEGORIES = ["pessoal", "contratual", "treinamento", "outros"] as const;

const recurringDocsRouter = router({
  list: protectedProcedure.input(z.object({ companyId: z.number(), incluirInativos: z.boolean().optional() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return [];
    const conditions = [eq(recurringDocumentTypes.companyId, input.companyId)];
    if (!input.incluirInativos) conditions.push(eq(recurringDocumentTypes.ativo, true));
    return db.select().from(recurringDocumentTypes).where(and(...conditions)).orderBy(recurringDocumentTypes.alvo, recurringDocumentTypes.nome);
  }),

  create: protectedProcedure.input(z.object({
    companyId: z.number(),
    nome: z.string().trim().min(2, "Informe o nome do documento.").max(255),
    alvo: z.enum(["colaborador", "empresa"]),
    categoria: z.enum(RECURRING_CATEGORIES).default("outros"),
    periodicidade: z.enum(PERIODICIDADES).default("mensal"),
    prazoDias: z.number().int().min(0, "O prazo vai de 0 a 90 dias.").max(90, "O prazo vai de 0 a 90 dias."),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode configurar documentos recorrentes.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const [created] = await db.insert(recurringDocumentTypes).values({
      companyId: input.companyId, nome: input.nome, alvo: input.alvo, categoria: input.categoria,
      periodicidade: input.periodicidade, prazoDias: input.prazoDias,
    }).returning({ id: recurringDocumentTypes.id });
    await insertAuditLog({
      userId: ctx.user.id, companyId: input.companyId, acao: "criou_documento_mensal", entidade: "recurring_document_types",
      entidadeId: created?.id ?? null, dadosDepois: { nome: input.nome, alvo: input.alvo, periodicidade: input.periodicidade, prazoDias: input.prazoDias },
    });
    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    nome: z.string().trim().min(2, "Informe o nome do documento.").max(255).optional(),
    categoria: z.enum(RECURRING_CATEGORIES).optional(),
    periodicidade: z.enum(PERIODICIDADES).optional(),
    prazoDias: z.number().int().min(0, "O prazo vai de 0 a 90 dias.").max(90, "O prazo vai de 0 a 90 dias.").optional(),
    ativo: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode configurar documentos recorrentes.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const [tipo] = await db.select().from(recurringDocumentTypes).where(eq(recurringDocumentTypes.id, input.id)).limit(1);
    if (!tipo) throw new Error("Documento recorrente não encontrado.");
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, tipo.companyId), "Acesso negado");
    const { id, ...changes } = input;
    await db.update(recurringDocumentTypes).set({ ...changes, updatedAt: new Date() }).where(eq(recurringDocumentTypes.id, id));
    await insertAuditLog({
      userId: ctx.user.id, companyId: tipo.companyId, acao: "editou_documento_mensal", entidade: "recurring_document_types",
      entidadeId: tipo.id, dadosDepois: { antes: { nome: tipo.nome, periodicidade: tipo.periodicidade, prazoDias: tipo.prazoDias, ativo: tipo.ativo }, depois: changes },
    });
    return { success: true };
  }),

  /** Grade do dossiê: tipos mensais do colaborador × últimas competências. */
  employeeGrid: protectedProcedure.input(z.object({ employeeId: z.number(), quantidade: z.number().int().min(1).max(24).default(6) })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const employee = await getEmployeeByIdOrThrow(db, input.employeeId);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, employee.companyId), "Acesso negado");
    return buildEmployeeMonthlyGrid(db, employee, input.quantidade);
  }),

  /** Grade dos documentos recorrentes da própria empresa (Documentos da Empresa). */
  companyGrid: protectedProcedure.input(z.object({ companyId: z.number(), quantidade: z.number().int().min(1).max(24).default(6) })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    return buildCompanyMonthlyGrid(db, input.companyId, input.quantidade);
  }),

  /** Situação da empresa em uma competência (Pendências e Documentos da Empresa). */
  companyOverview: protectedProcedure.input(z.object({ companyId: z.number(), quantos: z.number().int().min(1).max(6).default(1) })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    return buildCompanyMonthlyOverview(db, input.companyId, input.quantos);
  }),
});

const campaignInput = {
  titulo: z.string().trim().min(3, "Informe o título.").max(120),
  mensagem: z.string().trim().min(10, "Escreva a mensagem do banner.").max(400, "A mensagem deve ter até 400 caracteres."),
  link: z.string().trim().max(500).optional().refine((v) => !v || isSafeCampaignLink(v), "Use um link https:// válido."),
  linkTexto: z.string().trim().max(60).optional(),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  mes: z.number().int().min(1).max(12),
  publico: z.enum(["todos", "empresas", "plataforma"]),
  ativo: z.boolean(),
};

/** Campanhas do calendário da saúde: banner e cor do mês. Só o Administrador Geral cadastra e ativa. */
const healthCampaignsRouter = router({
  /** Campanha ativa do mês atual (horário de Brasília) para o perfil de quem está logado. */
  active: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const mes = Number(brazilToday().slice(5, 7));
    const rows = await db.select().from(healthCampaigns)
      .where(and(eq(healthCampaigns.mes, mes), eq(healthCampaigns.ativo, true)))
      .orderBy(desc(healthCampaigns.updatedAt));
    const campanha = rows.find((row) => campaignVisibleTo(row.publico, isPlatformUser(ctx.user.role)));
    if (!campanha) return null;
    const { updatedBy: _updatedBy, ...publica } = campanha;
    return publica;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    assertAccess(isPlatformUser(ctx.user.role), "Acesso negado");
    const db = await getDb();
    if (!db) return [];
    return db.select().from(healthCampaigns).orderBy(healthCampaigns.mes, healthCampaigns.titulo);
  }),

  save: protectedProcedure.input(z.object({ id: z.number().optional(), ...campaignInput })).mutation(async ({ ctx, input }) => {
    assertAccess(canManagePlatformSettings(ctx.user.role), "Só o Administrador Geral gerencia campanhas.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const { id, ...dados } = input;
    const values = {
      ...dados,
      link: dados.link || null,
      linkTexto: dados.link ? dados.linkTexto || "Saiba mais" : null,
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
    };
    let campanhaId = id ?? null;
    if (id) {
      const [atual] = await db.select({ id: healthCampaigns.id }).from(healthCampaigns).where(eq(healthCampaigns.id, id)).limit(1);
      if (!atual) throw new Error("Campanha não encontrada.");
      await db.update(healthCampaigns).set(values).where(eq(healthCampaigns.id, id));
    } else {
      const [criada] = await db.insert(healthCampaigns).values(values).returning({ id: healthCampaigns.id });
      campanhaId = criada?.id ?? null;
    }
    await insertAuditLog({
      userId: ctx.user.id,
      acao: id ? "editou_campanha_saude" : "criou_campanha_saude",
      entidade: "health_campaigns",
      entidadeId: campanhaId,
      dadosDepois: { titulo: dados.titulo, mes: dados.mes, ativo: dados.ativo, publico: dados.publico },
    });
    return { success: true };
  }),
});

// Documento enviado pela empresa aguarda validação; enviado pela equipe SmartDocPlan já entra aprovado.
function initialReviewFields(user: { id: number; role: string }) {
  return isPlatformOperator(user.role)
    ? { status: "valido", analisadoPor: user.id, analisadoAt: new Date(), motivoRejeicao: null }
    : { status: "aguardando_validacao", analisadoPor: null, analisadoAt: null, motivoRejeicao: null };
}

async function assertRequirementOfEmployee(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, requirementId: number, positionId: number | null) {
  const [requirement] = await db.select({ positionId: positionRequirements.positionId, ativo: positionRequirements.ativo })
    .from(positionRequirements).where(eq(positionRequirements.id, requirementId)).limit(1);
  assertAccess(!!requirement && requirement.ativo && requirement.positionId === positionId, "O item do checklist não pertence ao cargo do colaborador.");
}

const employeeDocsRouter = router({
  list: protectedProcedure.input(z.object({
    employeeId: z.number(),
    categoria: z.enum(EMPLOYEE_DOC_CATEGORIES).optional(),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const employee = await getEmployeeByIdOrThrow(db, input.employeeId);
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, employee.companyId)) return [];
    const conditions = [eq(employeeDocuments.employeeId, input.employeeId), ne(employeeDocuments.status, "excluido")];
    if (input.categoria) conditions.push(eq(employeeDocuments.categoria, input.categoria));
    const docs = await db.select().from(employeeDocuments).where(and(...conditions)).orderBy(desc(employeeDocuments.createdAt));
    return docs
      .filter(doc => !isHealthCategory(doc.categoria) || canAccessHealthData(ctx.user.role))
      .map(doc => {
        // A situação de validade é derivada da data: aprovado com validade passada aparece como vencido.
        // Status de validade gravados em dados antigos ("vencido", "a_vencer") também seguem a data.
        const situacaoValidade = getValidityState(doc.validade);
        const porValidade = ["valido", "vencido", "a_vencer"].includes(doc.status);
        return { ...doc, situacaoValidade, status: porValidade ? (situacaoValidade === "vencido" ? "vencido" : "valido") : doc.status };
      });
  }),

  /** Checklist do cargo: cada documento exigido, sua situação, a conformidade e a liberação do colaborador. */
  checklist: protectedProcedure.input(z.object({ employeeId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const employee = await getEmployeeByIdOrThrow(db, input.employeeId);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, employee.companyId), "Acesso negado");
    const result = await getEmployeeChecklist(db, employee);
    const healthAccess = canAccessHealthData(ctx.user.role);
    return {
      ...result,
      items: result.items.map(({ requirement, doc, estado }) => {
        // Sem acesso a dados de saúde, mostra só a situação do item, sem o documento.
        const restrito = isHealthCategory(requirement.categoria) && !healthAccess;
        return {
          requirementId: requirement.id,
          documentoNome: requirement.documentoNome,
          categoria: requirement.categoria,
          validadeMeses: requirement.validadeMeses,
          estado,
          restrito,
          documento: doc && !restrito ? { id: doc.id, nome: doc.nome, validade: doc.validade, dataEmissao: doc.dataEmissao } : null,
        };
      }),
    };
  }),

  /** Validação pela equipe SmartDocPlan: aprova ou rejeita (com motivo) um documento do dossiê. */
  review: protectedProcedure.input(z.object({
    id: z.number(),
    decisao: z.enum(["aprovar", "rejeitar"]),
    motivo: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canManageRequestWorkflow(ctx.user.role), "Só a equipe SmartDocPlan valida documentos.");
    const motivo = normalizeOptionalText(input.motivo);
    if (input.decisao === "rejeitar" && !motivo) throw new Error("Informe o motivo da rejeição.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const doc = await getEmployeeDocByIdOrThrow(db, input.id);
    assertAccess(!isHealthCategory(doc.categoria) || canAccessHealthData(ctx.user.role), "Acesso a dados de saúde restrito ao Administrador Geral e RH.");
    const status = input.decisao === "aprovar" ? "valido" : "rejeitado";
    await db.update(employeeDocuments).set({
      status,
      analisadoPor: ctx.user.id,
      analisadoAt: new Date(),
      motivoRejeicao: input.decisao === "rejeitar" ? motivo : null,
      updatedAt: new Date(),
    }).where(eq(employeeDocuments.id, doc.id));
    await recalcCompliance(db, [doc.employeeId]);
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: doc.companyId,
      acao: input.decisao === "aprovar" ? "aprovou_documento_colaborador" : "rejeitou_documento_colaborador",
      entidade: "employee_documents",
      entidadeId: doc.id,
      dadosDepois: { documentoId: doc.id, nome: doc.nome, motivo: motivo ?? null },
    });
    if (input.decisao === "rejeitar") {
      const recipients = await db.select({ id: users.id }).from(users)
        .where(and(eq(users.companyId, doc.companyId), inArray(users.role, ["company_admin", "company_hr"]), eq(users.ativo, true)));
      await createNotifications({
        userIds: recipients.map((user) => user.id),
        companyId: doc.companyId,
        tipo: "documento_rejeitado",
        titulo: "Documento rejeitado",
        mensagem: `O documento "${doc.nome}" foi rejeitado: ${motivo}`,
        link: `/empresa/colaboradores/${doc.employeeId}`,
      });
    }
    return { success: true };
  }),

  /** Fila de documentos aguardando validação (equipe SmartDocPlan). */
  pendingReview: protectedProcedure.input(z.object({ companyId: z.number().optional() }).optional()).query(async ({ ctx, input }) => {
    assertAccess(isPlatformUser(ctx.user.role), "Acesso negado");
    const db = await getDb();
    if (!db) return [];
    const conditions = [eq(employeeDocuments.status, "aguardando_validacao")];
    if (input?.companyId) conditions.push(eq(employeeDocuments.companyId, input.companyId));
    const rows = await db.select({
      id: employeeDocuments.id,
      nome: employeeDocuments.nome,
      categoria: employeeDocuments.categoria,
      fileUrl: employeeDocuments.fileUrl,
      dataEmissao: employeeDocuments.dataEmissao,
      validade: employeeDocuments.validade,
      createdAt: employeeDocuments.createdAt,
      updatedAt: employeeDocuments.updatedAt,
      employeeId: employeeDocuments.employeeId,
      companyId: employeeDocuments.companyId,
      colaboradorNome: employees.nome,
      empresaNome: companies.razaoSocial,
    })
      .from(employeeDocuments)
      .innerJoin(employees, eq(employees.id, employeeDocuments.employeeId))
      .innerJoin(companies, eq(companies.id, employeeDocuments.companyId))
      .where(and(...conditions))
      .orderBy(employeeDocuments.updatedAt);
    return rows.filter((row) => !isHealthCategory(row.categoria) || canAccessHealthData(ctx.user.role));
  }),

  create: protectedProcedure.input(z.object({
    employeeId: z.number(),
    companyId: z.number(),
    categoria: z.enum(EMPLOYEE_DOC_CATEGORIES),
    nome: z.string().min(1),
    tipo: z.string().optional(),
    fileUrl: z.string().optional(),
    fileKey: z.string().optional(),
    fileNome: z.string().optional(),
    fileBase64: z.string().optional(),
    dataEmissao: documentDateInput,
    validade: documentDateInput,
    obrigatorio: z.boolean().default(true),
    observacao: z.string().optional(),
    requirementId: z.number().optional(),
    recurringTypeId: z.number().optional(),
    competencia: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId), "Acesso negado");
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode enviar documentos de colaboradores.");
    assertAccess(!isHealthCategory(input.categoria) || canAccessHealthData(ctx.user.role), "Acesso a dados de saúde restrito ao Administrador Geral e RH.");
    assertDocumentDates(input.dataEmissao, input.validade);
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const employee = await getEmployeeByIdOrThrow(db, input.employeeId);
    assertAccess(employee.companyId === input.companyId, "O colaborador não pertence à empresa informada.");
    assertAccess(!isHealthCategory(input.categoria) || !input.fileUrl || input.fileUrl.startsWith("/uploads/"), "Documentos de saúde devem usar o armazenamento protegido da plataforma.");
    if (input.requirementId) await assertRequirementOfEmployee(db, input.requirementId, employee.positionId);
    const mensal = await assertRecurringUpload(db, { recurringTypeId: input.recurringTypeId, competencia: input.competencia, companyId: employee.companyId, alvo: "colaborador", employeeId: employee.id });
    const { fileBase64, fileNome, ...data } = input;
    const saved = fileBase64 ? await saveDocumentFile(fileBase64, `employee_${input.employeeId}`) : null;
    const fileUrl = saved?.url ?? data.fileUrl;
    let createdDoc: { id: number } | undefined;
    try {
      [createdDoc] = await db.insert(employeeDocuments).values({
        ...data,
        fileUrl,
        fileKey: saved ? saved.url.replace("/uploads/", "") : data.fileKey,
        dataEmissao: data.dataEmissao || undefined,
        validade: data.validade || undefined,
        uploadedBy: ctx.user.id,
        // Documento recorrente não passa pela validação da equipe (não interfere na liberação); os do checklist passam.
        ...(mensal ? { status: "valido" } : initialReviewFields(ctx.user)),
      } as any).returning({ id: employeeDocuments.id });
    } catch (error) { await saved?.cleanup(); throw error; }
    await recalcCompliance(db, [input.employeeId]);
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: input.companyId,
      acao: "criou_documento_colaborador",
      entidade: "employee_documents",
      entidadeId: createdDoc?.id ?? null,
      dadosDepois: { colaboradorId: input.employeeId, categoria: input.categoria, nome: input.nome, arquivo: fileNome ?? null },
    });
    return { success: true, fileUrl };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    categoria: z.enum(EMPLOYEE_DOC_CATEGORIES).optional(),
    nome: z.string().min(1).optional(),
    tipo: z.string().optional(),
    dataEmissao: documentDateInput,
    validade: documentDateInput,
    observacao: z.string().optional(),
    fileNome: z.string().optional(),
    fileBase64: z.string().optional(),
    requirementId: z.number().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode alterar documentos de colaboradores.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const doc = await getEmployeeDocByIdOrThrow(db, input.id);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, doc.companyId), "Acesso negado");
    const categoria = input.categoria ?? doc.categoria;
    assertAccess((!isHealthCategory(doc.categoria) && !isHealthCategory(categoria)) || canAccessHealthData(ctx.user.role), "Acesso a dados de saúde restrito ao Administrador Geral e RH.");
    assertAccess(!isHealthCategory(categoria) || input.fileBase64 || !doc.fileUrl || doc.fileUrl.startsWith("/uploads/"), "Documentos de saúde devem usar o armazenamento protegido da plataforma.");
    const datas = mergedDocumentDates(input, doc);
    assertDocumentDates(datas.dataEmissao, datas.validade);
    if (input.requirementId) {
      const employee = await getEmployeeByIdOrThrow(db, doc.employeeId);
      await assertRequirementOfEmployee(db, input.requirementId, employee.positionId);
    }
    const saved = input.fileBase64 ? await saveDocumentFile(input.fileBase64, `employee_${doc.employeeId}`) : null;
    const payload: Record<string, unknown> = {
      categoria,
      nome: input.nome?.trim() ?? doc.nome,
      updatedAt: new Date(),
    };
    if (input.tipo !== undefined) payload.tipo = normalizeOptionalText(input.tipo) ?? null;
    if (input.dataEmissao !== undefined) payload.dataEmissao = input.dataEmissao || null;
    if (input.validade !== undefined) payload.validade = input.validade || null;
    if (input.observacao !== undefined) payload.observacao = normalizeOptionalText(input.observacao) ?? null;
    if (input.requirementId !== undefined) payload.requirementId = input.requirementId;
    // Arquivo novo ou datas novas voltam para validação, salvo quando a própria equipe SmartDocPlan altera.
    if (!doc.recurringTypeId && (saved || input.dataEmissao !== undefined || input.validade !== undefined)) Object.assign(payload, initialReviewFields(ctx.user));
    if (saved) {
      // O arquivo anterior permanece no disco para histórico; o registro aponta para a nova versão.
      payload.fileUrl = saved.url;
      payload.fileKey = saved.url.replace("/uploads/", "");
      payload.versao = doc.versao + 1;
      payload.uploadedBy = ctx.user.id;
    }
    try {
      await db.update(employeeDocuments).set(payload as any).where(eq(employeeDocuments.id, doc.id));
    } catch (error) { await saved?.cleanup(); throw error; }
    await recalcCompliance(db, [doc.employeeId]);
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: doc.companyId,
      acao: saved ? "substituiu_documento_colaborador" : "editou_documento_colaborador",
      entidade: "employee_documents",
      entidadeId: doc.id,
      dadosDepois: { documentoId: doc.id, categoria, nome: payload.nome, versao: payload.versao ?? doc.versao, arquivo: input.fileNome ?? null },
    });
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    assertAccess(canManageCompanyData(ctx.user.role), "Seu perfil não pode excluir documentos de colaboradores.");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const doc = await getEmployeeDocByIdOrThrow(db, input.id);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, doc.companyId), "Acesso negado");
    assertAccess(!isHealthCategory(doc.categoria) || canAccessHealthData(ctx.user.role), "Acesso a dados de saúde restrito ao Administrador Geral e RH.");
    // Exclusão lógica: o registro e o arquivo são mantidos para histórico e auditoria.
    await db.update(employeeDocuments).set({ status: "excluido", updatedAt: new Date() }).where(eq(employeeDocuments.id, doc.id));
    await recalcCompliance(db, [doc.employeeId]);
    await insertAuditLog({
      userId: ctx.user.id,
      companyId: doc.companyId,
      acao: "excluiu_documento_colaborador",
      entidade: "employee_documents",
      entidadeId: doc.id,
      dadosDepois: { documentoId: doc.id, categoria: doc.categoria, nome: doc.nome },
    });
    return { success: true };
  }),
});

// â”€â”€â”€ DASHBOARD ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const dashboardRouter = router({
  // Dashboard da empresa
  company: protectedProcedure.input(z.object({ companyId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return null;

    const [totalEmp] = await db.select({ count: sql<number>`count(*)` }).from(employees).where(eq(employees.companyId, input.companyId));
    const [ativos] = await db.select({ count: sql<number>`count(*)` }).from(employees).where(and(eq(employees.companyId, input.companyId), eq(employees.status, "ativo")));
    const [afastados] = await db.select({ count: sql<number>`count(*)` }).from(employees).where(and(eq(employees.companyId, input.companyId), eq(employees.status, "afastado")));
    const [totalReq] = await db.select({ count: sql<number>`count(*)` }).from(requests).where(eq(requests.companyId, input.companyId));
    const [reqNovas] = await db.select({ count: sql<number>`count(*)` }).from(requests).where(and(eq(requests.companyId, input.companyId), eq(requests.status, "nova")));
    const [totalTickets] = await db.select({ count: sql<number>`count(*)` }).from(tickets).where(and(eq(tickets.companyId, input.companyId), eq(tickets.status, "aberto")));

    return {
      colaboradores: { total: totalEmp?.count ?? 0, ativos: ativos?.count ?? 0, afastados: afastados?.count ?? 0 },
      solicitacoes: { total: totalReq?.count ?? 0, novas: reqNovas?.count ?? 0 },
      chamadosAbertos: totalTickets?.count ?? 0,
    };
  }),

  // Dashboard global (admin plataforma)
  global: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const [totalCompanies] = await db.select({ count: sql<number>`count(*)` }).from(companies);
    const [ativasCompanies] = await db.select({ count: sql<number>`count(*)` }).from(companies).where(eq(companies.status, "ativo"));
    const [totalReq] = await db.select({ count: sql<number>`count(*)` }).from(requests);
    const [reqNovas] = await db.select({ count: sql<number>`count(*)` }).from(requests).where(eq(requests.status, "nova"));
    const [totalTickets] = await db.select({ count: sql<number>`count(*)` }).from(tickets).where(eq(tickets.status, "aberto"));
    const [totalEmp] = await db.select({ count: sql<number>`count(*)` }).from(employees).where(eq(employees.status, "ativo"));

    return {
      empresas: { total: totalCompanies?.count ?? 0, ativas: ativasCompanies?.count ?? 0 },
      solicitacoes: { total: totalReq?.count ?? 0, novas: reqNovas?.count ?? 0 },
      chamadosAbertos: totalTickets?.count ?? 0,
      colaboradoresAtivos: totalEmp?.count ?? 0,
    };
  }),
});

// â”€â”€â”€ APP ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const documentTemplatesRouter = router({
  // Listar templates por tipo de solicitação
  listByTipo: protectedProcedure.input(z.object({
    tipoSolicitacao: z.enum(["admissao","demissao","mudanca_funcao","afastamento","atestado_medico","outros"]),
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(documentTypeTemplates)
      .where(and(eq(documentTypeTemplates.tipoSolicitacao, input.tipoSolicitacao), eq(documentTypeTemplates.ativo, true)))
      .orderBy(documentTypeTemplates.ordem);
  }),

  // Listar todos (para admin gerenciar)
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(documentTypeTemplates).orderBy(documentTypeTemplates.tipoSolicitacao, documentTypeTemplates.ordem);
  }),

  create: superAdminProcedure.input(z.object({
    tipoSolicitacao: z.enum(["admissao","demissao","mudanca_funcao","afastamento","atestado_medico","outros"]),
    categoria: z.enum(["pessoal","empresa","treinamento","exame_medico","psicossocial","outros"]).default("pessoal"),
    nome: z.string().min(1),
    descricao: z.string().optional(),
    obrigatorio: z.boolean().default(true),
    sexo: z.enum(["todos","masculino","feminino"]).default("todos"),
    ordem: z.number().default(0),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    await db.insert(documentTypeTemplates).values({ ...input, criadoPor: ctx.user.id } as any);
    return { success: true };
  }),

  update: superAdminProcedure.input(z.object({
    id: z.number(),
    tipoSolicitacao: z.enum(["admissao","demissao","mudanca_funcao","afastamento","atestado_medico","outros"]).optional(),
    categoria: z.enum(["pessoal","empresa","treinamento","exame_medico","psicossocial","outros"]).optional(),
    nome: z.string().min(1).optional(),
    descricao: z.string().optional(),
    obrigatorio: z.boolean().optional(),
    sexo: z.enum(["todos","masculino","feminino"]).optional(),
    ativo: z.boolean().optional(),
    ordem: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const { id, ...data } = input;
    await db.update(documentTypeTemplates).set(data as any).where(eq(documentTypeTemplates.id, id));
    return { success: true };
  }),

  delete: superAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    await db.update(documentTypeTemplates).set({ ativo: false }).where(eq(documentTypeTemplates.id, input.id));
    return { success: true };
  }),
});

// â”€â”€â”€ REQUEST DOCUMENT UPLOADS ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const requestDocUploadsRouter = router({
  templates: protectedProcedure.input(z.object({ requestId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const request = await getRequestByIdOrThrow(db, input.requestId);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, request.companyId), "Acesso negado");
    if (isHealthCategory(request.tipo) && !canAccessHealthData(ctx.user.role)) return [];
    const snapshot = request.requirementsSnapshot ? parseJsonText<{ templates: (typeof documentTypeTemplates.$inferSelect)[] }>(request.requirementsSnapshot) : null;
    const templates = snapshot?.templates ?? await db.select().from(documentTypeTemplates).where(and(eq(documentTypeTemplates.tipoSolicitacao, request.tipo), eq(documentTypeTemplates.ativo, true))).orderBy(documentTypeTemplates.ordem);
    return templates.filter(t => !isHealthCategory(t.categoria) || canAccessHealthData(ctx.user.role));
  }),
  // Listar uploads de uma solicitação
  listByRequest: protectedProcedure.input(z.object({ requestId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const request = await getRequestByIdOrThrow(db, input.requestId);
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, request.companyId)) return [];
    if (isHealthCategory(request.tipo) && !canAccessHealthData(ctx.user.role)) return [];
    const docs = await db.select().from(requestDocumentUploads)
      .where(eq(requestDocumentUploads.requestId, input.requestId))
      .orderBy(requestDocumentUploads.categoria, requestDocumentUploads.nome);
    return docs.filter(doc => !isHealthCategory(doc.categoria) || canAccessHealthData(ctx.user.role));
  }),

  // Upload de documento (base64) — empresa faz upload
  upload: protectedProcedure.input(z.object({
    requestId: z.number(),
    templateId: z.number().optional(),
    nome: z.string().min(1),
    categoria: z.enum(["pessoal","empresa","treinamento","exame_medico","psicossocial","outros"]).default("pessoal"),
    obrigatorio: z.boolean().default(false),
    numeroDocumento: z.string().optional(),
    dataEmissao: documentDateInput,
    validade: documentDateInput,
    fileNome: z.string(),
    fileMime: z.string(),
    fileTamanho: z.number(),
    fileBase64: z.string(), // base64 do arquivo
  })).mutation(async ({ ctx, input }) => {
    assertDocumentDates(input.dataEmissao, input.validade);
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const request = await getRequestByIdOrThrow(db, input.requestId);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, request.companyId), "Acesso negado");
    assertAccess(!(isHealthCategory(request.tipo) || isHealthCategory(input.categoria)) || canAccessHealthData(ctx.user.role), "Acesso a dados de saúde restrito ao Administrador Geral e RH.");
    assertAccess(
      canCreateRequests(ctx.user.role) || canManageRequestWorkflow(ctx.user.role),
      "Seu perfil não pode enviar documentos da solicitação."
    );

    // Salvar arquivo em disco local, conferindo o conteúdo real (PDF, PNG ou JPEG)
    const { fileBase64, ...rest } = input;
    const { buffer } = validateDocumentFile(fileBase64);
    if (buffer.length !== input.fileTamanho) throw new Error("Arquivo inválido ou maior que 10 MB.");
    const { url: fileUrl } = await saveDocumentFile(fileBase64, `req_${input.requestId}`);
    const fileName = fileUrl.replace("/uploads/", "");
    const placeholderResult = await db.select().from(requestDocumentUploads).where(
      and(
        eq(requestDocumentUploads.requestId, input.requestId),
        eq(requestDocumentUploads.nome, input.nome),
        eq(requestDocumentUploads.categoria, input.categoria),
        input.templateId
          ? eq(requestDocumentUploads.templateId, input.templateId)
          : sql`${requestDocumentUploads.templateId} IS NULL`,
        sql`${requestDocumentUploads.fileUrl} IS NULL`
      )
    ).limit(1);
    const placeholder = placeholderResult[0];

    const uploadPayload = {
      ...rest,
      dataEmissao: input.dataEmissao || undefined,
      validade: input.validade || undefined,
      obrigatorio: placeholder?.obrigatorio ?? input.obrigatorio,
      fileUrl,
      fileKey: fileName,
      uploadedBy: ctx.user.id,
    };

    if (placeholder) {
      await db.update(requestDocumentUploads).set(uploadPayload as any).where(eq(requestDocumentUploads.id, placeholder.id));
    } else {
      await db.insert(requestDocumentUploads).values(uploadPayload as any);
    }

    await insertAuditLog({
      userId: ctx.user.id,
      companyId: request.companyId,
      acao: "enviou_documento_solicitacao",
      entidade: "request_document_uploads",
      dadosDepois: {
        requestId: request.id,
        nome: input.nome,
        fileNome: input.fileNome,
        numeroDocumento: input.numeroDocumento ?? null,
      },
    });

    return { success: true, fileUrl };
  }),

  // Analista avalia documento (aprovar/reprovar)
  avaliar: adminProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["aprovado","reprovado"]),
    motivoReprovacao: z.string().optional(),
    numeroDocumento: z.string().optional(),
    dataEmissao: documentDateInput,
    validade: documentDateInput,
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    assertAccess(canManageRequestWorkflow(ctx.user.role), "Seu perfil não pode avaliar documentos.");
    const [document] = await db.select().from(requestDocumentUploads).where(eq(requestDocumentUploads.id, input.id));
    if (!document?.fileUrl) throw new Error("Anexe um arquivo antes de avaliar.");
    const datas = mergedDocumentDates(input, document);
    assertDocumentDates(datas.dataEmissao, datas.validade);
    const request = await getRequestByIdOrThrow(db, document.requestId);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, request.companyId), "Acesso negado");
    assertAccess(!(isHealthCategory(request.tipo) || isHealthCategory(document.categoria)) || canAccessHealthData(ctx.user.role), "Acesso a dados de saúde restrito ao Administrador Geral e RH.");
    if (input.status === "reprovado" && !input.motivoReprovacao?.trim()) throw new Error("Informe o motivo da reprovação.");
    await db.update(requestDocumentUploads).set({
      status: input.status,
      motivoReprovacao: input.motivoReprovacao ?? null,
      numeroDocumento: input.numeroDocumento?.trim() || null,
      dataEmissao: input.dataEmissao || null,
      validade: input.validade || null,
      analisadoPor: ctx.user.id,
      analisadoAt: new Date(),
    } as any).where(eq(requestDocumentUploads.id, input.id));
    await insertAuditLog({ userId: ctx.user.id, acao: `${input.status}_documento`, entidade: "request_document_uploads", entidadeId: input.id });
    return { success: true };
  }),

  // Deletar upload
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const result = await db.select().from(requestDocumentUploads).where(eq(requestDocumentUploads.id, input.id)).limit(1);
    const upload = result[0];
    if (!upload) throw new Error("Documento não encontrado");
    const request = await getRequestByIdOrThrow(db, upload.requestId);
    assertAccess(canAccessCompany(ctx.user.role, ctx.user.companyId, request.companyId), "Acesso negado");
    assertAccess(!(isHealthCategory(request.tipo) || isHealthCategory(upload.categoria)) || canAccessHealthData(ctx.user.role), "Acesso a dados de saúde restrito ao Administrador Geral e RH.");
    assertAccess(
      canCreateRequests(ctx.user.role) || canManageRequestWorkflow(ctx.user.role),
      "Seu perfil não pode excluir documentos da solicitação."
    );
    // Keep the requirement after deleting its attachment.
    await db.update(requestDocumentUploads).set({ fileUrl: null, fileKey: null, fileNome: null, fileTamanho: null, fileMime: null, numeroDocumento: null, dataEmissao: null, validade: null, status: "pendente", motivoReprovacao: null, analisadoPor: null, analisadoAt: null, updatedAt: new Date() }).where(eq(requestDocumentUploads.id, input.id));
    return { success: true };
  }),
});

export const appRouter = router({
  bi: biRouter,
  recurringDocs: recurringDocsRouter,
  healthCampaigns: healthCampaignsRouter,
  vacations: vacationsRouter,
  organization: organizationRouter,
  system: systemRouter,
  documentTemplates: documentTemplatesRouter,
  requestDocUploads: requestDocUploadsRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      // Nunca devolver o hash da senha ao navegador.
      const { passwordHash: _passwordHash, ...usuario } = ctx.user;
      return usuario;
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      await revokeSessionFromCookie(ctx.req.headers.cookie);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Limpar o cookie com todas as variantes para garantir remoção
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: 0 });
      ctx.res.clearCookie(COOKIE_NAME, { httpOnly: true, path: "/", maxAge: 0 });
      ctx.res.clearCookie(COOKIE_NAME, { httpOnly: true, path: "/", secure: true, sameSite: "none", maxAge: 0 });
      return { success: true } as const;
    }),
  }),
  companies: companiesRouter,
  companyUpdateRequests: companyUpdateRequestsRouter,
  companyDocuments: companyDocumentsRouter,
  employees: employeesRouter,
  notifications: notificationsRouter,
  requests: requestsRouter,
  tickets: ticketsRouter,
  positions: positionsRouter,
  positionRequirements: positionRequirementsRouter,
  worksites: worksitesRouter,
  legalRequirements: legalReqRouter,
  audit: auditRouter,
  users: usersRouter,
  employeeDocs: employeeDocsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;

// â”€â”€â”€ DOCUMENT TYPE TEMPLATES ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
