import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, Building2, CalendarDays, ClipboardList, FileWarning, Ticket, TrendingUp, Users,
} from "lucide-react";
import {
  STATUS_SOLICITACAO, TIPO_CHAMADO, TIPO_SOLICITACAO,
  formatDias, formatNumero, formatPercent, qtd, rotuloPeriodo,
} from "./biFormat";

type Outputs = inferRouterOutputs<AppRouter>;
export type BiCompanyReport = Outputs["bi"]["company"];
export type BiGlobalReport = Outputs["bi"]["global"];
export type BiReport = BiCompanyReport | BiGlobalReport;

const COLORS = ["#2BBFB3", "#1a9e93", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#64748b"];
const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
};
const tick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

function Kpi({ icon: Icon, label, value, hint, color }: { icon: any; label: string; value: string; hint?: string; color: string }) {
  return (
    <Card className="border-border">
      <CardContent className="p-4 flex items-start gap-3">
        <Icon className={`w-5 h-5 ${color} shrink-0 mt-0.5`} />
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {hint && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function BarList({ data, labels, color }: { data: { chave: string; total: number }[]; labels: Record<string, string>; color: string }) {
  if (!data.length) return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Sem registros no período</div>;
  const rows = data.map((d) => ({ name: labels[d.chave] ?? d.chave, total: d.total }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={tick} />
        <YAxis type="category" dataKey="name" width={140} tick={tick} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="total" name="Quantidade" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BiDashboard({ report, global }: { report: BiReport; global: boolean }) {
  const s = report.solicitacoes;
  const c = report.chamados;
  const col = report.colaboradores;
  const serie = report.serie.map((p) => ({ ...p, rotulo: rotuloPeriodo(p.periodo, report.periodo.agrupamento) }));
  const colabData = [
    { name: "Ativos", value: col.ativos },
    { name: "Afastados", value: col.afastados },
    { name: "Desligados", value: col.desligados },
  ].filter((d) => d.value > 0);
  const globalReport = global ? (report as BiGlobalReport) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {globalReport ? (
          <Kpi icon={Building2} label="Empresas ativas" value={formatNumero(globalReport.empresas.ativas)}
            hint={`${qtd(globalReport.empresas.novasNoPeriodo, "nova", "novas")} no período`} color="text-primary" />
        ) : (
          <Kpi icon={Users} label="Colaboradores ativos" value={formatNumero(col.ativos)}
            hint={`${qtd(col.admissoesNoPeriodo, "admissão", "admissões")} no período`} color="text-primary" />
        )}
        <Kpi icon={ClipboardList} label="Solicitações abertas no período" value={formatNumero(s.abertas)}
          hint={`${qtd(s.concluidas, "concluída", "concluídas")} · ${formatPercent(s.concluidas, s.abertas)}`} color="text-amber-500" />
        <Kpi icon={Ticket} label="Chamados abertos no período" value={formatNumero(c.abertos)}
          hint={`${qtd(c.resolvidos, "resolvido", "resolvidos")} · média ${formatDias(c.tempoMedioResolucaoDias)}`} color="text-blue-500" />
        <Kpi icon={FileWarning} label="Documentos vencidos hoje"
          value={formatNumero(report.documentos.empresa.vencidos + report.documentos.colaboradores.vencidos)}
          hint={`${formatNumero(report.documentos.empresa.aVencer30 + report.documentos.colaboradores.aVencer30)} vencem em 30 dias`} color="text-red-500" />
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Evolução no período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={serie} margin={{ top: 5, right: 16, left: -16, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="rotulo" tick={tick} />
              <YAxis allowDecimals={false} tick={tick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="solicitacoesAbertas" name="Solicitações abertas" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="solicitacoesConcluidas" name="Solicitações concluídas" stroke="#2BBFB3" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="chamadosAbertos" name="Chamados abertos" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="chamadosResolvidos" name="Chamados resolvidos" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Solicitações por tipo</CardTitle>
          </CardHeader>
          <CardContent><BarList data={s.porTipo} labels={TIPO_SOLICITACAO} color="#f59e0b" /></CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Situação atual das solicitações abertas no período</CardTitle>
          </CardHeader>
          <CardContent><BarList data={s.porStatus} labels={STATUS_SOLICITACAO} color="#2BBFB3" /></CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Chamados por tipo</CardTitle>
          </CardHeader>
          <CardContent><BarList data={c.porTipo} labels={TIPO_CHAMADO} color="#3b82f6" /></CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Colaboradores hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {colabData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={colabData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {colabData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Sem colaboradores cadastrados</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi icon={CalendarDays} label="Férias aprovadas com início no período" value={formatNumero(report.ferias.aprovadasNoPeriodo)}
          hint={`${formatNumero(report.ferias.pendentesHoje)} aguardando aprovação hoje`} color="text-teal-500" />
        <Kpi icon={ClipboardList} label="Tempo médio de conclusão das solicitações" value={formatDias(s.tempoMedioConclusaoDias)}
          hint={`${formatNumero(s.emAndamentoHoje)} em andamento hoje`} color="text-amber-500" />
        <Kpi icon={AlertTriangle} label="Documentos de colaboradores enviados no período"
          value={formatNumero(report.documentos.colaboradores.enviadosNoPeriodo)}
          hint={`${formatNumero(report.documentos.colaboradores.vencidos)} vencidos hoje`} color="text-red-500" />
      </div>

      {globalReport && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Empresas com mais movimento no período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Empresa</th>
                    <th className="py-2 px-3 font-medium text-right">Solicitações</th>
                    <th className="py-2 px-3 font-medium text-right">Concluídas</th>
                    <th className="py-2 px-3 font-medium text-right">Chamados</th>
                    <th className="py-2 pl-3 font-medium text-right">Colaboradores ativos</th>
                  </tr>
                </thead>
                <tbody>
                  {globalReport.ranking.map((r) => (
                    <tr key={r.companyId} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 text-foreground">{r.nome}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatNumero(r.solicitacoes)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatNumero(r.concluidas)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatNumero(r.chamados)}</td>
                      <td className="py-2 pl-3 text-right tabular-nums">{formatNumero(r.colaboradoresAtivos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
