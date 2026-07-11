import {
  boolean,
  date,
  decimal,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

const smartdocSchema = pgSchema("smartdocplan");
const companyStatusEnum = smartdocSchema.enum("company_status", ["ativo", "inativo", "suspenso"] as const);
const positionRequirementCategoryEnum = smartdocSchema.enum("position_requirement_category", ["treinamento", "exame_medico", "psicossocial", "outros"] as const);
const positionRequirementRequestTypeEnum = smartdocSchema.enum("position_requirement_request_type", ["admissao", "demissao", "mudanca_funcao", "todos"] as const);

// --- USERS ---
// Papeis da plataforma:
// platform_admin    = Administrador da Plataforma (SmartDocPlan)
// platform_analyst  = Analista RH interno
// platform_auditor  = Auditor interno
// company_admin     = Administrador da Empresa cliente
// company_hr        = RH da Empresa
// company_manager   = Gestor da Empresa
// company_viewer    = Consulta (somente leitura)
export const users = smartdocSchema.table("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // mantido para compat OAuth, agora opcional
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }), // autenticacao propria
  loginMethod: varchar("loginMethod", { length: 64 }).default("local"),
  ativo: boolean("ativo").default(true).notNull(),
  role: text("role").default("company_viewer").notNull(),
  companyId: integer("companyId"), // null = usuario interno da plataforma
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// --- COMPANIES ---
export const companies = smartdocSchema.table("companies", {
  id: serial("id").primaryKey(),
  razaoSocial: varchar("razaoSocial", { length: 255 }).notNull(),
  nomeFantasia: varchar("nomeFantasia", { length: 255 }),
  cnpj: varchar("cnpj", { length: 18 }).unique(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  logoUrl: text("logoUrl"),
  status: companyStatusEnum("status").default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// --- COMPANY DOCUMENTS ---
export const companyDocuments = smartdocSchema.table("company_documents", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  fileUrl: text("fileUrl"),
  fileKey: text("fileKey"),
  validade: date("validade"),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// --- WORKSITES (OBRAS/CNOs) ---
export const worksites = smartdocSchema.table("worksites", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cnos: varchar("cnos", { length: 30 }),
  endereco: text("endereco"),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  dataInicio: date("dataInicio"),
  dataFim: date("dataFim"),
  status: text("status").default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- POSITIONS (CARGOS) ---
// Cargos sao por empresa (companyId obrigatorio)
export const positions = smartdocSchema.table("positions", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  cbo: varchar("cbo", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- LEGAL REQUIREMENTS (MATRIZ NRs) ---
// Matriz legal e por empresa (companyId obrigatorio)
export const legalRequirements = smartdocSchema.table("legal_requirements", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(), // vinculado Ã  empresa
  norma: varchar("norma", { length: 50 }).notNull(),
  requisito: varchar("requisito", { length: 255 }).notNull(),
  documentoExigido: varchar("documentoExigido", { length: 255 }).notNull(),
  validadeMeses: integer("validadeMeses"),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- POSITION REQUIREMENTS (DOCUMENTOS POR CARGO) ---
export const positionRequirements = smartdocSchema.table("position_requirements", {
  id: serial("id").primaryKey(),
  positionId: integer("positionId").notNull(),
  legalRequirementId: integer("legalRequirementId"),
  categoria: positionRequirementCategoryEnum("categoria").default("treinamento").notNull(),
  tipoSolicitacao: positionRequirementRequestTypeEnum("tipoSolicitacao").default("todos").notNull(),
  documentoNome: varchar("documentoNome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  obrigatorio: boolean("obrigatorio").default(true).notNull(),
  validadeMeses: integer("validadeMeses"),
  ordem: integer("ordem").default(0).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// --- EMPLOYEES (COLABORADORES) ---
export const employees = smartdocSchema.table("employees", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull(),
  dataNascimento: date("dataNascimento"),
  positionId: integer("positionId"),
  worksiteId: integer("worksiteId"),
  dataAdmissao: date("dataAdmissao"),
  salario: decimal("salario", { precision: 10, scale: 2 }),
  status: text("status").default("ativo").notNull(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  scoreConformidade: integer("scoreConformidade").default(100),
  criadoPor: integer("criadoPor"), // userId do analista interno que cadastrou
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// --- EMPLOYEE DOCUMENTS (DOSSIE DIGITAL) ---
export const employeeDocuments = smartdocSchema.table("employee_documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employeeId").notNull(),
  companyId: integer("companyId").notNull(),
  categoria: text("categoria").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 100 }),
  fileUrl: text("fileUrl"),
  fileKey: text("fileKey"),
  validade: date("validade"),
  versao: integer("versao").default(1).notNull(),
  obrigatorio: boolean("obrigatorio").default(true).notNull(),
  status: text("status").default("valido").notNull(),
  observacao: text("observacao"),
  uploadedBy: integer("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// --- REQUESTS (SOLICITACÃ•ES DE RH) ---
export const requests = smartdocSchema.table("requests", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  employeeId: integer("employeeId"),
  tipo: text("tipo").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  status: text("status").default("nova").notNull(),
  prioridade: text("prioridade").default("media").notNull(),
  checklistCompleto: boolean("checklistCompleto").default(false).notNull(),
  criadoPor: integer("criadoPor").notNull(),
  responsavelId: integer("responsavelId"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  concluidoAt: timestamp("concluidoAt"),
});

export type Request = typeof requests.$inferSelect;
export type InsertRequest = typeof requests.$inferInsert;

// --- REQUEST DOCUMENTS ---
export const requestDocuments = smartdocSchema.table("request_documents", {
  id: serial("id").primaryKey(),
  requestId: integer("requestId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 100 }),
  fileUrl: text("fileUrl"),
  fileKey: text("fileKey"),
  obrigatorio: boolean("obrigatorio").default(false).notNull(),
  uploadedBy: integer("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- TICKETS (CHAMADOS) ---
export const tickets = smartdocSchema.table("tickets", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  tipo: text("tipo").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  status: text("status").default("aberto").notNull(),
  prioridade: text("prioridade").default("media").notNull(),
  criadoPor: integer("criadoPor").notNull(),
  responsavelId: integer("responsavelId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  resolvidoAt: timestamp("resolvidoAt"),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// --- AUDIT LOGS ---
export const auditLogs = smartdocSchema.table("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  companyId: integer("companyId"),
  action: varchar("action", { length: 255 }).notNull(),
  entity: varchar("entity", { length: 100 }),
  entityId: integer("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// --- DOCUMENT TYPE TEMPLATES (admin configura quais docs exigir por tipo de solicitaÃ§Ã£o) ---
export const documentTypeTemplates = smartdocSchema.table("document_type_templates", {
  id: serial("id").primaryKey(),
  tipoSolicitacao: text("tipoSolicitacao").notNull(),
  categoria: text("categoria").default("pessoal").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  obrigatorio: boolean("obrigatorio").default(true).notNull(),
  sexo: text("sexo").default("todos").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  ordem: integer("ordem").default(0).notNull(),
  criadoPor: integer("criadoPor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type DocumentTypeTemplate = typeof documentTypeTemplates.$inferSelect;

// --- REQUEST DOCUMENT UPLOADS (uploads reais vinculados a solicitaÃ§Ãµes) ---
export const requestDocumentUploads = smartdocSchema.table("request_document_uploads", {
  id: serial("id").primaryKey(),
  requestId: integer("requestId").notNull(),
  templateId: integer("templateId"),
  nome: varchar("nome", { length: 255 }).notNull(),
  categoria: text("categoria").default("pessoal").notNull(),
  fileUrl: text("fileUrl"),
  fileKey: text("fileKey"),
  fileNome: varchar("fileNome", { length: 255 }),
  fileTamanho: integer("fileTamanho"),
  fileMime: varchar("fileMime", { length: 100 }),
  numeroDocumento: varchar("numeroDocumento", { length: 120 }),
  dataEmissao: date("dataEmissao"),
  validade: date("validade"),
  obrigatorio: boolean("obrigatorio").default(true).notNull(),
  status: text("status").default("pendente").notNull(),
  motivoReprovacao: text("motivoReprovacao"),
  analisadoPor: integer("analisadoPor"),
  analisadoAt: timestamp("analisadoAt"),
  uploadedBy: integer("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type RequestDocumentUpload = typeof requestDocumentUploads.$inferSelect;
