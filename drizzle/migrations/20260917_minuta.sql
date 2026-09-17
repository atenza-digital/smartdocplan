CREATE TABLE IF NOT EXISTS smartdocplan.contracts (
  id serial PRIMARY KEY, "companyId" integer NOT NULL REFERENCES smartdocplan.companies(id),
  nome varchar(255) NOT NULL, codigo varchar(60), observacoes text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS smartdocplan.organizational_units (
  id serial PRIMARY KEY, "companyId" integer NOT NULL REFERENCES smartdocplan.companies(id),
  nome varchar(255) NOT NULL, codigo varchar(60), observacoes text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS smartdocplan.construction_works (
  id serial PRIMARY KEY, "companyId" integer NOT NULL REFERENCES smartdocplan.companies(id),
  nome varchar(255) NOT NULL, codigo varchar(60), observacoes text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contracts_company_idx ON smartdocplan.contracts ("companyId", status);
CREATE INDEX IF NOT EXISTS units_company_idx ON smartdocplan.organizational_units ("companyId", status);
CREATE INDEX IF NOT EXISTS works_company_idx ON smartdocplan.construction_works ("companyId", status);
ALTER TABLE smartdocplan.requests ADD COLUMN IF NOT EXISTS "positionId" integer REFERENCES smartdocplan.positions(id);
ALTER TABLE smartdocplan.requests ADD COLUMN IF NOT EXISTS "worksiteId" integer REFERENCES smartdocplan.worksites(id);
ALTER TABLE smartdocplan.requests ADD COLUMN IF NOT EXISTS "contractId" integer REFERENCES smartdocplan.contracts(id);
ALTER TABLE smartdocplan.requests ADD COLUMN IF NOT EXISTS "unitId" integer REFERENCES smartdocplan.organizational_units(id);
ALTER TABLE smartdocplan.requests ADD COLUMN IF NOT EXISTS "constructionWorkId" integer REFERENCES smartdocplan.construction_works(id);
ALTER TABLE smartdocplan.requests ADD COLUMN IF NOT EXISTS "contextSnapshot" text;
ALTER TABLE smartdocplan.requests ADD COLUMN IF NOT EXISTS "requirementsSnapshot" text;
