import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Building2, Users, ClipboardList, Ticket } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#2BBFB3", "#1a9e93", "#3dd6ca", "#0d7a72", "#5ee8de"];

export default function AdminBI() {
  const { data: globalStats } = trpc.dashboard.global.useQuery();
  const { data: reqStats } = trpc.requests.globalStats.useQuery();
  const { data: ticketStats } = trpc.tickets.stats.useQuery();

  const empresasData = [
    { name: "Ativas", value: globalStats?.empresas.ativas ?? 0 },
    { name: "Inativas", value: (globalStats?.empresas.total ?? 0) - (globalStats?.empresas.ativas ?? 0) },
  ].filter((d) => d.value > 0);

  const solicitacoesData = [
    { name: "Novas", value: reqStats?.novas ?? 0 },
    { name: "Concluídas", value: reqStats?.concluidas ?? 0 },
    { name: "Pendentes", value: (reqStats?.total ?? 0) - (reqStats?.novas ?? 0) - (reqStats?.concluidas ?? 0) },
  ];

  const chamadosData = [
    { name: "Abertos", value: ticketStats?.abertos ?? 0 },
    { name: "Em Atend.", value: ticketStats?.emAtendimento ?? 0 },
    { name: "Resolvidos", value: ticketStats?.resolvidos ?? 0 },
  ];

  return (
    <AdminLayout title="BI Global">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">BI Global da Plataforma</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Indicadores consolidados de todas as empresas da plataforma.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Empresas", value: globalStats?.empresas.total ?? 0, icon: Building2, color: "text-primary" },
            { label: "Colaboradores Ativos", value: globalStats?.colaboradoresAtivos ?? 0, icon: Users, color: "text-blue-500" },
            { label: "Solicitações", value: reqStats?.total ?? 0, icon: ClipboardList, color: "text-amber-500" },
            { label: "Chamados Abertos", value: ticketStats?.abertos ?? 0, icon: Ticket, color: "text-red-500" },
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Empresas */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Status das Empresas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {empresasData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={empresasData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {empresasData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados</div>
              )}
            </CardContent>
          </Card>

          {/* Solicitações */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                Solicitações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={solicitacoesData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="value" fill="#2BBFB3" radius={[4, 4, 0, 0]} name="Qtd" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chamados */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" />
                Chamados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chamadosData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="value" fill="#1a9e93" radius={[4, 4, 0, 0]} name="Qtd" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
