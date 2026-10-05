import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";
import { RECURRING_STATE_LABELS, formatCompetencia, type RecurringCellState } from "@shared/recurring";
import { formatDateOnlyBr } from "@shared/formValidation";

export const RECURRING_STATE_COLORS: Record<RecurringCellState, string> = {
  aprovado: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  aguardando_validacao: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  rejeitado: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  a_enviar: "bg-muted text-muted-foreground border-border",
  atrasado: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
};

export type MonthlyCell = {
  competencia: string;
  aplica: boolean;
  prazo: string;
  estado: RecurringCellState;
  documento: { id: number; nome: string; fileUrl: string | null } | null;
};
export type MonthlyRow = { tipo: { id: number; nome: string; categoria: string; diaLimite: number }; celulas: MonthlyCell[] };

/** Grade de documentos mensais do colaborador: tipos × competências. Clicar numa competência sem envio abre o envio. */
export function MonthlyDocsGrid({
  competencias,
  linhas,
  canSend,
  onSend,
}: {
  competencias: string[];
  linhas: MonthlyRow[];
  canSend: boolean;
  onSend: (row: MonthlyRow, cell: MonthlyCell) => void;
}) {
  if (linhas.length === 0) return null;
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          Documentos mensais
        </h3>
        <p className="text-sm text-muted-foreground">Últimas competências encerradas. O prazo é o dia limite do mês seguinte.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="text-left font-medium text-muted-foreground">Documento</th>
                {competencias.map((c) => <th key={c} className="font-medium text-muted-foreground">{formatCompetencia(c)}</th>)}
              </tr>
            </thead>
            <tbody>
              {linhas.map((row) => (
                <tr key={row.tipo.id}>
                  <td className="pr-2 font-medium text-foreground">
                    {row.tipo.nome}
                    <span className="block font-normal text-muted-foreground">até dia {row.tipo.diaLimite}</span>
                  </td>
                  {row.celulas.map((cell) => {
                    if (!cell.aplica) return <td key={cell.competencia} className="text-center text-muted-foreground">—</td>;
                    const label = RECURRING_STATE_LABELS[cell.estado];
                    const title = `${row.tipo.nome} ${formatCompetencia(cell.competencia)}: ${label}. Prazo ${formatDateOnlyBr(cell.prazo)}.`;
                    const className = `w-full rounded-md border px-1.5 py-1 text-center ${RECURRING_STATE_COLORS[cell.estado]}`;
                    if (cell.documento?.fileUrl) {
                      return (
                        <td key={cell.competencia}>
                          <a href={cell.documento.fileUrl} target="_blank" rel="noopener noreferrer" title={title} className={`block hover:underline ${className}`}>{label}</a>
                        </td>
                      );
                    }
                    return (
                      <td key={cell.competencia}>
                        {canSend && !cell.documento ? (
                          <button type="button" title={`${title} Clique para enviar.`} onClick={() => onSend(row, cell)} className={`${className} hover:ring-1 hover:ring-primary`}>
                            {label}
                          </button>
                        ) : (
                          <span title={title} className={`block ${className}`}>{label}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
