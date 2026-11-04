-- Troca obrigatória da senha provisória: usuário novo ou com senha redefinida pelo administrador
-- precisa criar a própria senha no primeiro acesso. Usuários existentes ficam como estão (false).
-- Só adiciona uma coluna. Reversão: DROP COLUMN "mustChangePassword".
ALTER TABLE smartdocplan.users ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean NOT NULL DEFAULT false;
