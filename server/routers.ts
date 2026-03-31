import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, superAdminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb, getUserByEmail, createLocalUser } from "./db";
import {
  companies, employees, requests, tickets, auditLogs,
  positions, worksites, companyDocuments, employeeDocuments,
  legalRequirements, users, documentTypeTemplates, requestDocumentUploads
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      acao: opts.acao,
      entidade: opts.entidade ?? null,
      entidadeId: opts.entidadeId ?? null,
      dadosDepois: opts.dadosDepois ? JSON.stringify(opts.dadosDepois) : null,
    } as any);
  } catch { /* não bloquear a operação principal */ }
}

/** Verifica se o usuário é da plataforma (admin, analista ou auditor) */
function isPlatformUser(role: string) {
  return ["platform_admin", "platform_analyst", "platform_auditor"].includes(role);
}

/** Verifica se o usuário pertence à empresa ou é da plataforma */
function canAccessCompany(userRole: string, userCompanyId: number | null | undefined, targetCompanyId: number) {
  if (isPlatformUser(userRole)) return true;
  return userCompanyId === targetCompanyId;
}

// ─── COMPANIES ROUTER ─────────────────────────────────────────────────────────
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

  create: superAdminProcedure.input(z.object({
    razaoSocial: z.string().min(1),
    nomeFantasia: z.string().optional(),
    cnpj: z.string().optional(),
    email: z.string().email().optional(),
    telefone: z.string().optional(),
    status: z.enum(["ativo", "inativo", "suspenso"]).default("ativo"),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.insert(companies).values(input);
    return { success: true };
  }),

  update: superAdminProcedure.input(z.object({
    id: z.number(),
    razaoSocial: z.string().min(1).optional(),
    nomeFantasia: z.string().optional(),
    cnpj: z.string().optional(),
    email: z.string().email().optional(),
    telefone: z.string().optional(),
    status: z.enum(["ativo", "inativo", "suspenso"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const { id, ...data } = input;
    await db.update(companies).set(data).where(eq(companies.id, id));
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

// ─── EMPLOYEES ROUTER ─────────────────────────────────────────────────────────
const employeesRouter = router({
  list: protectedProcedure.input(z.object({
    companyId: z.number(),
    status: z.enum(["ativo", "afastado", "desligado"]).optional(),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return [];
    const conditions = [eq(employees.companyId, input.companyId)];
    if (input.status) conditions.push(eq(employees.status, input.status));
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
    dataNascimento: z.string().optional(),
    positionId: z.number().optional(),
    worksiteId: z.number().optional(),
    dataAdmissao: z.string().optional(),
    salario: z.string().optional(),
    email: z.string().email().optional(),
    telefone: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) throw new Error("Acesso negado");
    await db.insert(employees).values({
      ...input,
      dataNascimento: input.dataNascimento ? new Date(input.dataNascimento) : undefined,
      dataAdmissao: input.dataAdmissao ? new Date(input.dataAdmissao) : undefined,
    } as any);
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
    if (!db) throw new Error("DB unavailable");
    const { id, ...data } = input;
    await db.update(employees).set(data).where(eq(employees.id, id));
    return { success: true };
  }),

  stats: protectedProcedure.input(z.object({ companyId: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { total: 0, ativos: 0, afastados: 0, desligados: 0 };
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return { total: 0, ativos: 0, afastados: 0, desligados: 0 };
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(employees).where(eq(employees.companyId, input.companyId));
    const [ativos] = await db.select({ count: sql<number>`count(*)` }).from(employees).where(and(eq(employees.companyId, input.companyId), eq(employees.status, "ativo")));
    const [afastados] = await db.select({ count: sql<number>`count(*)` }).from(employees).where(and(eq(employees.companyId, input.companyId), eq(employees.status, "afastado")));
    const [desligados] = await db.select({ count: sql<number>`count(*)` }).from(employees).where(and(eq(employees.companyId, input.companyId), eq(employees.status, "desligado")));
    return {
      total: total?.count ?? 0,
      ativos: ativos?.count ?? 0,
      afastados: afastados?.count ?? 0,
      desligados: desligados?.count ?? 0,
    };
  }),
});

// ─── REQUESTS ROUTER ──────────────────────────────────────────────────────────
const requestsRouter = router({
  list: protectedProcedure.input(z.object({
    companyId: z.number(),
    status: z.enum(["nova","em_analise","aguardando_correcao","aguardando_documentos","aprovado","concluido","rejeitado"]).optional(),
    tipo: z.enum(["admissao","demissao","mudanca_funcao","afastamento","atestado_medico","outros"]).optional(),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    // companyId = 0 significa "todas" — apenas para platform users
    if (input.companyId === 0) {
      if (!isPlatformUser(ctx.user.role)) return [];
      const conditions = [];
      if (input.status) conditions.push(eq(requests.status, input.status));
      if (input.tipo) conditions.push(eq(requests.tipo, input.tipo));
      return db.select().from(requests).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(requests.createdAt));
    }
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) return [];
    const conditions = [eq(requests.companyId, input.companyId)] as any[];
    if (input.status) conditions.push(eq(requests.status, input.status));
    if (input.tipo) conditions.push(eq(requests.tipo, input.tipo));
    return db.select().from(requests).where(and(...conditions)).orderBy(desc(requests.createdAt));
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(requests).where(eq(requests.id, input.id)).limit(1);
    const req = result[0];
    if (!req) return null;
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, req.companyId)) return null;
    return req;
  }),

  create: protectedProcedure.input(z.object({
    companyId: z.number(),
    employeeId: z.number().optional(),
    tipo: z.enum(["admissao","demissao","mudanca_funcao","afastamento","atestado_medico","outros"]),
    titulo: z.string().min(1),
    descricao: z.string().optional(),
    prioridade: z.enum(["baixa","media","alta","urgente"]).default("media"),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) throw new Error("Acesso negado");
    await db.insert(requests).values({ ...input, criadoPor: ctx.user.id });
    await insertAuditLog({ userId: ctx.user.id, companyId: input.companyId, acao: 'criou_solicitacao', entidade: 'requests', dadosDepois: { tipo: input.tipo, titulo: input.titulo } });
    return { success: true };
  }),

  updateStatus: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["nova","em_analise","aguardando_correcao","aguardando_documentos","aprovado","concluido","rejeitado"]),
    observacoes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const updateData: Record<string, unknown> = { status: input.status };
    if (input.observacoes) updateData.observacoes = input.observacoes;
    if (input.status === "concluido") updateData.concluidoAt = new Date();
    await db.update(requests).set(updateData).where(eq(requests.id, input.id));
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

// ─── TICKETS ROUTER ───────────────────────────────────────────────────────────
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
    return db.select().from(tickets).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(tickets.createdAt));
  }),

  create: protectedProcedure.input(z.object({
    companyId: z.number(),
    tipo: z.enum(["criacao_usuario","bloqueio_usuario","alteracao_acesso","suporte_tecnico","duvida","outros"]),
    titulo: z.string().min(1),
    descricao: z.string().optional(),
    prioridade: z.enum(["baixa","media","alta","urgente"]).default("media"),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.insert(tickets).values({ ...input, criadoPor: ctx.user.id });
    return { success: true };
  }),

  updateStatus: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["aberto","em_atendimento","aguardando_cliente","resolvido","fechado"]),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const updateData: Record<string, unknown> = { status: input.status };
    if (input.status === "resolvido" || input.status === "fechado") updateData.resolvidoAt = new Date();
    await db.update(tickets).set(updateData).where(eq(tickets.id, input.id));
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

// ─── POSITIONS ROUTER ─────────────────────────────────────────────────────────
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
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) throw new Error("Acesso negado");
    await db.insert(positions).values(input);
    return { success: true };
  }),
});

