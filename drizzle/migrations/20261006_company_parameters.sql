-- Parâmetros da empresa: prazos para sugerir férias a partir da admissão.
-- Só adiciona colunas. Reversão: DROP COLUMN "feriasMesesAquisicao", "feriasMesesParaSolicitar".
ALTER TABLE smartdocplan.companies
  ADD COLUMN IF NOT EXISTS "feriasMesesAquisicao" integer NOT NULL DEFAULT 12 CHECK ("feriasMesesAquisicao" BETWEEN 1 AND 24),
  ADD COLUMN IF NOT EXISTS "feriasMesesParaSolicitar" integer NOT NULL DEFAULT 1 CHECK ("feriasMesesParaSolicitar" BETWEEN 1 AND 12);
