import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ClipboardList, Lock, Upload } from "lucide-react";
import { CHECKLIST_STATE_LABELS, RELEASE_LABELS, type ChecklistItemState, type EmployeeRelease } from "@shared/compliance";
import { formatDateOnlyBr } from "@shared/formValidation";

export const RELEASE_COLORS: Record<EmployeeRelease, string> = {
  liberado: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  em_analise: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  aguardando_documentacao: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  sem_requisitos: "bg-muted text-muted-foreground border-border",
};

const STATE_COLORS: Record<ChecklistItemState, string> = {
  aprovado: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  aguardando_validacao: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  pendente: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  rejeitado: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  vencido: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

export type ChecklistItem = {
  requirementId: number;
  documentoNome: string;
  categoria: string;
  validadeMeses: number | null;
  estado: ChecklistItemState;
  restrito: boolean;
  documento: { id: number; nome: string; validade: string | null; dataEmissao: string | null } | null;
};

/** Checklist dos documentos exigidos pelo cargo, com a liberação do colaborador. */
export function DossieChecklist({
  items,
  total,
  aprovados,
  liberacao,
  canSend,
  onSend,
}: {
  items: ChecklistItem[];
  total: number;
  aprovados: number;
  liberacao: EmployeeRelease;
  canSend: boolean;
  onSend: (item: ChecklistItem) => void;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Documentos exigidos para liberação
            </h3>
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? "O cargo deste colaborador não tem documentos obrigatórios cadastrados em Configurações › Funções."
                : `${aprovados} de ${total} aprovados e válidos. O colaborador é liberado quando todos estiverem aprovados pela equipe SmartDocPlan.`}
            </p>
          </div>
          <Badge variant="outline" className={RELEASE_COLORS[liberacao]}>{RELEASE_LABELS[liberacao]}</Badge>
        </div>

        {total > 0 && (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {items.map((item) => (
              <li key={item.requirementId} className="flex flex-wrap items-center gap-3 p-3">
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    {item.estado === "aprovado" && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                    {item.documentoNome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.restrito ? (
                      <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" />Dado de saúde: documento visível só para Administrador Geral e RH</span>
                    ) : item.documento ? (
                      <>
                        Enviado: {item.documento.nome}
                        {item.documento.validade ? ` · validade ${formatDateOnlyBr(item.documento.validade)}` : ""}
                      </>
                    ) : (
                      <>Ainda não enviado{item.validadeMeses ? ` · validade de ${item.validadeMeses} meses` : ""}</>
                    )}
                  </p>
                </div>
                <Badge variant="outline" className={`text-xs ${STATE_COLORS[item.estado]}`}>{CHECKLIST_STATE_LABELS[item.estado]}</Badge>
                {canSend && !item.restrito && item.estado !== "aprovado" && item.estado !== "aguardando_validacao" && (
                  <Button size="sm" variant="outline" onClick={() => onSend(item)}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {item.documento ? "Enviar novo" : "Enviar"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
