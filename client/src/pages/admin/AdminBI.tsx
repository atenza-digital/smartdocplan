import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { BiDashboard } from "@/components/bi/BiDashboard";
import { PeriodFilter, initialPeriod, type PeriodState } from "@/components/bi/PeriodFilter";
import { formatDataBr } from "@/components/bi/biFormat";
import { BiExportButton } from "@/components/bi/BiExportButton";

export default function AdminBI() {
  const [period, setPeriod] = useState<PeriodState>(() => initialPeriod("mes"));
  const { data: report, isLoading, error } = trpc.bi.global.useQuery(
    { inicio: period.inicio, fim: period.fim, agrupamento: period.agrupamento },
    { placeholderData: (previous) => previous }
  );

  return (
    <AdminLayout title="BI Global">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
          <h2 className="text-2xl font-bold text-foreground">BI Global da Plataforma</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Indicadores consolidados de todas as empresas entre {formatDataBr(period.inicio)} e {formatDataBr(period.fim)}.
          </p>
          </div>
          <BiExportButton report={report} global={true} />
        </div>

        <Card className="border-border">
          <CardContent className="p-4">
            <PeriodFilter value={period} onChange={setPeriod} />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {isLoading && !report && <div className="h-64 rounded-lg bg-muted animate-pulse" />}
        {report && <BiDashboard report={report} global />}
      </div>
    </AdminLayout>
  );
}
