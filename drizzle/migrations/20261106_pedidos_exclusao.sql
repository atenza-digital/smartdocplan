-- Pedidos de exclusão de documentos (Etapa 3b-2): a empresa pede, a equipe SmartDocPlan aprova ou rejeita.
-- Só cria tabela e índices; nada existente muda.
-- Reversão: DROP TABLE smartdocplan.document_change_requests;
CREATE TABLE IF NOT EXISTS smartdocplan.document_change_requests (
  id serial PRIMARY KEY,
  "companyId" integer NOT NULL,
  alvo text NOT NULL, -- colaborador | empresa
  "documentoId" integer NOT NULL,
  "employeeId" integer,
  "documentoNome" varchar(255) NOT NULL,
  categoria text,
  motivo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente', -- pendente | aprovado | rejeitado | cancelado
  "solicitadoPor" integer NOT NULL,
  "analisadoPor" integer,
  "analisadoAt" timestamp,
  "motivoDecisao" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
-- Um pedido pendente por documento.
CREATE UNIQUE INDEX IF NOT EXISTS document_change_requests_pendente_uq
  ON smartdocplan.document_change_requests (alvo, "documentoId") WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS document_change_requests_status_idx
  ON smartdocplan.document_change_requests (status, "companyId");
