-- Auditoria: IP e navegador de quem fez a ação (dado pessoal; exibido só ao Administrador Geral).
-- Só adiciona colunas. Reversão: DROP COLUMN "ip", "userAgent".
ALTER TABLE smartdocplan.audit_logs
  ADD COLUMN IF NOT EXISTS ip varchar(64),
  ADD COLUMN IF NOT EXISTS "userAgent" varchar(300);
