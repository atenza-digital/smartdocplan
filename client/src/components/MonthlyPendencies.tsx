import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock } from "lucide-react";
import { PERIODICIDADE_LABELS, RECURRING_STATE_LABELS } from "@shared/recurring";
import { formatDateOnlyBr } from "@shared/formValidation";
import { RECURRING_STATE_COLORS } from "@/components/MonthlyDocsGrid";

/** Pendências de documentos recorrentes: quem ainda não enviou, nos últimos períodos encerrados de cada tipo. */
export function MonthlyPendencies({ companyId }: { companyId: number }) {
  const [quantos, setQuantos] = useState("1");
  const { data } = trpc.recurringDocs.companyOverview.useQuery({ companyId, quantos: Number(quantos) }, { enabled: companyId > 0 });

  if (!data || (data.colaborador.length === 0 && data.empresa.length === 0)) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            Documentos recorrentes
          </CardTitle>
          <Select value={quantos} onValueChange={setQuantos}>
            <SelectTrigger className="w-56" aria-label="Períodos exibidos"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Último período encerrado</SelectItem>
              <SelectItem value="2">Últimos 2 períodos</SelectItem>
              <SelectItem value="3">Últimos 3 períodos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.colaborador.map((item) => (
          <div key={`${item.tipo.id}-${item.competencia}`} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {item.tipo.nome} · {item.rotulo}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{PERIODICIDADE_LABELS[item.tipo.periodicidade]}</span>
              </p>
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
                <li key={`${item.tipo.id}-${item.competencia}`}>
                  <Badge variant="outline" className={RECURRING_STATE_COLORS[item.estado]}>
                    {item.tipo.nome} {item.rotulo} · {RECURRING_STATE_LABELS[item.estado]}
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
