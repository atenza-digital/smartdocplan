-- Requisitos por função: novo processo "outros" (demandas fora dos fluxos padrão).
-- Só adiciona um valor ao tipo. Um valor de enum não pode ser removido depois; para reverter, deixar de usá-lo.
ALTER TYPE smartdocplan.position_requirement_request_type ADD VALUE IF NOT EXISTS 'outros';
