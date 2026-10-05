import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Calendar, ChevronDown, ChevronLeft, ChevronRight, MapPin, ScrollText, User } from "lucide-react";

const PAGE_SIZE = 50;

const ACAO_LABELS: Record<string, string> = {
  acessou_documento: "Acessou documento",
  aprovar: "Aprovou férias",
  cancelar: "Cancelou férias",
  devolver: "Devolveu férias",
  enviar: "Enviou férias para aprovação",
  aprovou_atualizacao_empresa: "Aprovou atualização cadastral da empresa",
  rejeitou_atualizacao_empresa: "Rejeitou atualização cadastral da empresa",
  solicitou_atualizacao_empresa: "Solicitou atualização cadastral da empresa",
  ativou_usuario: "Ativou usuário",
  desativou_usuario: "Desativou usuário",
  criou_usuario: "Criou usuário",
  alterou_propria_senha: "Alterou a própria senha",
  criou_empresa: "Criou empresa",
  atualizou_empresa: "Atualizou empresa",
  criou_colaborador: "Criou colaborador",
  atualizou_colaborador: "Atualizou colaborador",
  criou_documento_colaborador: "Enviou documento do colaborador",
  editou_documento_colaborador: "Editou documento do colaborador",
  substituiu_documento_colaborador: "Substituiu arquivo do documento do colaborador",
  excluiu_documento_colaborador: "Excluiu documento do colaborador",
  criou_documento_empresa: "Enviou documento da empresa",
  atualizou_documento_empresa: "Atualizou documento da empresa",
  removeu_documento_empresa: "Removeu documento da empresa",
  criou_solicitacao: "Abriu solicitação",
  atualizou_status_solicitacao: "Mudou status da solicitação",
  enviou_documento_solicitacao: "Enviou documento da solicitação",
  criou_chamado: "Abriu chamado",
  atualizou_status_chamado: "Mudou status do chamado",
  criou_funcao: "Criou função",
  atualizou_funcao: "Atualizou função",
  criou_frente_local: "Criou frente/local",
  atualizou_frente_local: "Atualizou frente/local",
  criou_cadastro_organizacional: "Criou cadastro organizacional",
  atualizou_cadastro_organizacional: "Atualizou cadastro organizacional",
  criou_requisito_funcao: "Criou requisito da função",
  atualizou_requisito_funcao: "Atualizou requisito da função",
  removeu_requisito_funcao: "Removeu requisito da função",
  criou_requisito_legal: "Criou requisito legal",
  atualizou_requisito_legal: "Atualizou requisito legal",
  removeu_requisito_legal: "Removeu requisito legal",
};

const ENTIDADE_LABELS: Record<string, string> = {
  companies: "Empresa",
  company_documents: "Documento da empresa",
  company_update_requests: "Atualização cadastral",
  documento: "Arquivo",
  employee_documents: "Documento do colaborador",
  employees: "Colaborador",
  legal_requirements: "Requisito legal",
  position_requirements: "Requisito da função",
  positions: "Função",
  request_document_uploads: "Documento da solicitação",
  requests: "Solicitação",
  tickets: "Chamado",
  users: "Usuário",
  vacations: "Férias",
  worksites: "Frente/local",
};

const PAPEL_LABELS: Record<string, string> = {
  platform_admin: "Administrador da plataforma",
  platform_analyst: "Analista",
  platform_auditor: "Auditor",
  company_admin: "Administrador da empresa",
  company_hr: "RH",
  company_manager: "Gestor",
  company_viewer: "Consulta",
};

