import { useEffect, useState } from "react";
import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { canManageCompanyData } from "@shared/permissions";
import { formatDateOnlyBr } from "@shared/formValidation";
import { vacationPeriod } from "@shared/vacationSuggestion";
import { brazilToday } from "@shared/vacations";

/** Parâmetros da empresa: regras usadas nos cálculos e alertas (por enquanto, prazos de férias). */
export default function EmpresaParametros() {
  const { user, effectiveCompanyId } = useAuth();
  const companyId = effectiveCompanyId ?? 0;
  const canEdit = canManageCompanyData(user?.role ?? null);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.companies.parameters.useQuery({ companyId }, { enabled: companyId > 0 });
  const [aquisicao, setAquisicao] = useState("12");
  const [solicitar, setSolicitar] = useState("1");

  useEffect(() => {
    if (!data) return;
    setAquisicao(String(data.feriasMesesAquisicao));
    setSolicitar(String(data.feriasMesesParaSolicitar));
  }, [data]);

  const salvar = trpc.companies.updateParameters.useMutation({
    onSuccess: () => {
      toast.success("Parâmetros salvos. As sugestões e os alertas de férias já usam os novos prazos.");
      utils.companies.parameters.invalidate({ companyId });
      utils.vacations.suggestions.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const m = Number(aquisicao);
  const p = Number(solicitar);
  const validos = Number.isInteger(m) && m >= 1 && m <= 24 && Number.isInteger(p) && p >= 1 && p <= 12;
  const hoje = brazilToday();
  const exemplo = validos ? vacationPeriod(hoje, { feriasMesesAquisicao: m, feriasMesesParaSolicitar: p }, 0) : null;
  const alterado = !!data && (m !== data.feriasMesesAquisicao || p !== data.feriasMesesParaSolicitar);

  return (
    <CompanyLayout title="Parâmetros da empresa">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Parâmetros da empresa</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Regras da sua empresa usadas nas sugestões e nos alertas da plataforma.
          </p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              Férias
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Contados a partir da data de admissão. A plataforma sugere o período aquisitivo e o prazo ao programar férias e avisa admin e RH quando o colaborador adquire férias e quando o limite para solicitar se aproxima.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="param-aquisicao">Meses até adquirir férias</Label>
                    <Input id="param-aquisicao" type="number" min={1} max={24} value={aquisicao} onChange={(e) => setAquisicao(e.target.value)} disabled={!canEdit} />
                    <p className="text-xs text-muted-foreground">De 1 a 24. Padrão: 12.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="param-solicitar">Meses para solicitar depois de adquirir</Label>
                    <Input id="param-solicitar" type="number" min={1} max={12} value={solicitar} onChange={(e) => setSolicitar(e.target.value)} disabled={!canEdit} />
                    <p className="text-xs text-muted-foreground">De 1 a 12. Padrão: 1.</p>
                  </div>
                </div>
                {exemplo ? (
                  <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
                    Exemplo: admitido em {formatDateOnlyBr(hoje)} → adquire férias em {formatDateOnlyBr(exemplo.aquisicao)} e deve solicitá-las até {formatDateOnlyBr(exemplo.limite)}.
                  </p>
                ) : (
                  <p className="text-sm text-destructive">Use de 1 a 24 meses para adquirir e de 1 a 12 meses para solicitar.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Estes prazos são da empresa e servem para organizar a programação; não substituem as regras da CLT.
                </p>
                {canEdit && (
                  <div className="flex justify-end">
                    <Button
                      disabled={!validos || !alterado || salvar.isPending}
                      onClick={() => salvar.mutate({ companyId, feriasMesesAquisicao: m, feriasMesesParaSolicitar: p })}
                    >
                      {salvar.isPending ? "Salvando..." : "Salvar parâmetros"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </CompanyLayout>
  );
}
