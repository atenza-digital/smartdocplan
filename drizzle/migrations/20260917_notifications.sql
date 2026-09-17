CREATE TABLE IF NOT EXISTS smartdocplan.user_notifications (
  id serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "companyId" integer,
  tipo varchar(60) NOT NULL DEFAULT 'geral',
  titulo varchar(255) NOT NULL,
  mensagem text,
  link text,
  "lidaAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_type_idx ON smartdocplan.user_notifications ("userId", tipo);