function humanize(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDateTime(value: string | Date) {
  const date = new Date(value);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()} ${hh}:${mi}`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseDetails(raw: string | null): [string, unknown][] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return Object.entries(parsed);
    return [["valor", parsed]];
  } catch {
    return [["valor", raw]];
  }
}

export default function AdminAuditoria() {
  const [filterEmpresa, setFilterEmpresa] = useState("0");
  const [filterAcao, setFilterAcao] = useState("todas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: empresas = [] } = trpc.companies.list.useQuery();
  const { data: acoes = [] } = trpc.audit.actions.useQuery();
  const { data, isLoading } = trpc.audit.list.useQuery({
    companyId: filterEmpresa !== "0" ? Number(filterEmpresa) : undefined,
    acao: filterAcao !== "todas" ? filterAcao : undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const logs = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const hasFilters = filterEmpresa !== "0" || filterAcao !== "todas" || dataInicio || dataFim;

  return (
    <AdminLayout title="Auditoria">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Log de Auditoria</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Registro de todas as ações realizadas na plataforma: quem fez, em qual empresa e obra, e o que mudou.
          </p>
        </div>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="auditoria-empresa">Empresa</Label>
                <Select value={filterEmpresa} onValueChange={resetPage(setFilterEmpresa)}>
                  <SelectTrigger id="auditoria-empresa" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Todas as empresas</SelectItem>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={String(empresa.id)}>
                        {empresa.nomeFantasia || empresa.razaoSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="auditoria-acao">Ação</Label>
                <Select value={filterAcao} onValueChange={resetPage(setFilterAcao)}>
                  <SelectTrigger id="auditoria-acao" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as ações</SelectItem>
                    {acoes.map((acao) => (
                      <SelectItem key={acao} value={acao}>{ACAO_LABELS[acao] ?? humanize(acao)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="auditoria-inicio">De</Label>
                <Input id="auditoria-inicio" type="date" value={dataInicio} onChange={(e) => resetPage(setDataInicio)(e.target.value)} />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="auditoria-fim">Até</Label>
                <Input id="auditoria-fim" type="date" value={dataFim} onChange={(e) => resetPage(setDataFim)(e.target.value)} />
              </div>
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 -ml-2"
                onClick={() => {
                  setFilterEmpresa("0");
                  setFilterAcao("todas");
                  setDataInicio("");
                  setDataFim("");
                  setPage(1);
                }}
              >
                Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-primary" />
              Registros ({total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            )}
            {!isLoading && logs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum registro de auditoria</p>
              </div>
            )}
            <div className="space-y-2">
              {logs.map((log) => {
                const details = parseDetails(log.dadosDepois);
                const isOpen = expanded === log.id;
                return (
                  <div key={log.id} className="rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : log.id)}
                      className="flex w-full items-start gap-4 p-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
                      aria-expanded={isOpen}
                    >
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <ScrollText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{ACAO_LABELS[log.acao] ?? humanize(log.acao)}</p>
                          {log.entidade && (
                            <Badge variant="outline" className="text-xs py-0">{ENTIDADE_LABELS[log.entidade] ?? log.entidade}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 min-w-0">
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {log.usuarioNome ?? (log.userId ? `Usuário #${log.userId}` : "Sistema")}
                              {log.usuarioPapel ? ` · ${PAPEL_LABELS[log.usuarioPapel] ?? log.usuarioPapel}` : ""}
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {log.empresaNome ?? "Plataforma"}
                          </span>
                          {log.obraNome && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {log.obraNome}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="border-t border-border px-4 py-3 text-xs space-y-2">
                        {log.usuarioEmail && (
                          <p className="text-muted-foreground">E-mail do usuário: <span className="text-foreground">{log.usuarioEmail}</span></p>
                        )}
                        {log.detalhesOcultos ? (
                          <p className="text-muted-foreground">Detalhes ocultos: podem conter dados de saúde, visíveis só para o Administrador da plataforma e o RH.</p>
                        ) : details.length === 0 ? (
                          <p className="text-muted-foreground">Sem detalhes registrados para esta ação.</p>
                        ) : (
                          <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,12rem)_1fr]">
                            {details.map(([key, value]) => (
                              <div key={key} className="contents">
                                <dt className="text-muted-foreground">{humanize(key)}</dt>
                                <dd className="text-foreground break-words">{formatValue(value)}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {total > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    Próxima
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
