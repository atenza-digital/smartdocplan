import { Link } from "wouter";
import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ClipboardList, Plus, Ticket, UserMinus, Users } from "lucide-react";
import { canCreateRequests } from "@shared/permissions";

export default function EmpresaDashboard() {
  const { user, effectiveCompanyId } = useAuth();
  const companyId = effectiveCompanyId ?? 0;
  const canOpenRequests = canCreateRequests(user?.role ?? null);

  const { data: dash, isLoading } = trpc.dashboard.company.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );
  const { data: reqStats } = trpc.requests.stats.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );
  const { data: companyDocStats } = trpc.companyDocuments.statsByCompany.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );

  const kpis = [
    {
      title: "Colaboradores ativos",
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
      title: "Solicitações novas",
      value: dash?.solicitacoes.novas ?? 0,
      sub: `${dash?.solicitacoes.total ?? 0} total`,
      icon: ClipboardList,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/empresa/solicitacoes",
    },
    {
      title: "Chamados abertos",
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Painel de RH</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bem-vindo, <span className="font-medium text-foreground">{user?.name}</span>. Aqui está o resumo da sua empresa.
            </p>
          </div>
          {canOpenRequests && (
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/empresa/solicitacoes/nova">
                <Plus className="mr-2 h-4 w-4" />
                Nova solicitação
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Link key={kpi.title} href={kpi.href}>
              <Card className="cursor-pointer border-border transition-colors hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                      <p className="mt-1 text-3xl font-bold text-foreground">
                        {isLoading ? "-" : kpi.value.toLocaleString("pt-BR")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
                    </div>
                    <div className={`rounded-lg p-2.5 ${kpi.bg}`}>
                      <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border-border lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Alertas documentais da empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Obrigatórios pendentes</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{companyDocStats?.obrigatoriosPendentes ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Vencidos</p>
                  <p className="mt-2 text-2xl font-semibold text-red-600">{companyDocStats?.vencidos ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">A vencer em 30 dias</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-600">{companyDocStats?.aVencer ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ClipboardList className="h-4 w-4 text-primary" />
                Solicitações por status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Novas", value: reqStats?.novas ?? 0, color: "bg-amber-500" },
                { label: "Em análise", value: reqStats?.emAnalise ?? 0, color: "bg-blue-500" },
                { label: "Concluídas", value: reqStats?.concluidas ?? 0, color: "bg-green-500" },
                { label: "Rejeitadas", value: reqStats?.rejeitadas ?? 0, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                  <span className="flex-1 text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Acesso rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Colaboradores", href: "/empresa/colaboradores", icon: Users },
                  { label: canOpenRequests ? "Nova solicitação" : "Solicitações", href: canOpenRequests ? "/empresa/solicitacoes/nova" : "/empresa/solicitacoes", icon: ClipboardList },
                  { label: "Ver pendências", href: "/empresa/pendencias", icon: AlertTriangle },
                  { label: "Abrir chamado", href: "/empresa/chamados", icon: Ticket },
                ].map((item) => (
                  <Link key={item.label} href={item.href}>
                    <div className="group flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-border p-3 text-center transition-colors hover:border-primary/30 hover:bg-accent">
                      <div className="rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                        <item.icon className="h-4 w-4 text-primary" />
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