// ─── WORKSITES ROUTER ─────────────────────────────────────────────────────────
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
    endereco: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().max(2).optional(),
    dataInicio: z.string().optional(),
    dataFim: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) throw new Error("Acesso negado");
    await db.insert(worksites).values({
      ...input,
      dataInicio: input.dataInicio ? new Date(input.dataInicio) : undefined,
      dataFim: input.dataFim ? new Date(input.dataFim) : undefined,
    } as any);
    return { success: true };
  }),
});

// ─── LEGAL REQUIREMENTS ROUTER ────────────────────────────────────────────────
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
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) {
      throw new Error("Acesso negado");
    }
    await db.insert(legalRequirements).values(input);
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(legalRequirements).set({ ativo: false }).where(eq(legalRequirements.id, input.id));
    return { success: true };
  }),
});

// ─── AUDIT ROUTER ─────────────────────────────────────────────────────────────
const auditRouter = router({
  list: adminProcedure.input(z.object({
    companyId: z.number().optional(),
    limit: z.number().default(100),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions: any[] = [];
    if (input.companyId) conditions.push(eq(auditLogs.companyId, input.companyId));
    const rows = await db.select().from(auditLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(input.limit);
    // Enriquecer com nome do usuário
    return rows;
  }),
});

// ─── USERS ROUTER (gestão de usuários das empresas) ──────────────────────────
const usersRouter = router({
  create: superAdminProcedure.input(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["platform_admin","platform_analyst","platform_auditor","company_admin","company_hr","company_manager","company_viewer"]),
    companyId: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    // Verificar se email ja existe
    const existing = await getUserByEmail(input.email);
    if (existing) throw new Error("E-mail ja cadastrado.");
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
    if (!db) throw new Error("DB unavailable");
    await db.update(users).set({ ativo: input.ativo }).where(eq(users.id, input.userId));
    await insertAuditLog({ userId: ctx.user.id, acao: input.ativo ? 'ativou_usuario' : 'desativou_usuario', entidade: 'users', entidadeId: input.userId });
    return { success: true };
  }),

  resetPassword: superAdminProcedure.input(z.object({
    userId: z.number(),
    newPassword: z.string().min(6),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash(input.newPassword, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, input.userId));
    return { success: true };
  }),

  list: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: users.id, name: users.name, email: users.email,
      role: users.role, companyId: users.companyId, createdAt: users.createdAt,
      ativo: users.ativo,
    }).from(users).orderBy(desc(users.createdAt));
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
    if (!db) throw new Error("DB unavailable");
    await db.update(users).set({ role: input.role, companyId: input.companyId ?? null }).where(eq(users.id, input.userId));
    return { success: true };
  }),
});

