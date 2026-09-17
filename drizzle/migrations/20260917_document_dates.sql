ALTER TABLE smartdocplan.company_documents ADD COLUMN IF NOT EXISTS "dataEmissao" date;
ALTER TABLE smartdocplan.employee_documents ADD COLUMN IF NOT EXISTS "dataEmissao" date;
CREATE TABLE IF NOT EXISTS smartdocplan.company_update_requests (
  id serial PRIMARY KEY,
  "companyId" integer NOT NULL,
  "requestedBy" integer NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'pendente',
  payload text NOT NULL,
  motivo text,
  "reviewedBy" integer,
  "reviewedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
