import { useState } from "react";
import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { BiDashboard } from "@/components/bi/BiDashboard";
import { PeriodFilter, initialPeriod, type PeriodState } from "@/components/bi/PeriodFilter";
import { formatDataBr } from "@/components/bi/biFormat";
import { BiExportButton } from "@/components/bi/BiExportButton";

export default function EmpresaBI() {
  const { effectiveCompanyId } = useAuth();
  const companyId = effectiveCompanyId ?? 0;
  const [period, setPeriod] = useState<PeriodState>(() => initialPeriod("mes"));
  const { data: report, isLoading, error } = trpc.bi.company.useQuery(
    { companyId, inicio: period.inicio, fim: period.fim, agrupamento: period.agrupamento },
    { enabled: companyId > 0, placeholderData: (previous) => previous }
  );

  return (
    <CompanyLayout title="BI / Relatórios">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
          <h2 className="text-2xl font-bold text-foreground">BI & Relatórios</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Indicadores de RH da sua empresa entre {formatDataBr(period.inicio)} e {formatDataBr(period.fim)}.
          </p>
          </div>
          <BiExportButton report={report} global={false} />
        </div>

        <Card className="border-border">
          <CardContent className="p-4">
            <PeriodFilter value={period} onChange={setPeriod} />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {isLoading && !report && <div className="h-64 rounded-lg bg-muted animate-pulse" />}
        {report && <BiDashboard report={report} global={false} />}
      </div>
    </CompanyLayout>
  );
}
