import { useState } from "react";
import { RequestDocumentos } from "@/components/RequestDocumentos";
import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ClipboardList, Calendar, User, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const KANBAN_COLUMNS = [
  { key: "nova", label: "Nova Solicitação", color: "border-t-amber-400" },
  { key: "em_analise", label: "Em Análise", color: "border-t-blue-400" },
  { key: "aguardando_correcao", label: "Aguardando Correção", color: "border-t-orange-400" },
  { key: "aguardando_documentos", label: "Aguardando Documentos", color: "border-t-purple-400" },
  { key: "aprovado", label: "Aprovado", color: "border-t-teal-400" },
  { key: "concluido", label: "Concluído", color: "border-t-green-400" },
  { key: "rejeitado", label: "Rejeitado", color: "border-t-red-400" },
];

const tipoLabels: Record<string, string> = {
  admissao: "Admissão",
  demissao: "Demissão",
  mudanca_funcao: "Mudança de Função",
  afastamento: "Afastamento",
  atestado_medico: "Atestado Médico",
  outros: "Outros",
};

const prioridadeColors: Record<string, string> = {
  baixa: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  media: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  alta: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  urgente: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function EmpresaSolicitacoes() {
  const { user } = useAuth();
  const companyId = user?.companyId ?? 0;
  const [docModal, setDocModal] = useState<{ id: number; tipo: string; titulo: string } | null>(null);
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    titulo: "", tipo: "admissao" as const, descricao: "", prioridade: "media" as const,
  });

  const { data: solicitacoes = [], isLoading, refetch } = trpc.requests.list.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );

  const createMutation = trpc.requests.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitação criada com sucesso!");
      setShowModal(false);
      refetch();
      setForm({ titulo: "", tipo: "admissao", descricao: "", prioridade: "media" });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.requests.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const byStatus = (status: string) => solicitacoes.filter((s) => s.status === status);

  return (
    <CompanyLayout title="Solicitações de RH">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Solicitações de RH</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Acompanhe e gerencie todas as solicitações de RH da sua empresa.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Nova Solicitação
          </Button>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>

          {/* KANBAN */}
          <TabsContent value="kanban" className="mt-4">
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {KANBAN_COLUMNS.map((col) => {
                  const items = byStatus(col.key);
                  return (
                    <div key={col.key} className="w-64 shrink-0">
                      <div className={`rounded-lg border border-border border-t-4 ${col.color} bg-card`}>
                        <div className="p-3 border-b border-border flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{col.label}</span>
                          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                        </div>
                        <div className="p-2 space-y-2 min-h-24">
                          {items.map((sol) => (
                            <div
                              key={sol.id}
                              className="bg-background rounded-lg p-3 border border-border hover:border-primary/30 transition-colors cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-1 mb-2">
                                <span className="text-xs font-semibold text-foreground line-clamp-2 flex-1">{sol.titulo}</span>
                                <Badge variant="outline" className={`text-[10px] shrink-0 ${prioridadeColors[sol.prioridade]}`}>
                                  {sol.prioridade}
                                </Badge>
                              </div>
                              <Badge variant="outline" className="text-[10px] mb-2">
                                {tipoLabels[sol.tipo] ?? sol.tipo}
                              </Badge>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(sol.createdAt).toLocaleDateString("pt-BR")}
                              </div>
                              {/* Documentos */}
                              <button
                                className="flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
                                onClick={(e) => { e.stopPropagation(); setDocModal({ id: sol.id, tipo: sol.tipo, titulo: sol.titulo }); }}
                              >
                                <Paperclip className="w-3 h-3" /> Documentos
                              </button>
                              {/* Mover status */}
                              <Select
                                value={sol.status}
                                onValueChange={(v) => updateStatus.mutate({ id: sol.id, status: v as any })}
                              >
                                <SelectTrigger className="h-6 text-[10px] mt-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {KANBAN_COLUMNS.map((c) => (
                                    <SelectItem key={c.key} value={c.key} className="text-xs">{c.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                          {items.length === 0 && (
                            <p className="text-[10px] text-muted-foreground text-center py-4">Vazio</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* LISTA */}
          <TabsContent value="lista" className="mt-4">
            <div className="space-y-3">
              {isLoading && [...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
              ))}
              {!isLoading && solicitacoes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma solicitação encontrada</p>
                  <p className="text-sm">Crie a primeira solicitação clicando em "Nova Solicitação"</p>
                </div>
              )}
              {solicitacoes.map((sol) => (
                <Card key={sol.id} className="border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">#{sol.id} — {sol.titulo}</span>
                          <Badge variant="outline" className="text-xs">{tipoLabels[sol.tipo] ?? sol.tipo}</Badge>
                          <Badge variant="outline" className={`text-xs ${prioridadeColors[sol.prioridade]}`}>
                            {sol.prioridade}
                          </Badge>
                        </div>
                        {sol.descricao && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sol.descricao}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(sol.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Select
                        value={sol.status}
                        onValueChange={(v) => updateStatus.mutate({ id: sol.id, status: v as any })}
                      >
                        <SelectTrigger className="w-44 h-8 text-xs shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KANBAN_COLUMNS.map((c) => (
                            <SelectItem key={c.key} value={c.key} className="text-xs">{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Documentos da Solicitação */}
      {docModal && (
        <Dialog open={!!docModal} onOpenChange={() => setDocModal(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">
                Documentos — #{docModal.id} {docModal.titulo}
              </DialogTitle>
            </DialogHeader>
            <RequestDocumentos
              requestId={docModal.id}
              tipoSolicitacao={docModal.tipo}
              canUpload={true}
              canReview={false}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Nova Solicitação */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de RH</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo de Solicitação *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Admissão de João Silva" />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva os detalhes da solicitação..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({ companyId, ...form })}
              disabled={!form.titulo || createMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {createMutation.isPending ? "Criando..." : "Criar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CompanyLayout>
  );
}
