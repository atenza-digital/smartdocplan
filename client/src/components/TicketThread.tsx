import { trpc } from "@/lib/trpc";
import { Building2, Headset, MessageSquare } from "lucide-react";

export const TICKET_STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em Atendimento",
  aguardando_cliente: "Aguardando Retorno",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

function formatDateTime(value: string | Date) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Conversa do chamado: a descrição da empresa abre a conversa, seguida das mensagens. */
export function TicketThread({ ticket }: { ticket: { id: number; descricao?: string | null; createdAt: string | Date } }) {
  const { data: mensagens = [], isLoading } = trpc.tickets.messages.useQuery({ ticketId: ticket.id });

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">Empresa</span>
          <span>· abertura · {formatDateTime(ticket.createdAt)}</span>
        </div>
        <p className="mt-2 whitespace-pre-line break-words text-sm text-foreground">
          {ticket.descricao?.trim() || "Sem descrição."}
        </p>
      </div>

      {isLoading && <div className="h-16 animate-pulse rounded-lg bg-muted" />}

      {mensagens.map((msg) => {
        const daEquipe = msg.origem === "plataforma";
        return (
          <div
            key={msg.id}
            className={`rounded-lg border p-3 ${daEquipe ? "border-primary/30 bg-primary/5 sm:ml-8" : "border-border bg-muted/30 sm:mr-8"}`}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              {daEquipe ? <Headset className="h-3.5 w-3.5 text-primary" /> : <Building2 className="h-3.5 w-3.5" />}
              <span className="font-medium text-foreground">
                {msg.autorNome ?? (daEquipe ? "Equipe" : "Empresa")}
              </span>
              <span>· {daEquipe ? "Equipe SmartDocPlan" : "Empresa"} · {formatDateTime(msg.createdAt)}</span>
            </div>
            {msg.statusNovo && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Status: {TICKET_STATUS_LABELS[msg.statusAnterior ?? ""] ?? msg.statusAnterior ?? "—"} →{" "}
                <span className="font-medium text-foreground">{TICKET_STATUS_LABELS[msg.statusNovo] ?? msg.statusNovo}</span>
              </p>
            )}
            {msg.mensagem && (
              <p className="mt-2 whitespace-pre-line break-words text-sm text-foreground">{msg.mensagem}</p>
            )}
          </div>
        );
      })}

      {!isLoading && mensagens.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          Ainda não há respostas neste chamado.
        </p>
      )}
    </div>
  );
}
