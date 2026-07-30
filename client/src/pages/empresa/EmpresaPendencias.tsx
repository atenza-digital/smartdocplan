import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, Users, FolderOpen } from "lucide-react";
import { Link } from "wouter";

export default function EmpresaPendencias() {
  const { effectiveCompanyId } = useAuth();
  const companyId = effectiveCompanyId ?? 0;

  const { data: colaboradores = [], isLoading } = trpc.employees.list.useQuery(
    { companyId, status: "ativo" },
    { enabled: companyId > 0 }
  );

  const pendentes = colaboradores.filter((c) => (c.scoreConformidade ?? 100) < 100);
  const criticos = pendentes.filter((c) => (c.scoreConformidade ?? 100) < 50);
  const atencao = pendentes.filter((c) => (c.scoreConformidade ?? 100) >= 50 && (c.scoreConformidade ?? 100) < 80);
  const conformes = colaboradores.filter((c) => (c.scoreConformidade ?? 100) >= 100);

  const scoreColor = (score: number) =>
    score >= 80 ? "text-green-600 dark:text-green-400" :
    score >= 50 ? "text-amber-600 dark:text-amber-400" :
    "text-red-600 dark:text-red-400";

  const scoreBg = (score: number) =>
    score >= 80 ? "bg-green-500" :
    score >= 50 ? "bg-amber-500" :
    "bg-red-500";

  return (
    <CompanyLayout title="Pendências">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pendências de Conformidade</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhe os colaboradores com documentação pendente ou vencida.
          </p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border border-l-4 border-l-red-500">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-foreground">{criticos.length}</p>
                <p className="text-xs text-muted-foreground">Críticos (abaixo de 50%)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-foreground">{atencao.length}</p>
                <p className="text-xs text-muted-foreground">Atenção (50% a 79%)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border border-l-4 border-l-green-500">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-foreground">{conformes.length}</p>
                <p className="text-xs text-muted-foreground">Em conformidade</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de pendentes */}
        {pendentes.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-70" />
            <p className="font-semibold text-foreground">Todos os colaboradores estão em conformidade!</p>
            <p className="text-sm">Nenhuma pendência encontrada no momento.</p>
          </div>
        )}

        {pendentes.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Colaboradores com Pendências ({pendentes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...criticos, ...atencao].map((col) => {
                const score = col.scoreConformidade ?? 0;
                return (
                  <div key={col.id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold text-xs">
                        {col.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{col.nome}</p>
                      <p className="text-xs text-muted-foreground font-mono">{col.cpf}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBg(score)}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-10 text-right ${scoreColor(score)}`}>{score}%</span>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs shrink-0" asChild>
                      <Link href={`/empresa/colaboradores/${col.id}`}>
                        <FolderOpen className="w-3 h-3 mr-1" />
                        Dossiê
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Todos conformes */}
        {conformes.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Em Conformidade ({conformes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {conformes.map((col) => (
                <div key={col.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <span className="text-green-600 dark:text-green-400 font-semibold text-xs">
                      {col.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground flex-1">{col.nome}</p>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </CompanyLayout>
  );
}