// ─── EMPLOYEE DOCUMENTS ROUTER ────────────────────────────────────────────────
const employeeDocsRouter = router({
  list: protectedProcedure.input(z.object({
    employeeId: z.number(),
    categoria: z.enum(["pessoal","contratual","exame_medico","treinamento","advertencia","afastamento","atestado","opcional"]).optional(),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const conditions = [eq(employeeDocuments.employeeId, input.employeeId)];
    if (input.categoria) conditions.push(eq(employeeDocuments.categoria, input.categoria));
    return db.select().from(employeeDocuments).where(and(...conditions)).orderBy(desc(employeeDocuments.createdAt));
  }),

  create: protectedProcedure.input(z.object({
    employeeId: z.number(),
    companyId: z.number(),
    categoria: z.enum(["pessoal","contratual","exame_medico","treinamento","advertencia","afastamento","atestado","opcional"]),
    nome: z.string().min(1),
    tipo: z.string().optional(),
    fileUrl: z.string().optional(),
    fileKey: z.string().optional(),
    validade: z.string().optional(),
    obrigatorio: z.boolean().default(true),
    observacao: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    if (!canAccessCompany(ctx.user.role, ctx.user.companyId, input.companyId)) throw new Error("Acesso negado");
    await db.insert(employeeDocuments).values({
      ...input,
      validade: input.validade ? new Date(input.validade) : undefined,
      uploadedBy: ctx.user.id,
    } as any);
    return { success: true };
  }),
});

// ─── DASHBOARD ROUTER ─────────────────────────────────────────────────────────
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

// ─── APP ROUTER ───────────────────────────────────────────────────────────────
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
    categoria: z.enum(["pessoal","treinamento","exame_medico","outros"]).default("pessoal"),
    nome: z.string().min(1),
    descricao: z.string().optional(),
    obrigatorio: z.boolean().default(true),
    sexo: z.enum(["todos","masculino","feminino"]).default("todos"),
    ordem: z.number().default(0),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.insert(documentTypeTemplates).values({ ...input, criadoPor: ctx.user.id } as any);
    return { success: true };
  }),

  update: superAdminProcedure.input(z.object({
    id: z.number(),
    nome: z.string().min(1).optional(),
    descricao: z.string().optional(),
    obrigatorio: z.boolean().optional(),
    sexo: z.enum(["todos","masculino","feminino"]).optional(),
    ativo: z.boolean().optional(),
    ordem: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const { id, ...data } = input;
    await db.update(documentTypeTemplates).set(data as any).where(eq(documentTypeTemplates.id, id));
    return { success: true };
  }),

  delete: superAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(documentTypeTemplates).set({ ativo: false }).where(eq(documentTypeTemplates.id, input.id));
    return { success: true };
  }),
});

