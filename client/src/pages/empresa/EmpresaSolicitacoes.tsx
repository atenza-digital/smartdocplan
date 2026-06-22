import { useMemo, useState } from "react";
import { Link } from "wouter";
import CompanyLayout from "@/components/CompanyLayout";
import { RequestDocumentos } from "@/components/RequestDocumentos";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ClipboardList, FileText, Paperclip, Plus, Search } from "lucide-react";
import { canCreateRequests } from "@shared/permissions";
import { normalizeTextSearch } from "@shared/formValidation";

const STATUS_COLUMNS = [
  { key: "nova", label: "Nova solicitação", color: "border-t-amber-400" },
  { key: "em_analise", label: "Em análise", color: "border-t-blue-400" },
  { key: "aguardando_correcao", label: "Aguardando correção", color: "border-t-orange-400" },
  { key: "aguardando_documentos", label: "Aguardando documentos", color: "border-t-purple-400" },
  { key: "aprovado", label: "Aprovado", color: "border-t-teal-400" },
  { key: "concluido", label: "Concluído", color: "border-t-green-400" },
  { key: "rejeitado", label: "Rejeitado", color: "border-t-red-400" },
] as const;

const tipoLabels: Record<string, string> = {
  admissao: "Admissão",
  demissao: "Demissão",
  mudanca_funcao: "Mudança de função",
  afastamento: "Afastamento",
  atestado_medico: "Atestado médico",
  outros: "Outros",
};

