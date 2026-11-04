-- Validação dos documentos da empresa e dos recorrentes (Etapa 3b-1).
-- Documento da empresa ganha situação e análise; os já enviados ficam "valido" (nada muda para eles).
-- Exclusão de documento da empresa passa a ser lógica (status "excluido").
-- Tipo recorrente ganha "exigeValidacao" (padrão: sim).
-- Só adiciona colunas e índice.
-- Reversão: DROP INDEX smartdocplan.company_documents_status_idx;
--   ALTER TABLE smartdocplan.company_documents DROP COLUMN status, DROP COLUMN "analisadoPor", DROP COLUMN "analisadoAt", DROP COLUMN "motivoRejeicao";
--   ALTER TABLE smartdocplan.recurring_document_types DROP COLUMN "exigeValidacao";
ALTER TABLE smartdocplan.company_documents ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'valido';
ALTER TABLE smartdocplan.company_documents ADD COLUMN IF NOT EXISTS "analisadoPor" integer;
ALTER TABLE smartdocplan.company_documents ADD COLUMN IF NOT EXISTS "analisadoAt" timestamp;
ALTER TABLE smartdocplan.company_documents ADD COLUMN IF NOT EXISTS "motivoRejeicao" text;
CREATE INDEX IF NOT EXISTS company_documents_status_idx ON smartdocplan.company_documents (status);
ALTER TABLE smartdocplan.recurring_document_types ADD COLUMN IF NOT EXISTS "exigeValidacao" boolean NOT NULL DEFAULT true;
