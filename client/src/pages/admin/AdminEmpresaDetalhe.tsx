import { useParams, useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import CompanyDocumentsManager from "@/components/CompanyDocumentsManager";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Building2, Mail, Phone, ArrowLeft, Users, FileText,
  Briefcase, AlertCircle, Ticket, UserCheck
} from "lucide-react";

const statusColors: Record<string, string> = {
  ativo: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  inativo: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  suspenso: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

export default function AdminEmpresaDetalhe() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const empresaId = parseInt(params.id ?? "0");

  const { data: empresa, isLoading, refetch: refetchEmpresa } = trpc.companies.get.useQuery(
    { id: empresaId },
    { enabled: !!empresaId }
  );

  const { data: colaboradores = [] } = trpc.employees.list.useQuery(
    { companyId: empresaId },
    { enabled: !!empresaId }
  );

  const { data: solicitacoes = [] } = trpc.requests.list.useQuery(
    { companyId: empresaId },
    { enabled: !!empresaId }
  );

  const { data: tickets = [] } = trpc.tickets.list.useQuery(
    { companyId: empresaId },
    { enabled: !!empresaId }
  );

  const { data: usuarios = [] } = trpc.users.listByCompany.useQuery(
    { companyId: empresaId },
    { enabled: !!empresaId }
  );
  const { data: companyUpdateRequests = [], refetch: refetchCompanyUpdateRequests } = trpc.companyUpdateRequests.listByCompany.useQuery(
    { companyId: empresaId },
    { enabled: !!empresaId }
  );

  const approveUpdateMutation = trpc.companyUpdateRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("Atualização aprovada com sucesso.");
      refetchEmpresa();
      refetchCompanyUpdateRequests();
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectUpdateMutation = trpc.companyUpdateRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("Solicitação devolvida para ajuste.");
      refetchCompanyUpdateRequests();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!empresa) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">Empresa não encontrada.</p>
          <Button variant="outline" onClick={() => navigate("/admin/empresas")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const ativos = colaboradores.filter(c => c.status === "ativo").length;
  const solAbertas = solicitacoes.filter(s => s.status === "nova" || s.status === "em_analise").length;
  const ticketsAbertos = tickets.filter(t => t.status === "aberto").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/empresas")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{empresa.razaoSocial}</h1>
              {empresa.nomeFantasia && (
                <p className="text-sm text-muted-foreground">{empresa.nomeFantasia}</p>
              )}
            </div>
            <Badge variant="outline" className={`ml-2 ${statusColors[empresa.status]}`}>
              {empresa.status}
            </Badge>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-primary/60" />
              <div>
                <p className="text-2xl font-bold">{ativos}</p>
                <p className="text-xs text-muted-foreground">Colaboradores ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-orange-500/60" />
              <div>
                <p className="text-2xl font-bold">{solAbertas}</p>
                <p className="text-xs text-muted-foreground">Solicitações abertas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Ticket className="w-8 h-8 text-red-500/60" />
              <div>
                <p className="text-2xl font-bold">{ticketsAbertos}</p>
                <p className="text-xs text-muted-foreground">Chamados abertos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-green-500/60" />
              <div>
                <p className="text-2xl font-bold">{usuarios.length}</p>
                <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dados da empresa + Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dados cadastrais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Dados Cadastrais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {empresa.cnpj && (
                <div>
                  <p className="text-xs text-muted-foreground">CNPJ</p>
                  <p className="font-mono font-medium">{empresa.cnpj}</p>
                </div>
              )}
              {empresa.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <p>{empresa.email}</p>
                </div>
              )}
              {empresa.telefone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <p>{empresa.telefone}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Cadastrado em</p>
                <p>{new Date(empresa.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Tabs de detalhes */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="colaboradores">
              <TabsList className="w-full">
                <TabsTrigger value="colaboradores" className="flex-1">
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Colaboradores ({colaboradores.length})
                </TabsTrigger>
                <TabsTrigger value="solicitacoes" className="flex-1">
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Solicitações ({solicitacoes.length})
                </TabsTrigger>
                <TabsTrigger value="usuarios" className="flex-1">
                  <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                  Usuários ({usuarios.length})
                </TabsTrigger>
                <TabsTrigger value="documentos" className="flex-1">
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Documentos
                </TabsTrigger>
                <TabsTrigger value="atualizacoes" className="flex-1">
                  <Building2 className="w-3.5 h-3.5 mr-1.5" />
                  Atualizações
                </TabsTrigger>
              </TabsList>

              <TabsContent value="colaboradores">
                <Card>
                  <CardContent className="p-0">
                    {colaboradores.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <Users className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">Nenhum colaborador cadastrado</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {colaboradores.map(col => (
                          <div key={col.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="font-medium text-sm">{col.nome}</p>
                              <p className="text-xs text-muted-foreground font-mono">CPF: {col.cpf}</p>
                            </div>
                            <Badge variant="outline" className={
                              col.status === "ativo" ? "text-green-700 border-green-500/30" :
                              col.status === "afastado" ? "text-yellow-700 border-yellow-500/30" :
                              "text-red-700 border-red-500/30"
                            }>
                              {col.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="solicitacoes">
                <Card>
                  <CardContent className="p-0">
                    {solicitacoes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <FileText className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">Nenhuma solicitação registrada</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {solicitacoes.slice(0, 20).map(sol => (
                          <div key={sol.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="font-medium text-sm">{sol.titulo}</p>
                              <p className="text-xs text-muted-foreground capitalize">{sol.tipo.replace("_", " ")}</p>
                            </div>
                            <Badge variant="outline" className="text-xs capitalize">
                              {sol.status.replace("_", " ")}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usuarios">
                <Card>
                  <CardContent className="p-0">
                    {usuarios.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <UserCheck className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">Nenhum usuário cadastrado</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {usuarios.map(u => (
                          <div key={u.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="font-medium text-sm">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {u.role.replace("company_", "")}
                              </Badge>
                              <Badge variant="outline" className={u.ativo ? "text-green-700 border-green-500/30" : "text-red-700 border-red-500/30"}>
                                {u.ativo ? "ativo" : "inativo"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="documentos">
                <Card>
                  <CardContent className="p-4">
                    <CompanyDocumentsManager
                      companyId={empresaId}
                      canEdit={true}
                      title="Documentos da empresa"
                      description="Gerencie Cartão CNPJ, Contrato Social, PCMSO, PGR, LTCAT e CNO com alerta de validade."
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="atualizacoes">
                <Card>
                  <CardContent className="p-0">
                    {companyUpdateRequests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <Building2 className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">Nenhuma atualização pendente</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {companyUpdateRequests.map((item) => (
                          <div key={item.id} className="space-y-3 px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-sm">Solicitação #{item.id}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.requestedByName ?? "Usuário"} • {new Date(item.createdAt).toLocaleString("pt-BR")}
                                </p>
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {item.status}
                              </Badge>
                            </div>
                            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                              {Object.entries(item.payload).map(([key, value]) => (
                                <p key={key}>
                                  <span className="font-medium text-foreground">{key}:</span> {String(value ?? "-")}
                                </p>
                              ))}
                              {item.motivo && <p className="mt-2">{item.motivo}</p>}
                            </div>
                            {item.status === "pendente" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveUpdateMutation.mutate({ requestId: item.id })}
                                  disabled={approveUpdateMutation.isPending || rejectUpdateMutation.isPending}
                                >
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const motivo = window.prompt("Motivo da devolução:");
                                    if (!motivo?.trim()) return;
                                    rejectUpdateMutation.mutate({ requestId: item.id, motivo });
                                  }}
                                  disabled={approveUpdateMutation.isPending || rejectUpdateMutation.isPending}
                                >
                                  Devolver para ajuste
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
