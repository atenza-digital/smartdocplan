import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Ticket, Clock, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageRequestWorkflow } from "@shared/permissions";
import { TicketThread } from "@/components/TicketThread";

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
  const { user } = useAuth();
  const canManage = canManageRequestWorkflow(user?.role ?? null);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [selected, setSelected] = useState<any>(null);
  const [novoStatus, setNovoStatus] = useState("");
  const [resposta, setResposta] = useState("");
  const { data: chamados = [], isLoading, refetch } = trpc.tickets.list.useQuery({});
  const { data: stats } = trpc.tickets.stats.useQuery();
  const utils = trpc.useUtils();
  const updateStatus = trpc.tickets.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Chamado atualizado e resposta enviada à empresa.");
      setSelected(null);
      refetch();
      utils.tickets.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openTicket = (chamado: any) => {
    setSelected(chamado);
    setNovoStatus(chamado.status);
    setResposta("");
  };

  const mudouStatus = !!selected && novoStatus !== selected.status;
  const respostaObrigatoria = mudouStatus && (novoStatus === "resolvido" || novoStatus === "fechado");
  const podeSalvar = !!selected && (mudouStatus || !!resposta.trim()) && (!respostaObrigatoria || !!resposta.trim());

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
            <Card
              key={chamado.id}
              role="button"
              tabIndex={0}
              onClick={() => openTicket(chamado)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTicket(chamado); } }}
              className="cursor-pointer border-border hover:border-primary/30 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            >
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
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span>Criado em {new Date(chamado.createdAt).toLocaleDateString("pt-BR")}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {chamado.totalMensagens} {chamado.totalMensagens === 1 ? "mensagem" : "mensagens"}
                      </span>
                      {chamado.ultimaOrigem === "empresa" && (
                        <Badge variant="outline" className="text-xs py-0 border-primary/40 text-primary">Empresa respondeu</Badge>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-primary">{canManage ? "Atender" : "Ver"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{canManage ? "Atender chamado" : "Detalhes do chamado"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">#{selected.id} — {selected.titulo}</span>
                <Badge variant="outline" className={`text-xs ${statusColors[selected.status]}`}>{statusLabels[selected.status]}</Badge>
                <Badge variant="outline" className="text-xs">{tipoLabels[selected.tipo] ?? selected.tipo}</Badge>
              </div>

              <TicketThread ticket={selected} />

              {canManage && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="chamado-status">Status</Label>
                    <Select value={novoStatus} onValueChange={setNovoStatus}>
                      <SelectTrigger id="chamado-status" className="w-full sm:w-60"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="chamado-resposta">Resposta para a empresa{respostaObrigatoria ? " *" : ""}</Label>
                    <Textarea
                      id="chamado-resposta"
                      value={resposta}
                      onChange={(e) => setResposta(e.target.value)}
                      placeholder="Explique o que foi feito, o que falta ou o que a empresa precisa enviar"
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {respostaObrigatoria
                        ? "Obrigatória ao resolver ou fechar: a empresa recebe essa explicação."
                        : "A empresa vê esta resposta no chamado e recebe uma notificação."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
            {canManage && (
              <Button
                onClick={() => updateStatus.mutate({ id: selected.id, status: novoStatus as any, mensagem: resposta.trim() || undefined })}
                disabled={!podeSalvar || updateStatus.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {updateStatus.isPending ? "Salvando..." : "Salvar e responder"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
