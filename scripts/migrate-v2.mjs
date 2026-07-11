import { Client } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const schema = process.env.PGSCHEMA || "smartdocplan";
const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();

try {
  console.log("Iniciando migracao v2 PostgreSQL...");
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await client.query(`SET search_path TO ${schema}`);

  await client.query(`
    ALTER TABLE IF EXISTS requests
      ADD COLUMN IF NOT EXISTS "checklistCompleto" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "responsavelId" integer
  `);
  console.log("requests: colunas v2 garantidas");

  await client.query(`
    ALTER TABLE IF EXISTS tickets
      ADD COLUMN IF NOT EXISTS "responsavelId" integer
  `);
  console.log("tickets: colunas v2 garantidas");

  await client.query(`
    CREATE TABLE IF NOT EXISTS request_documents (
      id serial PRIMARY KEY,
      "requestId" integer NOT NULL,
      nome varchar(255) NOT NULL,
      tipo varchar(100),
      "fileUrl" text,
      "fileKey" text,
      obrigatorio boolean NOT NULL DEFAULT false,
      "uploadedBy" integer,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);
  console.log("request_documents: tabela garantida");

  await client.query(`
    CREATE TABLE IF NOT EXISTS document_type_templates (
      id serial PRIMARY KEY,
      "tipoSolicitacao" text NOT NULL,
      categoria text NOT NULL DEFAULT 'pessoal',
      nome varchar(255) NOT NULL,
      descricao text,
      obrigatorio boolean NOT NULL DEFAULT true,
      sexo text NOT NULL DEFAULT 'todos',
      ativo boolean NOT NULL DEFAULT true,
      ordem integer NOT NULL DEFAULT 0,
      "criadoPor" integer,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `);
  console.log("document_type_templates: tabela garantida");

  await client.query(`
    CREATE TABLE IF NOT EXISTS request_document_uploads (
      id serial PRIMARY KEY,
      "requestId" integer NOT NULL,
      "templateId" integer,
      nome varchar(255) NOT NULL,
      categoria text NOT NULL DEFAULT 'pessoal',
      "fileUrl" text,
      "fileKey" text,
      "fileNome" varchar(255),
      "fileTamanho" integer,
      "fileMime" varchar(100),
      obrigatorio boolean NOT NULL DEFAULT true,
      status text NOT NULL DEFAULT 'pendente',
      "motivoReprovacao" text,
      "analisadoPor" integer,
      "analisadoAt" timestamp,
      "uploadedBy" integer,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `);
  console.log("request_document_uploads: tabela garantida");

  const templates = [
    ["admissao", "pessoal", "RG (Identidade)", "Copia do documento de identidade", true, "todos", 1],
    ["admissao", "pessoal", "CPF", "Copia do CPF", true, "todos", 2],
    ["admissao", "pessoal", "Titulo de Eleitor", "Copia do titulo de eleitor", true, "todos", 3],
    ["admissao", "pessoal", "Certificado de Reservista", "Copia do certificado militar", false, "masculino", 4],
    ["admissao", "pessoal", "Comprovante de Residencia", "Conta recente", true, "todos", 5],
    ["admissao", "pessoal", "Foto 3x4", "Foto recente fundo branco", true, "todos", 6],
    ["admissao", "pessoal", "Carteira de Trabalho (CTPS)", "Paginas de identificacao", true, "todos", 7],
    ["admissao", "pessoal", "PIS/PASEP", "Numero do PIS ou PASEP", true, "todos", 8],
    ["admissao", "exame_medico", "ASO - Admissional", "Atestado de Saude Ocupacional", true, "todos", 9],
    ["demissao", "pessoal", "Termo de Rescisao", "TRCT assinado", true, "todos", 1],
    ["demissao", "exame_medico", "ASO - Demissional", "Atestado de Saude Ocupacional demissional", true, "todos", 2],
    ["afastamento", "exame_medico", "Atestado Medico", "Atestado ou laudo medico", true, "todos", 1],
    ["afastamento", "pessoal", "Formulario de Afastamento", "Formulario preenchido", true, "todos", 2],
    ["atestado_medico", "exame_medico", "Atestado Medico", "Atestado medico com CRM e CID", true, "todos", 1],
    ["mudanca_funcao", "pessoal", "Aditivo Contratual", "Aditivo assinado", true, "todos", 1],
    ["mudanca_funcao", "treinamento", "Certificado de Treinamento", "Certificado para a nova funcao", false, "todos", 2],
  ];

  const { rows } = await client.query(
    `SELECT count(*)::int AS count FROM document_type_templates WHERE "tipoSolicitacao" = 'admissao'`,
  );

  if (rows[0].count === 0) {
    for (const template of templates) {
      await client.query(
        `INSERT INTO document_type_templates
          ("tipoSolicitacao", categoria, nome, descricao, obrigatorio, sexo, ordem)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        template,
      );
    }
    console.log("Templates padrao de documentos inseridos");
  }

  console.log("Migracao v2 PostgreSQL concluida com sucesso.");
} finally {
  await client.end();
}
