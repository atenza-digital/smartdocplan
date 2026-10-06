-- Fase 2: checklist de documentos do colaborador, validação pela equipe SmartDocPlan e liberação.
-- Só adiciona colunas. Reversão: DROP COLUMN das colunas abaixo e SET DEFAULT 100 em "scoreConformidade".
ALTER TABLE smartdocplan.employee_documents
  ADD COLUMN IF NOT EXISTS "requirementId" integer REFERENCES smartdocplan.position_requirements(id),
  ADD COLUMN IF NOT EXISTS "analisadoPor" integer REFERENCES smartdocplan.users(id),
  ADD COLUMN IF NOT EXISTS "analisadoAt" timestamp,
  ADD COLUMN IF NOT EXISTS "motivoRejeicao" text;
CREATE INDEX IF NOT EXISTS employee_documents_employee_idx ON smartdocplan.employee_documents ("employeeId");
CREATE INDEX IF NOT EXISTS employee_documents_status_idx ON smartdocplan.employee_documents (status);

ALTER TABLE smartdocplan.employees
  ADD COLUMN IF NOT EXISTS liberacao text NOT NULL DEFAULT 'aguardando_documentacao',
  ADD COLUMN IF NOT EXISTS "liberadoAt" timestamp;

-- A conformidade passa a ser calculada pelo servidor; NULL significa "sem requisitos definidos".
-- O valor 100 gravado por padrão não era calculado e é recalculado na subida do servidor.
ALTER TABLE smartdocplan.employees ALTER COLUMN "scoreConformidade" DROP DEFAULT;
