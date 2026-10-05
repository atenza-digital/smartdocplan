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
import { Ticket, Clock, CheckCircle2, AlertCircle, MessageSquare, LayoutGrid, List } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanCard, KanbanColumn, KanbanDragOverlay, type KanbanColumnDef } from "@/components/kanban";

const TICKET_COLUMNS: KanbanColumnDef[] = [
  { key: "aberto", label: "Aberto", color: "bg-red-500", textColor: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800" },
  { key: "em_atendimento", label: "Em Atendimento", color: "bg-amber-500", textColor: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800" },
  { key: "aguardando_cliente", label: "Aguardando Retorno", color: "bg-blue-500", textColor: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800" },
  { key: "resolvido", label: "Resolvido", color: "bg-green-500", textColor: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800" },
  { key: "fechado", label: "Fechado", color: "bg-gray-500", textColor: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-900/30", border: "border-gray-200 dark:border-gray-800" },
];
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
    onSuccess: (_data, vars) => {
      toast.success(vars.mensagem ? "Chamado atualizado e resposta enviada à empresa." : "Status do chamado atualizado.");
      setSelected(null);
      refetch();
      utils.tickets.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );
  const [statusFromDrop, setStatusFromDrop] = useState(false);

  const openTicket = (chamado: any, statusInicial?: string) => {
    setStatusFromDrop(!!statusInicial);
    setSelected(chamado);
    setNovoStatus(statusInicial ?? chamado.status);
    setResposta("");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const from = event.active.data.current?.status as string | undefined;
    const to = event.over?.id as string | undefined;
    if (!from || !to || from === to) return;
    const chamado = chamados.find((item) => item.id === event.active.id);
    if (!chamado) return;
    // Soltar o card abre o atendimento com o novo status já escolhido; a mudança só vale ao confirmar.
    openTicket(chamado, to);
  };

  const activeTicket = activeId !== null ? chamados.find((item) => item.id === activeId) ?? null : null;

  const renderKanbanCard = (chamado: any) => (
    <CardContent className="space-y-2 p-3">
      <p className="line-clamp-2 text-sm font-medium leading-tight text-foreground">#{chamado.id} — {chamado.titulo}</p>
      <Badge variant="outline" className="text-xs">{tipoLabels[chamado.tipo] ?? chamado.tipo}</Badge>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{new Date(chamado.createdAt).toLocaleDateString("pt-BR")}</span>
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          {chamado.totalMensagens}
        </span>
      </div>
      {chamado.ultimaOrigem === "empresa" && (
        <Badge variant="outline" className="text-xs py-0 border-primary/40 text-primary">Empresa respondeu</Badge>
      )}
    </CardContent>
  );

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

        {/* Filtro e visualização */}
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className={viewMode === "kanban" ? "bg-primary text-primary-foreground" : ""}
            >
              <LayoutGrid className="mr-1.5 h-4 w-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "lista" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("lista")}
              className={viewMode === "lista" ? "bg-primary text-primary-foreground" : ""}
            >
              <List className="mr-1.5 h-4 w-4" />
              Lista
            </Button>
          </div>
        </div>

        {viewMode === "kanban" && (
          <DndContext
            sensors={sensors}
            onDragStart={(event: DragStartEvent) => setActiveId(Number(event.active.id))}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            {canManage && (
              <p className="-mt-3 text-xs text-muted-foreground">
                Arraste um card para outra coluna: abre a conversa com o novo status para você escrever uma mensagem (opcional; obrigatória em Resolvido e Fechado) e confirmar.
              </p>
            )}
            <div className="overflow-x-auto pb-4">
              <div className="flex min-w-max gap-4">
                {TICKET_COLUMNS.filter((column) => filterStatus === "todos" || column.key === filterStatus).map((column) => {
                  const cards = filtered.filter((chamado) => chamado.status === column.key);
                  return (
                    <KanbanColumn key={column.key} column={column} count={cards.length} dimmed={false}>
                      {cards.length === 0 && <div className="py-8 text-center text-xs text-muted-foreground/50">Nenhum chamado</div>}
                      {cards.map((chamado) => (
                        <KanbanCard key={chamado.id} item={chamado} canDrag={canManage} onOpen={() => openTicket(chamado)}>
                          {renderKanbanCard(chamado)}
                        </KanbanCard>
                      ))}
                    </KanbanColumn>
                  );
                })}
              </div>
            </div>
            <KanbanDragOverlay>{activeTicket ? renderKanbanCard(activeTicket) : null}</KanbanDragOverlay>
          </DndContext>
        )}

        {/* Lista */}
        {viewMode === "lista" && (
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
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{canManage ? "Atender chamado" : "Detalhes do chamado"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col gap-4">
              <div className="order-[-2] flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">#{selected.id} — {selected.titulo}</span>
                <Badge variant="outline" className={`text-xs ${statusColors[selected.status]}`}>{statusLabels[selected.status]}</Badge>
                <Badge variant="outline" className="text-xs">{tipoLabels[selected.tipo] ?? selected.tipo}</Badge>
              </div>

              <TicketThread ticket={selected} />

              {canManage && (
                // Vindo do arraste no kanban, a confirmação aparece antes da conversa.
                <div
                  className={
                    statusFromDrop
                      ? "order-[-1] space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-4"
                      : "space-y-3 border-t border-border pt-4"
                  }
                >
                  {statusFromDrop && (
                    <p className="text-sm font-medium text-foreground">
                      Confirme a mudança de status e, se quiser, escreva uma mensagem para a empresa.
                    </p>
                  )}
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
                {updateStatus.isPending ? "Salvando..." : "Confirmar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
