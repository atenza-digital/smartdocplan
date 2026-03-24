import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ClipboardList, Search, Building2, FileText, Calendar,
  ArrowRight, Filter, LayoutGrid, List
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLUMNS = [
  { key: "nova", label: "Novas", color: "bg-blue-500", textColor: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800" },
  { key: "em_analise", label: "Em Analise", color: "bg-amber-500", textColor: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800" },
  { key: "aguardando_documentos", label: "Aguard. Documentos", color: "bg-orange-500", textColor: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800" },
  { key: "aguardando_correcao", label: "Aguard. Correcao", color: "bg-purple-500", textColor: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800" },
  { key: "aprovado", label: "Aprovadas", color: "bg-teal-500", textColor: "text-teal-700 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200 dark:border-teal-800" },
  { key: "concluido", label: "Concluidas", color: "bg-green-500", textColor: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800" },
  { key: "rejeitado", label: "Rejeitadas", color: "bg-red-500", textColor: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800" },
];

const TIPO_LABELS: Record<string, string> = {
  admissao: "Admissao",
  demissao: "Demissao",
  mudanca_funcao: "Mudanca de Funcao",
  afastamento: "Afastamento",
  atestado_medico: "Atestado Medico",
  outros: "Outros",
};

const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  media: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  alta: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgente: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const NEXT_STATUS: Record<string, string[]> = {
  nova: ["em_analise", "aguardando_documentos", "rejeitado"],
  em_analise: ["aguardando_documentos", "aguardando_correcao", "aprovado", "rejeitado"],
  aguardando_documentos: ["em_analise", "aprovado", "rejeitado"],
  aguardando_correcao: ["em_analise", "rejeitado"],
  aprovado: ["concluido", "rejeitado"],
  concluido: [],
  rejeitado: [],
};

type ViewMode = "kanban" | "lista";

export default function AdminSolicitacoes() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState("0");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [novoStatus, setNovoStatus] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const { data: solicitacoes = [], isLoading, refetch } = trpc.requests.list.useQuery({
    companyId: parseInt(filterEmpresa),
  });
  const { data: empresas = [] } = trpc.companies.list.useQuery();

  const updateStatusMutation = trpc.requests.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      setDetailOpen(false);
      setNovoStatus("");
      setObservacoes("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = solicitacoes.filter((s) => {
    const matchSearch = search === "" ||
      s.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (s.descricao ?? "").toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || s.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const getEmpresaNome = (companyId: number) => {
    const e = empresas.find(e => e.id === companyId);
    return e ? (e.nomeFantasia || e.razaoSocial) : `Empresa #${companyId}`;
  };

  const openDetail = (req: any) => {
    setSelectedRequest(req);
    setNovoStatus(req.status);
    setObservacoes(req.observacoes ?? "");
    setDetailOpen(true);
  };

  return (
    <AdminLayout title="Solicitacoes">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Solicitacoes de RH</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Acompanhe e avalie todas as solicitacoes das empresas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className={viewMode === "kanban" ? "bg-primary text-primary-foreground" : ""}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "lista" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("lista")}
              className={viewMode === "lista" ? "bg-primary text-primary-foreground" : ""}
            >
              <List className="w-4 h-4 mr-1.5" />
              Lista
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Buscar solicitacao..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Todas as empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id.toString()}>{e.nomeFantasia || e.razaoSocial}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs px-2 py-1">
            {filtered.length} solicitacoes
          </Badge>
        </div>

        {/* KANBAN */}
        {viewMode === "kanban" && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {STATUS_COLUMNS.map((col) => {
                const cards = filtered.filter((s) => s.status === col.key);
                return (
                  <div key={col.key} className={`w-72 rounded-xl border ${col.border} ${col.bg} flex flex-col`}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                        <span className={`text-sm font-semibold ${col.textColor}`}>{col.label}</span>
                      </div>
                      <Badge variant="outline" className={`text-xs ${col.textColor} border-current`}>{cards.length}</Badge>
                    </div>
                    <div className="flex-1 p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                      {cards.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground/50 text-xs">
                          Nenhuma solicitacao
                        </div>
                      )}
                      {cards.map((req) => (
                        <Card
                          key={req.id}
                          className="cursor-pointer hover:shadow-md transition-all bg-background/80 border-border/60 hover:border-primary/30"
                          onClick={() => openDetail(req)}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{req.titulo}</p>
                              <Badge className={`text-xs shrink-0 ${PRIORIDADE_COLORS[req.prioridade]}`}>
                                {req.prioridade}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <FileText className="w-3 h-3" />
                              <span>{TIPO_LABELS[req.tipo] ?? req.tipo}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building2 className="w-3 h-3" />
                              <span className="truncate">{getEmpresaNome(req.companyId)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>{format(new Date(req.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LISTA */}
        {viewMode === "lista" && (
          <div className="space-y-2">
            {!isLoading && filtered.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardList className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground font-medium">Nenhuma solicitacao encontrada</p>
                </CardContent>
              </Card>
            )}
            {filtered.map((req) => {
              const col = STATUS_COLUMNS.find(c => c.key === req.status);
              return (
                <Card
                  key={req.id}
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => openDetail(req)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-10 rounded-full ${col?.color ?? "bg-gray-400"} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground text-sm">{req.titulo}</p>
                          <Badge className={`text-xs ${PRIORIDADE_COLORS[req.prioridade]}`}>{req.prioridade}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{TIPO_LABELS[req.tipo]}</span>
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{getEmpresaNome(req.companyId)}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(req.createdAt), "dd/MM/yyyy")}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${col?.textColor} border-current`}>
                        {col?.label ?? req.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Avaliacao */}
      <Dialog open={detailOpen} onOpenChange={(o) => !o && setDetailOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Avaliar Solicitacao
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-1">
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <p className="font-semibold text-foreground">{selectedRequest.titulo}</p>
                {selectedRequest.descricao && (
                  <p className="text-sm text-muted-foreground">{selectedRequest.descricao}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {TIPO_LABELS[selectedRequest.tipo]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {getEmpresaNome(selectedRequest.companyId)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(selectedRequest.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {selectedRequest.observacoes && (
                  <div className="mt-2 p-2 bg-background rounded border border-border/60">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Observacoes anteriores:</p>
                    <p className="text-xs text-foreground">{selectedRequest.observacoes}</p>
                  </div>
                )}
              </div>

              {/* Acoes rapidas */}
              {(NEXT_STATUS[selectedRequest.status]?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Acoes rapidas:</p>
                  <div className="flex flex-wrap gap-2">
                    {NEXT_STATUS[selectedRequest.status].map((s) => {
                      const col = STATUS_COLUMNS.find(c => c.key === s);
                      return (
                        <Button
                          key={s}
                          size="sm"
                          variant="outline"
                          className={`text-xs ${col?.textColor} border-current`}
                          onClick={() => setNovoStatus(s)}
                        >
                          <ArrowRight className="w-3 h-3 mr-1" />
                          {col?.label ?? s}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Status da Solicitacao</Label>
                <Select value={novoStatus} onValueChange={setNovoStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_COLUMNS.map((col) => (
                      <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Observacoes / Parecer</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Adicione observacoes, solicitacoes de documentos ou parecer tecnico..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Fechar</Button>
            <Button
              onClick={() => updateStatusMutation.mutate({
                id: selectedRequest.id,
                status: novoStatus as any,
                observacoes: observacoes || undefined,
              })}
              disabled={!novoStatus || updateStatusMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {updateStatusMutation.isPending ? "Salvando..." : "Salvar Avaliacao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
