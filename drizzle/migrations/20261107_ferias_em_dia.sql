-- Férias de quem já é contratado (Etapa 4): "Férias em dia até" por colaborador.
-- Períodos aquisitivos que terminam até essa data contam como já gozados (fora do sistema).
-- Só adiciona coluna; colaboradores existentes ficam com NULL (comportamento de antes).
-- Reversão: ALTER TABLE smartdocplan.employees DROP COLUMN "feriasEmDiaAte";
ALTER TABLE smartdocplan.employees ADD COLUMN IF NOT EXISTS "feriasEmDiaAte" date;
