import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";
import { PERIODICIDADE_LABELS, RECURRING_STATE_LABELS, type Periodicidade, type RecurringCellState } from "@shared/recurring";
import { formatDateOnlyBr } from "@shared/formValidation";

export const RECURRING_STATE_COLORS: Record<RecurringCellState, string> = {
  aprovado: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  aguardando_validacao: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  rejeitado: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  a_enviar: "bg-muted text-muted-foreground border-border",
  atrasado: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  nao_se_aplica: "border-dashed border-border text-muted-foreground",
};

export type MonthlyCell = {
  competencia: string; // início do período (AAAA-MM-DD)
  rotulo: string;
  fim: string;
  aplica: boolean;
  prazo: string;
  estado: RecurringCellState;
  documento: { id: number; nome: string; fileUrl: string | null } | null;
};
export type MonthlyRow = {
  tipo: { id: number; nome: string; categoria: string; periodicidade: Periodicidade; prazoDias: number };
  celulas: MonthlyCell[];
};

/**
 * Grade de documentos recorrentes: cada linha é um tipo com seus últimos períodos encerrados
 * (cada tipo tem a sua periodicidade). Clicar num período sem envio abre o envio.
 */
export function MonthlyDocsGrid({
  linhas,
  canSend,
  onSend,
  titulo = "Documentos recorrentes",
}: {
  linhas: MonthlyRow[];
  canSend: boolean;
  onSend: (row: MonthlyRow, cell: MonthlyCell) => void;
  titulo?: string;
}) {
  if (linhas.length === 0) return null;
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          {titulo}
        </h3>
        <p className="text-sm text-muted-foreground">Últimos períodos encerrados de cada documento. O prazo conta a partir do fim do período.</p>
        <div className="mt-4 space-y-3">
          {linhas.map((row) => (
            <div key={row.tipo.id} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">
                {row.tipo.nome}
                <span className="ml-2 font-normal text-xs text-muted-foreground">
                  {PERIODICIDADE_LABELS[row.tipo.periodicidade]} · prazo de {row.tipo.prazoDias} dia(s) após o fim do período
                </span>
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {row.celulas.map((cell) => {
                  if (!cell.aplica) {
                    return (
                      <li key={cell.competencia} className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground" title="Não se aplica a este período">
                        {cell.rotulo} · —
                      </li>
                    );
                  }
                  const label = RECURRING_STATE_LABELS[cell.estado];
                  const title = `${row.tipo.nome} ${cell.rotulo}: ${label}. Prazo ${formatDateOnlyBr(cell.prazo)}.`;
                  const className = `inline-block rounded-md border px-2 py-1 text-xs ${RECURRING_STATE_COLORS[cell.estado]}`;
                  return (
                    <li key={cell.competencia}>
                      {cell.documento?.fileUrl ? (
                        <a href={cell.documento.fileUrl} target="_blank" rel="noopener noreferrer" title={title} className={`${className} hover:underline`}>
                          {cell.rotulo} · {label}
                        </a>
                      ) : canSend && !cell.documento ? (
                        <button type="button" title={`${title} Clique para enviar.`} onClick={() => onSend(row, cell)} className={`${className} hover:ring-1 hover:ring-primary`}>
                          {cell.rotulo} · {label}
                        </button>
                      ) : (
                        <span title={title} className={className}>{cell.rotulo} · {label}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
