-- Endereço completo com CEP nos locais (frentes/obras) e endereço da empresa.
-- Só adiciona colunas. Reversão: DROP COLUMN das colunas abaixo.
ALTER TABLE smartdocplan.worksites
  ADD COLUMN IF NOT EXISTS cep varchar(9),
  ADD COLUMN IF NOT EXISTS numero varchar(20),
  ADD COLUMN IF NOT EXISTS complemento varchar(100),
  ADD COLUMN IF NOT EXISTS bairro varchar(100);

ALTER TABLE smartdocplan.companies
  ADD COLUMN IF NOT EXISTS cep varchar(9),
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS numero varchar(20),
  ADD COLUMN IF NOT EXISTS complemento varchar(100),
  ADD COLUMN IF NOT EXISTS bairro varchar(100),
  ADD COLUMN IF NOT EXISTS cidade varchar(100),
  ADD COLUMN IF NOT EXISTS estado varchar(2);
