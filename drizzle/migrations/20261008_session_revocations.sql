-- Sessões encerradas antes de expirar: logout (por token) e troca de senha (todas as sessões anteriores do usuário).
-- Só cria tabela nova. Reversão: DROP TABLE smartdocplan.session_revocations.
CREATE TABLE IF NOT EXISTS smartdocplan.session_revocations (
  id serial PRIMARY KEY,
  "tokenHash" varchar(64),
  "userId" integer NOT NULL,
  "revokedBefore" timestamp,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS session_revocations_token_idx
  ON smartdocplan.session_revocations ("tokenHash") WHERE "tokenHash" IS NOT NULL;
CREATE INDEX IF NOT EXISTS session_revocations_user_idx
  ON smartdocplan.session_revocations ("userId") WHERE "revokedBefore" IS NOT NULL;
CREATE INDEX IF NOT EXISTS session_revocations_expires_idx
  ON smartdocplan.session_revocations ("expiresAt");
