import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, ClipboardList, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#2BBFB3", "#1a9e93", "#3dd6ca", "#0d7a72", "#5ee8de"];

export default function EmpresaBI() {
  const { user, effectiveCompanyId } = useAuth();
  const companyId = effectiveCompanyId ?? 0;

  const { data: empStats } = trpc.employees.stats.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );
  const { data: reqStats } = trpc.requests.stats.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );
  const { data: ticketStats } = trpc.tickets.stats.useQuery();

  const colaboradoresData = [
    { name: "Ativos", value: empStats?.ativos ?? 0 },
    { name: "Afastados", value: empStats?.afastados ?? 0 },
    { name: "Desligados", value: empStats?.desligados ?? 0 },
  ].filter((d) => d.value > 0);

  const solicitacoesData = [
    { name: "Novas", value: reqStats?.novas ?? 0 },
    { name: "Em Análise", value: reqStats?.emAnalise ?? 0 },
    { name: "Concluídas", value: reqStats?.concluidas ?? 0 },
    { name: "Rejeitadas", value: reqStats?.rejeitadas ?? 0 },
  ];

  return (
    <CompanyLayout title="BI / Relatórios">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">BI & Relatórios</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Indicadores e análises de RH da sua empresa.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Colaboradores", value: empStats?.total ?? 0, icon: Users, color: "text-primary" },
            { label: "Ativos", value: empStats?.ativos ?? 0, icon: TrendingUp, color: "text-green-500" },
            { label: "Solicitações", value: reqStats?.total ?? 0, icon: ClipboardList, color: "text-blue-500" },
            { label: "Chamados Abertos", value: ticketStats?.abertos ?? 0, icon: AlertTriangle, color: "text-amber-500" },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <kpi.icon className={`w-5 h-5 ${kpi.color} shrink-0`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status dos Colaboradores */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Status dos Colaboradores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {colaboradoresData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={colaboradoresData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {colaboradoresData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, ""]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <p className="text-sm">Nenhum dado disponível</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solicitações por Status */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                Solicitações por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={solicitacoesData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="value" fill="#2BBFB3" radius={[4, 4, 0, 0]} name="Qtd" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyLayout>
  );
}
