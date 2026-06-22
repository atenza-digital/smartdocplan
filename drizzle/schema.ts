import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

// --- USERS ---
// Papeis da plataforma:
// platform_admin    = Administrador da Plataforma (SmartDocPlan)
// platform_analyst  = Analista RH interno
// platform_auditor  = Auditor interno
// company_admin     = Administrador da Empresa cliente
// company_hr        = RH da Empresa
// company_manager   = Gestor da Empresa
// company_viewer    = Consulta (somente leitura)
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // mantido para compat OAuth, agora opcional
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }), // autenticacao propria
  loginMethod: varchar("loginMethod", { length: 64 }).default("local"),
  ativo: boolean("ativo").default(true).notNull(),
  role: mysqlEnum("role", [
    "platform_admin",
    "platform_analyst",
    "platform_auditor",
    "company_admin",
    "company_hr",
    "company_manager",
    "company_viewer",
  ]).default("company_viewer").notNull(),
  companyId: int("companyId"), // null = usuario interno da plataforma
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// --- COMPANIES ---
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  razaoSocial: varchar("razaoSocial", { length: 255 }).notNull(),
  nomeFantasia: varchar("nomeFantasia", { length: 255 }),
  cnpj: varchar("cnpj", { length: 18 }).unique(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  logoUrl: text("logoUrl"),
  status: mysqlEnum("status", ["ativo", "inativo", "suspenso"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// --- COMPANY DOCUMENTS ---
export const companyDocuments = mysqlTable("company_documents", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  fileUrl: text("fileUrl"),
  fileKey: text("fileKey"),
  validade: date("validade"),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// --- WORKSITES (OBRAS/CNOs) ---
export const worksites = mysqlTable("worksites", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cnos: varchar("cnos", { length: 30 }),
  endereco: text("endereco"),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  dataInicio: date("dataInicio"),
  dataFim: date("dataFim"),
  status: mysqlEnum("status", ["ativo", "concluido", "cancelado"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- POSITIONS (CARGOS) ---
// Cargos sao por empresa (companyId obrigatorio)
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  cbo: varchar("cbo", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- LEGAL REQUIREMENTS (MATRIZ NRs) ---
// Matriz legal e por empresa (companyId obrigatorio)
export const legalRequirements = mysqlTable("legal_requirements", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(), // vinculado à empresa
  norma: varchar("norma", { length: 50 }).notNull(),
  requisito: varchar("requisito", { length: 255 }).notNull(),
  documentoExigido: varchar("documentoExigido", { length: 255 }).notNull(),
  validadeMeses: int("validadeMeses"),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- POSITION REQUIREMENTS (DOCUMENTOS POR CARGO) ---
export const positionRequirements = mysqlTable("position_requirements", {
  id: int("id").autoincrement().primaryKey(),
  positionId: int("positionId").notNull(),
  legalRequirementId: int("legalRequirementId"),
  documentoNome: varchar("documentoNome", { length: 255 }).notNull(),
  obrigatorio: boolean("obrigatorio").default(true).notNull(),
  validadeMeses: int("validadeMeses"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- EMPLOYEES (COLABORADORES) ---
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull(),
  dataNascimento: date("dataNascimento"),
  positionId: int("positionId"),
  worksiteId: int("worksiteId"),
  dataAdmissao: date("dataAdmissao"),
  salario: decimal("salario", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["ativo", "afastado", "desligado"]).default("ativo").notNull(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  scoreConformidade: int("scoreConformidade").default(100),
  criadoPor: int("criadoPor"), // userId do analista interno que cadastrou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// --- EMPLOYEE DOCUMENTS (DOSSIE DIGITAL) ---
export const employeeDocuments = mysqlTable("employee_documents", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  companyId: int("companyId").notNull(),
  categoria: mysqlEnum("categoria", [
    "pessoal",
    "contratual",
    "exame_medico",
    "treinamento",
    "advertencia",
    "afastamento",
    "atestado",
    "opcional",
  ]).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 100 }),
  fileUrl: text("fileUrl"),
  fileKey: text("fileKey"),
  validade: date("validade"),
  versao: int("versao").default(1).notNull(),
  obrigatorio: boolean("obrigatorio").default(true).notNull(),
  status: mysqlEnum("status", ["valido", "vencido", "pendente", "a_vencer"]).default("valido").notNull(),
  observacao: text("observacao"),
  uploadedBy: int("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// --- REQUESTS (SOLICITACÕES DE RH) ---
export const requests = mysqlTable("requests", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  employeeId: int("employeeId"),
  tipo: mysqlEnum("tipo", [
    "admissao",
    "demissao",
    "mudanca_funcao",
    "afastamento",
    "atestado_medico",
    "outros",
  ]).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  status: mysqlEnum("status", [
    "nova",
    "em_analise",
    "aguardando_correcao",
    "aguardando_documentos",
    "aprovado",
    "concluido",
    "rejeitado",
  ]).default("nova").notNull(),
  prioridade: mysqlEnum("prioridade", ["baixa", "media", "alta", "urgente"]).default("media").notNull(),
  checklistCompleto: boolean("checklistCompleto").default(false).notNull(),
  criadoPor: int("criadoPor").notNull(),
  responsavelId: int("responsavelId"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  concluidoAt: timestamp("concluidoAt"),
});

export type Request = typeof requests.$inferSelect;
export type InsertRequest = typeof requests.$inferInsert;

// --- REQUEST DOCUMENTS ---
export const requestDocuments = mysqlTable("request_documents", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 100 }),
  fileUrl: text("fileUrl"),
  fileKey: text("fileKey"),
  obrigatorio: boolean("obrigatorio").default(false).notNull(),
  uploadedBy: int("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- TICKETS (CHAMADOS) ---
export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  tipo: mysqlEnum("tipo", [
    "criacao_usuario",
    "bloqueio_usuario",
    "alteracao_acesso",
    "suporte_tecnico",
    "duvida",
    "outros",
  ]).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  status: mysqlEnum("status", [
    "aberto",
    "em_atendimento",
    "aguardando_cliente",
    "resolvido",
    "fechado",
  ]).default("aberto").notNull(),
  prioridade: mysqlEnum("prioridade", ["baixa", "media", "alta", "urgente"]).default("media").notNull(),
  criadoPor: int("criadoPor").notNull(),
  responsavelId: int("responsavelId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  resolvidoAt: timestamp("resolvidoAt"),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// --- AUDIT LOGS ---
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  companyId: int("companyId"),
  action: varchar("action", { length: 255 }).notNull(),
  entity: varchar("entity", { length: 100 }),
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- DOCUMENT TYPE TEMPLATES (admin configura quais docs exigir por tipo de solicitação) ---
export const documentTypeTemplates = mysqlTable("document_type_templates", {
  id: int("id").autoincrement().primaryKey(),
  tipoSolicitacao: mysqlEnum("tipoSolicitacao", [
    "admissao", "demissao", "mudanca_funcao", "afastamento", "atestado_medico", "outros"
  ]).notNull(),
  categoria: mysqlEnum("categoria", ["pessoal", "empresa", "treinamento", "exame_medico", "outros"]).default("pessoal").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  obrigatorio: boolean("obrigatorio").default(true).notNull(),
  sexo: mysqlEnum("sexo", ["todos", "masculino", "feminino"]).default("todos").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  ordem: int("ordem").default(0).notNull(),
  criadoPor: int("criadoPor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DocumentTypeTemplate = typeof documentTypeTemplates.$inferSelect;

// --- REQUEST DOCUMENT UPLOADS (uploads reais vinculados a solicitações) ---
export const requestDocumentUploads = mysqlTable("request_document_uploads", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  templateId: int("templateId"),
  nome: varchar("nome", { length: 255 }).notNull(),
  categoria: mysqlEnum("categoria", ["pessoal", "empresa", "treinamento", "exame_medico", "outros"]).default("pessoal").notNull(),
  fileUrl: text("fileUrl"),
  fileKey: text("fileKey"),
  fileNome: varchar("fileNome", { length: 255 }),
  fileTamanho: int("fileTamanho"),
  fileMime: varchar("fileMime", { length: 100 }),
  numeroDocumento: varchar("numeroDocumento", { length: 120 }),
  dataEmissao: date("dataEmissao"),
  validade: date("validade"),
  obrigatorio: boolean("obrigatorio").default(true).notNull(),
  status: mysqlEnum("status", ["pendente", "aprovado", "reprovado"]).default("pendente").notNull(),
  motivoReprovacao: text("motivoReprovacao"),
  analisadoPor: int("analisadoPor"),
  analisadoAt: timestamp("analisadoAt"),
  uploadedBy: int("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RequestDocumentUpload = typeof requestDocumentUploads.$inferSelect;
