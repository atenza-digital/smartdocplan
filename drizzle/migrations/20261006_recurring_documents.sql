-- Fase 2: documentos mensais (recorrentes) cadastrados por empresa, para colaboradores ou para a própria empresa.
-- Só adiciona. Reversão: DROP das colunas "recurringTypeId"/competencia e DROP TABLE recurring_document_types.
CREATE TABLE IF NOT EXISTS smartdocplan.recurring_document_types (
  id serial PRIMARY KEY,
  "companyId" integer NOT NULL REFERENCES smartdocplan.companies(id),
  nome varchar(255) NOT NULL,
  alvo text NOT NULL DEFAULT 'colaborador' CHECK (alvo IN ('colaborador', 'empresa')),
  categoria text NOT NULL DEFAULT 'outros',
  "diaLimite" integer NOT NULL DEFAULT 10 CHECK ("diaLimite" BETWEEN 1 AND 28),
  ativo boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recurring_document_types_company_idx ON smartdocplan.recurring_document_types ("companyId");

-- Competência no formato AAAA-MM (mês a que o documento se refere).
ALTER TABLE smartdocplan.employee_documents
  ADD COLUMN IF NOT EXISTS "recurringTypeId" integer REFERENCES smartdocplan.recurring_document_types(id),
  ADD COLUMN IF NOT EXISTS competencia varchar(7);
ALTER TABLE smartdocplan.company_documents
  ADD COLUMN IF NOT EXISTS "recurringTypeId" integer REFERENCES smartdocplan.recurring_document_types(id),
  ADD COLUMN IF NOT EXISTS competencia varchar(7);
CREATE INDEX IF NOT EXISTS employee_documents_recurring_idx ON smartdocplan.employee_documents ("recurringTypeId", competencia);
CREATE INDEX IF NOT EXISTS company_documents_recurring_idx ON smartdocplan.company_documents ("recurringTypeId", competencia);
