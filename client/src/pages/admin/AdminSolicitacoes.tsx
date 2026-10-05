import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { RequestDocumentos } from "@/components/RequestDocumentos";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  LayoutGrid,
  List,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { canCreateRequests, canManageRequestWorkflow } from "@shared/permissions";
import { NEXT_REQUEST_STATUS, canTransitionRequest } from "@shared/requestStatus";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

const STATUS_COLUMNS = [
  { key: "nova", label: "Novas", color: "bg-blue-500", textColor: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800" },
  { key: "em_analise", label: "Em análise", color: "bg-amber-500", textColor: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800" },
  { key: "aguardando_documentos", label: "Aguard. documentos", color: "bg-orange-500", textColor: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800" },
  { key: "aguardando_correcao", label: "Aguard. correção", color: "bg-purple-500", textColor: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800" },
  { key: "aprovado", label: "Aprovadas", color: "bg-teal-500", textColor: "text-teal-700 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200 dark:border-teal-800" },
  { key: "concluido", label: "Concluídas", color: "bg-green-500", textColor: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800" },
  { key: "rejeitado", label: "Rejeitadas", color: "bg-red-500", textColor: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800" },
] as const;

const TIPO_LABELS: Record<string, string> = {
  admissao: "Admissão",
  demissao: "Demissão",
  mudanca_funcao: "Mudança de função",
  afastamento: "Afastamento",
  atestado_medico: "Atestado médico",
  outros: "Outros",
};

const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  media: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  alta: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgente: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const NEXT_STATUS: Record<string, readonly string[]> = NEXT_REQUEST_STATUS;

type ViewMode = "kanban" | "lista";
type StatusColumn = (typeof STATUS_COLUMNS)[number];

function KanbanColumn({
  column,
  count,
  dimmed,
  children,
}: {
  column: StatusColumn;
  count: number;
  dimmed: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key, disabled: dimmed });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 flex-col rounded-xl border ${column.border} ${column.bg} transition-opacity ${
        dimmed ? "opacity-40" : ""
      } ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-inherit px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${column.color}`} />
          <span className={`text-sm font-semibold ${column.textColor}`}>{column.label}</span>
        </div>
        <Badge variant="outline" className={`border-current text-xs ${column.textColor}`}>
          {count}
        </Badge>
      </div>
      <div className="max-h-[calc(100vh-300px)] min-h-24 flex-1 space-y-2 overflow-y-auto p-3">{children}</div>
    </div>
  );
}

function KanbanCard({
  request,
  canDrag,
  onOpen,
  children,
}: {
  request: any;
  canDrag: boolean;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: request.id,
    data: { status: request.status },
    disabled: !canDrag,
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      aria-roledescription={canDrag ? "card arrastável" : undefined}
      className={`border-border/60 bg-background/80 transition-shadow hover:border-primary/30 hover:shadow-md ${
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${isDragging ? "relative z-50 shadow-lg" : ""}`}
      onClick={onOpen}
    >
      {children}
    </Card>
  );
}

export default function AdminSolicitacoes() {
  const { user } = useAuth();
  const canReview = canManageRequestWorkflow(user?.role ?? null);
  const canCreate = canCreateRequests(user?.role ?? null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState("0");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [novoStatus, setNovoStatus] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [draggingStatus, setDraggingStatus] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectMotivo, setRejectMotivo] = useState("");

  const listInput = { companyId: parseInt(filterEmpresa, 10) };
  const { data: solicitacoes = [], isLoading, refetch } = trpc.requests.list.useQuery(listInput);
  const { data: empresas = [] } = trpc.companies.list.useQuery();
  const utils = trpc.useUtils();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const moveMutation = trpc.requests.updateStatus.useMutation({
    onMutate: async (vars) => {
      await utils.requests.list.cancel(listInput);
      const previous = utils.requests.list.getData(listInput);
      utils.requests.list.setData(listInput, (old) =>
        old?.map((item) => (item.id === vars.id ? { ...item, status: vars.status } : item))
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) utils.requests.list.setData(listInput, context.previous);
      toast.error(error.message);
    },
    onSuccess: () => toast.success("Solicitação movida."),
    onSettled: () => utils.requests.list.invalidate(listInput),
  });

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingStatus((event.active.data.current?.status as string) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingStatus(null);
    const from = event.active.data.current?.status as string | undefined;
    const to = event.over?.id as string | undefined;
    if (!from || !to || from === to) return;
    if (!canTransitionRequest(from, to)) {
      toast.error("Essa mudança de status não é permitida.");
      return;
    }
    const request = solicitacoes.find((item) => item.id === event.active.id);
    if (!request) return;
    if (to === "rejeitado") {
      setRejectMotivo("");
      setRejectTarget(request);
      return;
    }
    moveMutation.mutate({ id: request.id, status: to as any });
  };

  const confirmReject = () => {
    if (!rejectTarget || !rejectMotivo.trim()) return;
    moveMutation.mutate({ id: rejectTarget.id, status: "rejeitado", observacoes: rejectMotivo.trim() });
    setRejectTarget(null);
  };

  const updateStatusMutation = trpc.requests.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      setDetailOpen(false);
      setNovoStatus("");
      setObservacoes("");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const filtered = solicitacoes.filter((solicitacao) => {
    const matchSearch =
      search === "" ||
      solicitacao.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (solicitacao.descricao ?? "").toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || solicitacao.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const getEmpresaNome = (companyId: number) => {
    const empresa = empresas.find((item) => item.id === companyId);
    return empresa ? empresa.nomeFantasia || empresa.razaoSocial : `Empresa #${companyId}`;
  };

  const openDetail = (request: any) => {
    setSelectedRequest(request);
    setNovoStatus(request.status);
    setObservacoes(request.observacoes ?? "");
    setDetailOpen(true);
  };

  return (
    <AdminLayout title="Solicitações">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Solicitações de RH</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {canReview
                ? "Acompanhe, avalie e mova as solicitações das empresas."
                : "Acompanhe as solicitações em modo somente leitura."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/solicitacoes/nova">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nova solicitação
                </Link>
              </Button>
            )}
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 pl-9" placeholder="Buscar solicitação..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Todas as empresas</SelectItem>
              {empresas.map((empresa) => (
                <SelectItem key={empresa.id} value={empresa.id.toString()}>
                  {empresa.nomeFantasia || empresa.razaoSocial}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_LABELS).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="outline" className="px-2 py-1 text-xs">
            {filtered.length} solicitações
          </Badge>
        </div>

        {viewMode === "kanban" && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDraggingStatus(null)}>
          {canReview && (
            <p className="-mt-2 text-xs text-muted-foreground">Arraste os cards entre as colunas para mudar o status.</p>
          )}
          <div className="overflow-x-auto pb-4">
            <div className="flex min-w-max gap-4">
              {STATUS_COLUMNS.map((column) => {
                const cards = filtered.filter((request) => request.status === column.key);
                const dimmed = !!draggingStatus && draggingStatus !== column.key && !canTransitionRequest(draggingStatus, column.key);

                return (
                  <KanbanColumn key={column.key} column={column} count={cards.length} dimmed={dimmed}>
                      {cards.length === 0 && <div className="py-8 text-center text-xs text-muted-foreground/50">Nenhuma solicitação</div>}
                      {cards.map((request) => (
                        <KanbanCard
                          key={request.id}
                          request={request}
                          canDrag={canReview && (NEXT_STATUS[request.status]?.length ?? 0) > 0}
                          onOpen={() => openDetail(request)}
                        >
                          <CardContent className="space-y-2 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-sm font-medium leading-tight text-foreground">{request.titulo}</p>
                              <Badge className={`shrink-0 text-xs ${PRIORIDADE_COLORS[request.prioridade]}`}>{request.prioridade}</Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>{TIPO_LABELS[request.tipo] ?? request.tipo}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate">{getEmpresaNome(request.companyId)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(request.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                            </div>
                          </CardContent>
                        </KanbanCard>
                      ))}
                  </KanbanColumn>
                );
              })}
            </div>
          </div>
          </DndContext>
        )}

        {viewMode === "lista" && (
          <div className="space-y-2">
            {!isLoading && filtered.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">Nenhuma solicitação encontrada</p>
                </CardContent>
              </Card>
            )}
            {filtered.map((request) => {
              const column = STATUS_COLUMNS.find((item) => item.key === request.status);
              return (
                <Card key={request.id} className="cursor-pointer transition-shadow hover:shadow-sm" onClick={() => openDetail(request)}>
                  <CardContent className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-2 shrink-0 rounded-full ${column?.color ?? "bg-gray-400"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{request.titulo}</p>
                          <Badge className={`text-xs ${PRIORIDADE_COLORS[request.prioridade]}`}>{request.prioridade}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {TIPO_LABELS[request.tipo]}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {getEmpresaNome(request.companyId)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(request.createdAt), "dd/MM/yyyy")}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-xs ${column?.textColor} border-current`}>
                        {column?.label ?? request.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={(open) => !open && setDetailOpen(false)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {canReview ? "Avaliar solicitação" : "Detalhes da solicitação"}
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-5 py-1">
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                <p className="font-semibold text-foreground">{selectedRequest.titulo}</p>
                {selectedRequest.descricao && <p className="whitespace-pre-line text-sm text-muted-foreground">{selectedRequest.descricao}</p>}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {TIPO_LABELS[selectedRequest.tipo]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {getEmpresaNome(selectedRequest.companyId)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(selectedRequest.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {selectedRequest.observacoes && (
                  <div className="mt-2 rounded border border-border/60 bg-background p-2">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Observações anteriores:</p>
                    <p className="text-xs text-foreground">{selectedRequest.observacoes}</p>
                  </div>
                )}
              </div>

              <RequestDocumentos
                requestId={selectedRequest.id}
                tipoSolicitacao={selectedRequest.tipo}
                canUpload={canReview}
                canReview={canReview}
                readOnly={!canReview}
              />

              {canReview ? (
                <>
                  {(NEXT_STATUS[selectedRequest.status]?.length ?? 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Ações rápidas:</p>
                      <div className="flex flex-wrap gap-2">
                        {NEXT_STATUS[selectedRequest.status].map((status) => {
                          const column = STATUS_COLUMNS.find((item) => item.key === status);
                          return (
                            <Button
                              key={status}
                              size="sm"
                              variant="outline"
                              className={`border-current text-xs ${column?.textColor}`}
                              onClick={() => setNovoStatus(status)}
                            >
                              <ArrowRight className="mr-1 h-3 w-3" />
                              {column?.label ?? status}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Status da solicitação</Label>
                    <Select value={novoStatus} onValueChange={setNovoStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_COLUMNS.filter((column) => canTransitionRequest(selectedRequest.status, column.key)).map((column) => (
                          <SelectItem key={column.key} value={column.key}>
                            {column.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      {novoStatus === "rejeitado" && selectedRequest.status !== "rejeitado" ? "Motivo da rejeição *" : "Observações / parecer"}
                    </Label>
                    <Textarea
                      value={observacoes}
                      onChange={(event) => setObservacoes(event.target.value)}
                      placeholder="Adicione observações, solicitações de documentos ou parecer técnico..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </>
              ) : (
                <Card className="border-border bg-muted/30">
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    Esse perfil possui acesso de leitura. A movimentação de status fica restrita a administradores e analistas da plataforma.
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Fechar
            </Button>
            {canReview && (
              <Button
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: selectedRequest.id,
                    status: novoStatus as any,
                    observacoes: observacoes || undefined,
                  })
                }
                disabled={
                  !novoStatus ||
                  updateStatusMutation.isPending ||
                  (novoStatus === "rejeitado" && selectedRequest?.status !== "rejeitado" && !observacoes.trim())
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {updateStatusMutation.isPending ? "Salvando..." : "Salvar avaliação"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">{rejectTarget?.titulo}</p>
            <Label htmlFor="motivo-rejeicao">Motivo da rejeição *</Label>
            <Textarea
              id="motivo-rejeicao"
              value={rejectMotivo}
              onChange={(event) => setRejectMotivo(event.target.value)}
              placeholder="Explique por que a solicitação foi rejeitada"
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmReject} disabled={!rejectMotivo.trim()} className="bg-destructive text-white hover:bg-destructive/90">
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
