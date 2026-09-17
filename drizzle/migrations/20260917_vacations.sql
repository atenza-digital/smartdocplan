CREATE TABLE IF NOT EXISTS smartdocplan.vacations (
  id serial PRIMARY KEY,
  "companyId" integer NOT NULL REFERENCES smartdocplan.companies(id),
  "employeeId" integer NOT NULL REFERENCES smartdocplan.employees(id),
  "acquisitionStart" date NOT NULL,
  "acquisitionEnd" date NOT NULL,
  "concessionDeadline" date,
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  notes text,
  status varchar(24) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','pendente','aprovado','reprovado','cancelado')),
  "noticeFileUrl" text, "noticeFileName" varchar(255),
  "createdBy" integer NOT NULL, "reviewedBy" integer, "reviewedAt" timestamp,
  "reviewReason" text, revision integer NOT NULL DEFAULT 1,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
  CHECK ("endDate" >= "startDate"), CHECK ("acquisitionEnd" >= "acquisitionStart")
);
CREATE INDEX IF NOT EXISTS vacations_company_employee_idx ON smartdocplan.vacations ("companyId", "employeeId", "startDate");
CREATE TABLE IF NOT EXISTS smartdocplan.vacation_events (
  id serial PRIMARY KEY, "vacationId" integer NOT NULL REFERENCES smartdocplan.vacations(id),
  "userId" integer NOT NULL, action varchar(40) NOT NULL, details text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vacation_events_period_idx ON smartdocplan.vacation_events ("vacationId", "createdAt");
