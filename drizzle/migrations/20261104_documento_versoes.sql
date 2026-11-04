-- Versões dos documentos do colaborador: alterar arquivo ou datas cria um registro novo ligado ao anterior.
-- A versão anterior aprovada continua valendo até a nova ser aprovada; depois vira "substituido" (histórico).
-- Só adiciona coluna e índice; documentos existentes ficam com NULL (sem versão anterior).
-- Reversão: DROP INDEX smartdocplan.employee_documents_substitui_idx; ALTER TABLE ... DROP COLUMN "substituiDocId".
ALTER TABLE smartdocplan.employee_documents ADD COLUMN IF NOT EXISTS "substituiDocId" integer;
CREATE INDEX IF NOT EXISTS employee_documents_substitui_idx ON smartdocplan.employee_documents ("substituiDocId");
