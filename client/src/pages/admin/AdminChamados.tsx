import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  aberto: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  em_atendimento: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  aguardando_cliente: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  resolvido: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  fechado: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

const statusLabels: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em Atendimento",
  aguardando_cliente: "Aguardando Cliente",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

const tipoLabels: Record<string, string> = {
  criacao_usuario: "Criação de Usuário",
  bloqueio_usuario: "Bloqueio de Usuário",
  alteracao_acesso: "Alteração de Acesso",
  suporte_tecnico: "Suporte Técnico",
  duvida: "Dúvida",
  outros: "Outros",
};

export default function AdminChamados() {
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const { data: chamados = [], isLoading, refetch } = trpc.tickets.list.useQuery({});
  const { data: stats } = trpc.tickets.stats.useQuery();
  const updateStatus = trpc.tickets.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = filterStatus === "todos" ? chamados : chamados.filter((c) => c.status === filterStatus);

  return (
    <AdminLayout title="Chamados">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Chamados</h2>
          <p className="text-muted-foreground text-sm mt-1">Gerencie todos os chamados das empresas clientes.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats?.total ?? 0, icon: Ticket, color: "text-primary" },
            { label: "Abertos", value: stats?.abertos ?? 0, icon: AlertCircle, color: "text-red-500" },
            { label: "Em Atendimento", value: stats?.emAtendimento ?? 0, icon: Clock, color: "text-amber-500" },
            { label: "Resolvidos", value: stats?.resolvidos ?? 0, icon: CheckCircle2, color: "text-green-500" },
          ].map((s) => (
            <Card key={s.label} className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtro */}
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
              <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
              <SelectItem value="fechado">Fechado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {isLoading && [...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum chamado encontrado</p>
            </div>
          )}
          {filtered.map((chamado) => (
            <Card key={chamado.id} className="border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">#{chamado.id} — {chamado.titulo}</span>
                      <Badge variant="outline" className={`text-xs ${statusColors[chamado.status]}`}>
                        {statusLabels[chamado.status]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {tipoLabels[chamado.tipo] ?? chamado.tipo}
                      </Badge>
                    </div>
                    {chamado.descricao && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{chamado.descricao}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Criado em {new Date(chamado.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Select
                      value={chamado.status}
                      onValueChange={(v) => updateStatus.mutate({ id: chamado.id, status: v as any })}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                        <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                        <SelectItem value="fechado">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
