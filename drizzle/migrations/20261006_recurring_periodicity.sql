-- Documentos recorrentes: periodicidade (semanal a anual) e prazo em dias após o fim do período.
-- Os tipos existentes viram mensais com prazo igual ao antigo dia limite (fim do mês + N dias = dia N do mês seguinte).
-- A competência passa a guardar a data de início do período (AAAA-MM-DD); "AAAA-MM" vira "AAAA-MM-01".
-- Reversão: competencia = left(competencia, 7) onde periodicidade mensal; DROP COLUMN periodicidade, "prazoDias".
ALTER TABLE smartdocplan.recurring_document_types
  ADD COLUMN IF NOT EXISTS periodicidade text NOT NULL DEFAULT 'mensal'
    CHECK (periodicidade IN ('semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
  ADD COLUMN IF NOT EXISTS "prazoDias" integer NOT NULL DEFAULT 10 CHECK ("prazoDias" BETWEEN 0 AND 90);
UPDATE smartdocplan.recurring_document_types SET "prazoDias" = "diaLimite";

ALTER TABLE smartdocplan.employee_documents ALTER COLUMN competencia TYPE varchar(10);
ALTER TABLE smartdocplan.company_documents ALTER COLUMN competencia TYPE varchar(10);
UPDATE smartdocplan.employee_documents SET competencia = competencia || '-01' WHERE length(competencia) = 7;
UPDATE smartdocplan.company_documents SET competencia = competencia || '-01' WHERE length(competencia) = 7;