const prioridadeColors: Record<string, string> = {
  baixa: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  media: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  alta: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  urgente: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const statusColors: Record<string, string> = {
  nova: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  em_analise: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  aguardando_correcao: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  aguardando_documentos: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  aprovado: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  concluido: "bg-green-500/10 text-green-700 dark:text-green-400",
  rejeitado: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function EmpresaSolicitacoes() {
  const { user } = useAuth();
  const companyId = user?.companyId ?? 0;
  const canCreate = canCreateRequests(user?.role ?? null);

  const [docModal, setDocModal] = useState<{ id: number; tipo: string; titulo: string } | null>(null);
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");

  const { data: solicitacoes = [], isLoading } = trpc.requests.list.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );

  const filteredSolicitacoes = useMemo(() => {
    const normalizedSearch = normalizeTextSearch(search);
    const digitSearch = search.replace(/\D/g, "");

    return solicitacoes.filter((solicitacao) => {
      const matchesStatus = statusFilter === "todos" || solicitacao.status === statusFilter;
      const matchesTipo = tipoFilter === "todos" || solicitacao.tipo === tipoFilter;
      if (!matchesStatus || !matchesTipo) return false;

      if (!normalizedSearch) return true;

      const searchableText = normalizeTextSearch(
        [
          solicitacao.titulo,
          solicitacao.descricao ?? "",
          tipoLabels[solicitacao.tipo] ?? solicitacao.tipo,
          String(solicitacao.id),
        ].join(" ")
      );
      const digitsFromDescription = (solicitacao.descricao ?? "").replace(/\D/g, "");

      return (
        searchableText.includes(normalizedSearch) ||
        (!!digitSearch && digitsFromDescription.includes(digitSearch))
      );
    });
  }, [search, solicitacoes, statusFilter, tipoFilter]);

  const byStatus = (status: string) =>
    filteredSolicitacoes.filter((solicitacao) => solicitacao.status === status);

  const summary = useMemo(
    () =>
      STATUS_COLUMNS.map((column) => ({
        ...column,
        total: byStatus(column.key).length,
      })),
    [filteredSolicitacoes]
  );

  return (
    <CompanyLayout title="Solicitações de RH">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Solicitações de RH</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pesquise por nome, CPF no histórico da solicitação, tipo e status para acompanhar os fluxos da empresa.
            </p>
          </div>

          {canCreate && (
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/empresa/solicitacoes/nova">
                <Plus className="mr-2 h-4 w-4" />
                Nova solicitação
              </Link>
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título, nome, CPF, descrição ou número..."
              className="pl-9"
            />
          </div>

          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(tipoLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS_COLUMNS.map((column) => (
                <SelectItem key={column.key} value={column.key}>
                  {column.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
          {summary.map((item) => (
            <Card key={item.key} className={`border-border border-t-4 ${item.color}`}>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{item.total}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={view} onValueChange={(value) => setView(value as "kanban" | "lista")}>
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-4">
            <div className="overflow-x-auto pb-4">
              <div className="flex min-w-max gap-4">
                {STATUS_COLUMNS.map((column) => {
                  const items = byStatus(column.key);

                  return (
                    <div key={column.key} className="w-72 shrink-0">
                      <div className={`rounded-lg border border-border border-t-4 ${column.color} bg-card`}>
                        <div className="flex items-center justify-between border-b border-border p-3">
                          <span className="text-xs font-semibold text-foreground">{column.label}</span>
                          <Badge variant="secondary" className="text-xs">
                            {items.length}
                          </Badge>
                        </div>

                        <div className="min-h-24 space-y-2 p-2">
                          {items.map((solicitacao) => (
                            <div
                              key={solicitacao.id}
                              className="rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/30"
                            >
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <span className="line-clamp-2 flex-1 text-xs font-semibold text-foreground">
                                  {solicitacao.titulo}
                                </span>
                                <Badge variant="outline" className={`shrink-0 text-[10px] ${prioridadeColors[solicitacao.prioridade]}`}>
                                  {solicitacao.prioridade}
                                </Badge>
                              </div>

                              <Badge variant="outline" className="mb-2 text-[10px]">
                                {tipoLabels[solicitacao.tipo] ?? solicitacao.tipo}
                              </Badge>

                              <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(solicitacao.createdAt).toLocaleDateString("pt-BR")}
                              </div>

                              <button
                                className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:underline"
                                onClick={() =>
                                  setDocModal({
                                    id: solicitacao.id,
                                    tipo: solicitacao.tipo,
                                    titulo: solicitacao.titulo,
                                  })
                                }
                              >
                                <Paperclip className="h-3 w-3" />
                                Documentos
                              </button>
                            </div>
                          ))}

                          {items.length === 0 && (
                            <p className="py-4 text-center text-[10px] text-muted-foreground">Sem itens</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lista" className="mt-4">
            <div className="space-y-3">
              {isLoading &&
                [...Array(4)].map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-lg bg-muted" />
                ))}

              {!isLoading && filteredSolicitacoes.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-30" />
                  <p className="font-medium">Nenhuma solicitação encontrada</p>
                  <p className="text-sm">
                    {canCreate
                      ? "Ajuste os filtros ou crie uma nova solicitação."
                      : "Não há solicitações para acompanhar no momento."}
                  </p>
                </div>
              )}

              {filteredSolicitacoes.map((solicitacao) => (
                <Card key={solicitacao.id} className="border-border transition-colors hover:border-primary/30">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            #{solicitacao.id} - {solicitacao.titulo}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {tipoLabels[solicitacao.tipo] ?? solicitacao.tipo}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${prioridadeColors[solicitacao.prioridade]}`}>
                            {solicitacao.prioridade}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${statusColors[solicitacao.status]}`}>
                            {STATUS_COLUMNS.find((item) => item.key === solicitacao.status)?.label ?? solicitacao.status}
                          </Badge>
                        </div>

                        {solicitacao.descricao && (
                          <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{solicitacao.descricao}</p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(solicitacao.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                          <button
                            className="flex items-center gap-1 text-primary hover:underline"
                            onClick={() =>
                              setDocModal({
                                id: solicitacao.id,
                                tipo: solicitacao.tipo,
                                titulo: solicitacao.titulo,
                              })
                            }
                          >
                            <FileText className="h-3 w-3" />
                            Ver documentos
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {docModal && (
        <Dialog open={!!docModal} onOpenChange={() => setDocModal(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Documentos - #{docModal.id} {docModal.titulo}
              </DialogTitle>
            </DialogHeader>

            <RequestDocumentos
              requestId={docModal.id}
              tipoSolicitacao={docModal.tipo}
              canUpload={canCreate}
              canReview={false}
              readOnly={!canCreate}
            />
          </DialogContent>
        </Dialog>
      )}
    </CompanyLayout>
  );
}
