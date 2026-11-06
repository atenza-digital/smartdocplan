-- Permissões editáveis por empresa (Etapa 5): perfis padrão editados e perfis personalizados.
-- Só cria tabela, índices e a coluna users."profileId" (NULL = perfil padrão do papel); nada existente muda.
-- Sem nenhuma linha nesta tabela, cada perfil da empresa segue as permissões padrão (regras de antes).
-- Reversão: ALTER TABLE smartdocplan.users DROP COLUMN "profileId"; DROP TABLE smartdocplan.company_profiles;
CREATE TABLE IF NOT EXISTS smartdocplan.company_profiles (
  id serial PRIMARY KEY,
  "companyId" integer NOT NULL,
  nome varchar(120) NOT NULL,
  "baseRole" text NOT NULL, -- company_admin | company_hr | company_manager | company_viewer
  permissoes text[] NOT NULL DEFAULT '{}',
  padrao boolean NOT NULL DEFAULT false, -- true = edição do perfil padrão do papel na empresa
  ativo boolean NOT NULL DEFAULT true,
  "criadoPor" integer,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
-- Um perfil padrão editado por papel e empresa; nomes únicos entre os perfis ativos da empresa.
CREATE UNIQUE INDEX IF NOT EXISTS company_profiles_padrao_uq
  ON smartdocplan.company_profiles ("companyId", "baseRole") WHERE padrao;
CREATE UNIQUE INDEX IF NOT EXISTS company_profiles_nome_uq
  ON smartdocplan.company_profiles ("companyId", lower(nome)) WHERE ativo;
ALTER TABLE smartdocplan.users ADD COLUMN IF NOT EXISTS "profileId" integer;
