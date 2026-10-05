import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock } from "lucide-react";
import { RECURRING_STATE_LABELS, formatCompetencia, recentCompetencias } from "@shared/recurring";
import { formatDateOnlyBr } from "@shared/formValidation";
import { RECURRING_STATE_COLORS } from "@/components/MonthlyDocsGrid";

/** Pendências de documentos mensais da empresa numa competência: quem ainda não enviou cada tipo. */
export function MonthlyPendencies({ companyId }: { companyId: number }) {
  const competencias = recentCompetencias(6).reverse();
  const [competencia, setCompetencia] = useState(competencias[0]);
  const { data } = trpc.recurringDocs.companyOverview.useQuery({ companyId, competencia }, { enabled: companyId > 0 });

  if (!data || (data.colaborador.length === 0 && data.empresa.length === 0)) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            Documentos mensais
          </CardTitle>
          <Select value={competencia} onValueChange={setCompetencia}>
            <SelectTrigger className="w-44" aria-label="Competência"><SelectValue /></SelectTrigger>
            <SelectContent>
              {competencias.map((c) => <SelectItem key={c} value={c}>Competência {formatCompetencia(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.colaborador.map((item) => (
          <div key={item.tipo.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{item.tipo.nome}</p>
              <p className="text-xs text-muted-foreground">
                {item.enviados} de {item.total} enviados · prazo {formatDateOnlyBr(item.prazo)}
              </p>
            </div>
            {item.faltando.length === 0 ? (
              <p className="mt-2 text-xs text-green-700 dark:text-green-400">Todos os colaboradores enviaram.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {item.faltando.map((linha) => (
                  <li key={linha.employeeId}>
                    <Link href={`/empresa/colaboradores/${linha.employeeId}`} className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:underline ${RECURRING_STATE_COLORS[linha.estado]}`}>
                      {linha.nome}
                      <span className="opacity-80">· {RECURRING_STATE_LABELS[linha.estado]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {data.empresa.length > 0 && (
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">Da empresa</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {data.empresa.map((item) => (
                <li key={item.tipo.id}>
                  <Badge variant="outline" className={RECURRING_STATE_COLORS[item.estado]}>
                    {item.tipo.nome} · {RECURRING_STATE_LABELS[item.estado]}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
