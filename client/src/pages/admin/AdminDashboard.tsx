import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, ClipboardList, Ticket, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export default function AdminDashboard() {
  const { data: globalStats, isLoading } = trpc.dashboard.global.useQuery();
  const { data: reqStats } = trpc.requests.globalStats.useQuery();

  const statCards = [
    {
      title: "Empresas Ativas",
      value: globalStats?.empresas.ativas ?? 0,
      sub: `${globalStats?.empresas.total ?? 0} total`,
      icon: Building2,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Colaboradores Ativos",
      value: globalStats?.colaboradoresAtivos ?? 0,
      sub: "na plataforma",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Solicitações Abertas",
      value: reqStats?.novas ?? 0,
      sub: `${reqStats?.total ?? 0} total`,
      icon: ClipboardList,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Chamados Abertos",
      value: globalStats?.chamadosAbertos ?? 0,
      sub: "aguardando atendimento",
      icon: Ticket,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  ];

  return (
    <AdminLayout title="Dashboard Global">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Visão Geral da Plataforma</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhe os indicadores globais de todas as empresas cadastradas.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.title} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {isLoading ? "—" : card.value.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${card.bg}`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Status das Solicitações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                Status das Solicitações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Novas", value: reqStats?.novas ?? 0, icon: AlertCircle, color: "text-amber-500", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
                { label: "Concluídas", value: reqStats?.concluidas ?? 0, icon: CheckCircle2, color: "text-green-500", badge: "bg-green-500/10 text-green-700 dark:text-green-400" },
                { label: "Rejeitadas", value: 0, icon: AlertCircle, color: "text-red-500", badge: "bg-red-500/10 text-red-700 dark:text-red-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </div>
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${item.badge}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Empresas na Plataforma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total de Empresas", value: globalStats?.empresas.total ?? 0, color: "text-foreground" },
                { label: "Empresas Ativas", value: globalStats?.empresas.ativas ?? 0, color: "text-green-600 dark:text-green-400" },
                { label: "Empresas Inativas", value: (globalStats?.empresas.total ?? 0) - (globalStats?.empresas.ativas ?? 0), color: "text-muted-foreground" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Acesso Rápido */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Cadastrar Empresa", href: "/admin/empresas/nova", icon: Building2 },
                { label: "Ver Solicitações", href: "/admin/solicitacoes", icon: ClipboardList },
                { label: "Ver Chamados", href: "/admin/chamados", icon: Ticket },
                { label: "Auditoria", href: "/admin/auditoria", icon: TrendingUp },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent hover:border-primary/30 transition-colors text-center group"
                >
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{item.label}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
