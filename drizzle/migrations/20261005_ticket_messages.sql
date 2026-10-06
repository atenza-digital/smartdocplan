CREATE TABLE IF NOT EXISTS smartdocplan.ticket_messages (
  id serial PRIMARY KEY,
  "ticketId" integer NOT NULL REFERENCES smartdocplan.tickets(id),
  "companyId" integer NOT NULL,
  "autorId" integer NOT NULL,
  origem varchar(20) NOT NULL,
  mensagem text NOT NULL,
  "statusAnterior" text,
  "statusNovo" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx ON smartdocplan.ticket_messages ("ticketId", "createdAt");
