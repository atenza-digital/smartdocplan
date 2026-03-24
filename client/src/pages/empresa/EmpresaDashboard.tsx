import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ClipboardList, Ticket, AlertTriangle, UserCheck, UserMinus, TrendingUp, Plus } from "lucide-react";
import { Link } from "wouter";

export default function EmpresaDashboard() {
  const { user } = useAuth();
  const companyId = user?.companyId ?? 0;

  const { data: dash, isLoading } = trpc.dashboard.company.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );
  const { data: reqStats } = trpc.requests.stats.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );

  const kpis = [
    {
      title: "Colaboradores Ativos",
      value: dash?.colaboradores.ativos ?? 0,
      sub: `${dash?.colaboradores.total ?? 0} total`,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/empresa/colaboradores",
    },
    {
      title: "Afastados",
      value: dash?.colaboradores.afastados ?? 0,
      sub: "colaboradores",
      icon: UserMinus,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      href: "/empresa/colaboradores",
    },
    {
      title: "Solicitações Novas",
      value: dash?.solicitacoes.novas ?? 0,
      sub: `${dash?.solicitacoes.total ?? 0} total`,
      icon: ClipboardList,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/empresa/solicitacoes",
    },
    {
      title: "Chamados Abertos",
      value: dash?.chamadosAbertos ?? 0,
      sub: "aguardando atendimento",
      icon: Ticket,
      color: "text-red-500",
      bg: "bg-red-500/10",
      href: "/empresa/chamados",
    },
  ];

  return (
    <CompanyLayout title="Dashboard">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Painel de RH</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Bem-vindo, <span className="font-medium text-foreground">{user?.name}</span>. Aqui está o resumo da sua empresa.
            </p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/empresa/solicitacoes/nova">
              <Plus className="w-4 h-4 mr-2" />
              Nova Solicitação
            </Link>
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Link key={kpi.title} href={kpi.href}>
              <Card className="border-border hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">{kpi.title}</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {isLoading ? "—" : kpi.value.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                    </div>
                    <div className={`p-2.5 rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Status das Solicitações + Acesso Rápido */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                Solicitações por Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Novas", value: reqStats?.novas ?? 0, color: "bg-amber-500" },
                { label: "Em Análise", value: reqStats?.emAnalise ?? 0, color: "bg-blue-500" },
                { label: "Concluídas", value: reqStats?.concluidas ?? 0, color: "bg-green-500" },
                { label: "Rejeitadas", value: reqStats?.rejeitadas ?? 0, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                  <span className="text-sm text-muted-foreground flex-1">{item.label}</span>
                  <span className="text-sm font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Novo Colaborador", href: "/empresa/colaboradores/novo", icon: Users },
                  { label: "Nova Solicitação", href: "/empresa/solicitacoes/nova", icon: ClipboardList },
                  { label: "Ver Pendências", href: "/empresa/pendencias", icon: AlertTriangle },
                  { label: "Abrir Chamado", href: "/empresa/chamados/novo", icon: Ticket },
                ].map((item) => (
                  <Link key={item.label} href={item.href}>
                    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent hover:border-primary/30 transition-colors text-center cursor-pointer group">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CompanyLayout>
  );
}
