DO $$ BEGIN
 CREATE TYPE "smartdocplan"."company_status" AS ENUM ('ativo','inativo','suspenso');
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "smartdocplan"."position_requirement_category" AS ENUM ('treinamento','exame_medico','psicossocial','outros');
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "smartdocplan"."position_requirement_request_type" AS ENUM ('admissao','demissao','mudanca_funcao','todos');
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE "smartdocplan"."audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"companyId" integer,
	"action" varchar(255) NOT NULL,
	"entity" varchar(100),
	"entityId" integer,
	"details" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"razaoSocial" varchar(255) NOT NULL,
	"nomeFantasia" varchar(255),
	"cnpj" varchar(18),
	"email" varchar(320),
	"telefone" varchar(20),
	"logoUrl" text,
	"status" "smartdocplan"."company_status" DEFAULT 'ativo' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."company_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"fileUrl" text,
	"fileKey" text,
	"validade" date,
	"observacao" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."document_type_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipoSolicitacao" text NOT NULL,
	"categoria" text DEFAULT 'pessoal' NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"obrigatorio" boolean DEFAULT true NOT NULL,
	"sexo" text DEFAULT 'todos' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criadoPor" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."employee_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"companyId" integer NOT NULL,
	"categoria" text NOT NULL,
	"nome" varchar(255) NOT NULL,
	"tipo" varchar(100),
	"fileUrl" text,
	"fileKey" text,
	"validade" date,
	"versao" integer DEFAULT 1 NOT NULL,
	"obrigatorio" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'valido' NOT NULL,
	"observacao" text,
	"uploadedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cpf" varchar(14) NOT NULL,
	"dataNascimento" date,
	"positionId" integer,
	"worksiteId" integer,
	"dataAdmissao" date,
	"salario" numeric(10, 2),
	"status" text DEFAULT 'ativo' NOT NULL,
	"email" varchar(320),
	"telefone" varchar(20),
	"scoreConformidade" integer DEFAULT 100,
	"criadoPor" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."legal_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"norma" varchar(50) NOT NULL,
	"requisito" varchar(255) NOT NULL,
	"documentoExigido" varchar(255) NOT NULL,
	"validadeMeses" integer,
	"descricao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."position_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"positionId" integer NOT NULL,
	"legalRequirementId" integer,
	"categoria" "smartdocplan"."position_requirement_category" DEFAULT 'treinamento' NOT NULL,
	"tipoSolicitacao" "smartdocplan"."position_requirement_request_type" DEFAULT 'todos' NOT NULL,
	"documentoNome" varchar(255) NOT NULL,
	"descricao" text,
	"obrigatorio" boolean DEFAULT true NOT NULL,
	"validadeMeses" integer,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"cbo" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."request_document_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" integer NOT NULL,
	"templateId" integer,
	"nome" varchar(255) NOT NULL,
	"categoria" text DEFAULT 'pessoal' NOT NULL,
	"fileUrl" text,
	"fileKey" text,
	"fileNome" varchar(255),
	"fileTamanho" integer,
	"fileMime" varchar(100),
	"numeroDocumento" varchar(120),
	"dataEmissao" date,
	"validade" date,
	"obrigatorio" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"motivoReprovacao" text,
	"analisadoPor" integer,
	"analisadoAt" timestamp,
	"uploadedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."request_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"tipo" varchar(100),
	"fileUrl" text,
	"fileKey" text,
	"obrigatorio" boolean DEFAULT false NOT NULL,
	"uploadedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"employeeId" integer,
	"tipo" text NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text,
	"status" text DEFAULT 'nova' NOT NULL,
	"prioridade" text DEFAULT 'media' NOT NULL,
	"checklistCompleto" boolean DEFAULT false NOT NULL,
	"criadoPor" integer NOT NULL,
	"responsavelId" integer,
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"concluidoAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"tipo" text NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text,
	"status" text DEFAULT 'aberto' NOT NULL,
	"prioridade" text DEFAULT 'media' NOT NULL,
	"criadoPor" integer NOT NULL,
	"responsavelId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"resolvidoAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64),
	"name" text,
	"email" varchar(320),
	"passwordHash" varchar(255),
	"loginMethod" varchar(64) DEFAULT 'local',
	"ativo" boolean DEFAULT true NOT NULL,
	"role" text DEFAULT 'company_viewer' NOT NULL,
	"companyId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "smartdocplan"."worksites" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cnos" varchar(30),
	"endereco" text,
	"cidade" varchar(100),
	"estado" varchar(2),
	"dataInicio" date,
	"dataFim" date,
	"status" text DEFAULT 'ativo' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