// ─── REQUEST DOCUMENT UPLOADS ROUTER ─────────────────────────────────────────
const requestDocUploadsRouter = router({
  // Listar uploads de uma solicitação
  listByRequest: protectedProcedure.input(z.object({ requestId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(requestDocumentUploads)
      .where(eq(requestDocumentUploads.requestId, input.requestId))
      .orderBy(requestDocumentUploads.categoria, requestDocumentUploads.nome);
  }),

  // Upload de documento (base64) — empresa faz upload
  upload: protectedProcedure.input(z.object({
    requestId: z.number(),
    templateId: z.number().optional(),
    nome: z.string().min(1),
    categoria: z.enum(["pessoal","treinamento","exame_medico","outros"]).default("pessoal"),
    obrigatorio: z.boolean().default(false),
    fileNome: z.string(),
    fileMime: z.string(),
    fileTamanho: z.number(),
    fileBase64: z.string(), // base64 do arquivo
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Salvar arquivo em disco local (simples, sem S3)
    const { fileBase64, ...rest } = input;
    const fs = await import("fs");
    const path = await import("path");
    const uploadsDir = path.join(process.cwd(), "dist", "public", "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = input.fileNome.split(".").pop() ?? "bin";
    const fileName = `req_${input.requestId}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    const buffer = Buffer.from(fileBase64, "base64");
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${fileName}`;

    await db.insert(requestDocumentUploads).values({
      ...rest,
      fileUrl,
      fileKey: fileName,
      uploadedBy: ctx.user.id,
    } as any);

    return { success: true, fileUrl };
  }),

  // Analista avalia documento (aprovar/reprovar)
  avaliar: adminProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["aprovado","reprovado"]),
    motivoReprovacao: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(requestDocumentUploads).set({
      status: input.status,
      motivoReprovacao: input.motivoReprovacao ?? null,
      analisadoPor: ctx.user.id,
      analisadoAt: new Date(),
    } as any).where(eq(requestDocumentUploads.id, input.id));
    await insertAuditLog({ userId: ctx.user.id, acao: `${input.status}_documento`, entidade: "request_document_uploads", entidadeId: input.id });
    return { success: true };
  }),

  // Deletar upload
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(requestDocumentUploads).where(eq(requestDocumentUploads.id, input.id));
    return { success: true };
  }),
});

export const appRouter = router({
  system: systemRouter,
  documentTemplates: documentTemplatesRouter,
  requestDocUploads: requestDocUploadsRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Limpar o cookie com todas as variantes para garantir remoção
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: 0 });
      ctx.res.clearCookie(COOKIE_NAME, { httpOnly: true, path: "/", maxAge: 0 });
      ctx.res.clearCookie(COOKIE_NAME, { httpOnly: true, path: "/", secure: true, sameSite: "none", maxAge: 0 });
      return { success: true } as const;
    }),
  }),
  companies: companiesRouter,
  employees: employeesRouter,
  requests: requestsRouter,
  tickets: ticketsRouter,
  positions: positionsRouter,
  worksites: worksitesRouter,
  legalRequirements: legalReqRouter,
  audit: auditRouter,
  users: usersRouter,
  employeeDocs: employeeDocsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;

// ─── DOCUMENT TYPE TEMPLATES ROUTER ──────────────────────────────────────────
