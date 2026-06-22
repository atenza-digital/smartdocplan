import { useEffect, useState } from "react";
import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useLocalAuth as useAuth } from "@/contexts/LocalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Building2,
  MapPin,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatCnpj,
  formatPhone,
  isValidCnpj,
  isValidPhone,
} from "@shared/formValidation";

const roleLabel: Record<string, string> = {
  company_admin: "Administrador da Empresa",
  company_hr: "Profissional de RH",
  company_manager: "Gestor",
  company_viewer: "Consulta",
};

type LegalForm = {
  norma: string;
  requisito: string;
  documentoExigido: string;
  validadeMeses: string;
  descricao: string;
};

const emptyLegalForm: LegalForm = {
  norma: "",
  requisito: "",
  documentoExigido: "",
  validadeMeses: "",
  descricao: "",
};

export default function EmpresaConfiguracoes() {
  const { user } = useAuth();
  const companyId = user?.companyId ?? 0;
  const canEdit = ["company_admin", "company_hr"].includes(user?.role ?? "");

  const { data: empresa } = trpc.companies.get.useQuery({ id: companyId }, { enabled: companyId > 0 });
  const { data: cargos = [], refetch: refetchCargos } = trpc.positions.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: locais = [], refetch: refetchLocais } = trpc.worksites.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: matrizLegal = [], refetch: refetchMatriz } = trpc.legalRequirements.list.useQuery({ companyId }, { enabled: companyId > 0 });

  const [form, setForm] = useState({ razaoSocial: "", nomeFantasia: "", cnpj: "", email: "", telefone: "" });
  const [novoCargo, setNovoCargo] = useState({ nome: "", cbo: "", descricao: "" });
  const [cargoModal, setCargoModal] = useState(false);
  const [novoLocal, setNovoLocal] = useState({ nome: "", cnos: "", endereco: "", cidade: "", estado: "" });
  const [localModal, setLocalModal] = useState(false);
  const [legalModal, setLegalModal] = useState(false);
  const [editingLegalId, setEditingLegalId] = useState<number | null>(null);
  const [legalForm, setLegalForm] = useState<LegalForm>(emptyLegalForm);

  useEffect(() => {
    if (!empresa) return;

    setForm({
      razaoSocial: empresa.razaoSocial ?? "",
      nomeFantasia: empresa.nomeFantasia ?? "",
      cnpj: empresa.cnpj ?? "",
      email: empresa.email ?? "",
      telefone: empresa.telefone ?? "",
    });
  }, [empresa]);

  const updateEmpresaMutation = trpc.companies.update.useMutation({
    onSuccess: () => toast.success("Dados da empresa atualizados!"),
    onError: (error) => toast.error(error.message),
  });

  const createCargoMutation = trpc.positions.create.useMutation({
    onSuccess: () => {
      toast.success("Função cadastrada com sucesso!");
      setCargoModal(false);
      setNovoCargo({ nome: "", cbo: "", descricao: "" });
      refetchCargos();
    },
    onError: (error) => toast.error(error.message),
  });

  const createLocalMutation = trpc.worksites.create.useMutation({
    onSuccess: () => {
      toast.success("Frente / local cadastrado com sucesso!");
      setLocalModal(false);
      setNovoLocal({ nome: "", cnos: "", endereco: "", cidade: "", estado: "" });
      refetchLocais();
    },
    onError: (error) => toast.error(error.message),
  });

  const createLegalMutation = trpc.legalRequirements.create.useMutation({
    onSuccess: () => {
      toast.success("Requisito legal adicionado!");
      setLegalModal(false);
      setEditingLegalId(null);
      setLegalForm(emptyLegalForm);
      refetchMatriz();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateLegalMutation = trpc.legalRequirements.update.useMutation({
    onSuccess: () => {
      toast.success("Requisito legal atualizado!");
      setLegalModal(false);
      setEditingLegalId(null);
      setLegalForm(emptyLegalForm);
      refetchMatriz();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteLegalMutation = trpc.legalRequirements.delete.useMutation({
    onSuccess: () => {
      toast.success("Requisito removido!");
      refetchMatriz();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSaveEmpresa = () => {
    if (!form.razaoSocial.trim()) {
      toast.error("Informe a razão social.");
      return;
    }

    if (form.cnpj.trim() && !isValidCnpj(form.cnpj)) {
      toast.error("Informe um CNPJ válido.");
      return;
    }

    if (form.telefone.trim() && !isValidPhone(form.telefone)) {
      toast.error("Informe um telefone válido com DDD.");
      return;
    }

    updateEmpresaMutation.mutate({
      id: companyId,
      razaoSocial: form.razaoSocial.trim(),
      nomeFantasia: form.nomeFantasia.trim() || undefined,
      cnpj: form.cnpj.trim() || undefined,
      email: form.email.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
    });
  };

  const openNewLegalModal = () => {
    setEditingLegalId(null);
    setLegalForm(emptyLegalForm);
    setLegalModal(true);
  };

  const openEditLegalModal = (item: (typeof matrizLegal)[number]) => {
    setEditingLegalId(item.id);
    setLegalForm({
      norma: item.norma,
      requisito: item.requisito,
      documentoExigido: item.documentoExigido,
      validadeMeses: item.validadeMeses ? String(item.validadeMeses) : "",
      descricao: item.descricao ?? "",
    });
    setLegalModal(true);
  };

  const handleSaveLegal = () => {
    if (!legalForm.norma.trim() || !legalForm.requisito.trim() || !legalForm.documentoExigido.trim()) {
      toast.error("Preencha norma, requisito e documento exigido.");
      return;
    }

    const payload = {
      norma: legalForm.norma.trim(),
      requisito: legalForm.requisito.trim(),
      documentoExigido: legalForm.documentoExigido.trim(),
      validadeMeses: legalForm.validadeMeses ? Number(legalForm.validadeMeses) : undefined,
      descricao: legalForm.descricao.trim() || undefined,
    };

    if (editingLegalId) {
      updateLegalMutation.mutate({ id: editingLegalId, ...payload });
      return;
    }

    createLegalMutation.mutate({ companyId, ...payload });
  };

  return (
    <CompanyLayout title="Configurações">
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie as informações, funções, locais e requisitos legais da sua empresa.
          </p>
        </div>

        <Tabs defaultValue="empresa">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="empresa" className="text-xs">
              <Building2 className="mr-1 h-3.5 w-3.5" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="cargos" className="text-xs">
              <Briefcase className="mr-1 h-3.5 w-3.5" />
              Funções
            </TabsTrigger>
            <TabsTrigger value="locais" className="text-xs">
              <MapPin className="mr-1 h-3.5 w-3.5" />
              Locais
            </TabsTrigger>
            <TabsTrigger value="matriz" className="text-xs">
              <BookOpen className="mr-1 h-3.5 w-3.5" />
              Matriz Legal
            </TabsTrigger>
            <TabsTrigger value="perfil" className="text-xs">
              <Users className="mr-1 h-3.5 w-3.5" />
              Perfil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa" className="mt-4">
            <Card className="max-w-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Building2 className="h-4 w-4 text-primary" />
                  Dados da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Razão Social</Label>
                    <Input
                      value={form.razaoSocial}
                      onChange={(event) => setForm((current) => ({ ...current, razaoSocial: event.target.value }))}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Nome Fantasia</Label>
                    <Input
                      value={form.nomeFantasia}
                      onChange={(event) => setForm((current) => ({ ...current, nomeFantasia: event.target.value }))}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>CNPJ</Label>
                    <Input
                      value={form.cnpj}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, cnpj: formatCnpj(event.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input
                      value={form.telefone}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, telefone: formatPhone(event.target.value) }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                {canEdit && (
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSaveEmpresa}
                      disabled={updateEmpresaMutation.isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {updateEmpresaMutation.isPending ? "Salvando..." : "Salvar alterações"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cargos" className="mt-4">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Funções da Empresa</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Cadastre as funções auxiliares usadas nos fluxos e colaboradores.
                  </p>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={() => setCargoModal(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Nova Função
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {cargos.length === 0 && (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      Nenhuma função cadastrada.
                    </CardContent>
                  </Card>
                )}

                {cargos.map((cargo) => (
                  <Card key={cargo.id}>
                    <CardContent className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{cargo.nome}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {cargo.cbo && <span>CBO: {cargo.cbo}</span>}
                        {cargo.descricao && <span>{cargo.descricao}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="locais" className="mt-4">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Frentes / Locais</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Cadastre obras, frentes e locais auxiliares para uso nos processos.
                  </p>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={() => setLocalModal(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Novo Local
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {locais.length === 0 && (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum local cadastrado.
                    </CardContent>
                  </Card>
                )}

                {locais.map((local) => (
                  <Card key={local.id}>
                    <CardContent className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{local.nome}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {local.cnos && <span>CNOS: {local.cnos}</span>}
                        {local.cidade && <span>{local.cidade}{local.estado ? `/${local.estado}` : ""}</span>}
                        {local.endereco && <span>{local.endereco}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="matriz" className="mt-4">
            <div className="max-w-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Matriz de Requisitos Legais</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    NRs e requisitos legais aplicáveis a esta empresa.
                  </p>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={openNewLegalModal} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Adicionar Requisito
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {matrizLegal.length === 0 && (
                  <Card>
                    <CardContent className="py-10 text-center">
                      <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum requisito legal cadastrado para esta empresa.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {matrizLegal.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-xs text-primary">
                              {item.norma}
                            </Badge>
                            <p className="text-sm font-medium text-foreground">{item.requisito}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">Documento: {item.documentoExigido}</p>
                          {item.validadeMeses && (
                            <p className="text-xs text-muted-foreground">Validade: {item.validadeMeses} meses</p>
                          )}
                          {item.descricao && (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{item.descricao}</p>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLegalModal(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (window.confirm("Deseja inativar este requisito legal?")) {
                                  deleteLegalMutation.mutate({ id: item.id });
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="perfil" className="mt-4">
            <div className="max-w-md space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Users className="h-4 w-4 text-primary" />
                    Meu Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                      {roleLabel[user?.role ?? ""] ?? user?.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para alterar seus dados de acesso ou senha, entre em contato com o administrador da plataforma.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Shield className="h-4 w-4 text-primary" />
                    Segurança
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Autenticação</p>
                      <p className="text-xs text-muted-foreground">Login por e-mail e senha</p>
                    </div>
                    <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400">
                      Ativo
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={cargoModal} onOpenChange={setCargoModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Função</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome da Função *</Label>
              <Input
                value={novoCargo.nome}
                onChange={(event) => setNovoCargo((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Ex: Eletricista de Manutenção"
              />
            </div>
            <div className="space-y-1.5">
              <Label>CBO</Label>
              <Input
                value={novoCargo.cbo}
                onChange={(event) => setNovoCargo((current) => ({ ...current, cbo: event.target.value }))}
                placeholder="Ex: 9101-05"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                rows={4}
                className="min-h-28 resize-y"
                value={novoCargo.descricao}
                onChange={(event) => setNovoCargo((current) => ({ ...current, descricao: event.target.value }))}
                placeholder="Descreva a função, atividades ou observações internas."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCargoModal(false)}>Cancelar</Button>
            <Button
              onClick={() =>
                createCargoMutation.mutate({
                  companyId,
                  nome: novoCargo.nome.trim(),
                  cbo: novoCargo.cbo.trim() || undefined,
                  descricao: novoCargo.descricao.trim() || undefined,
                })
              }
              disabled={!novoCargo.nome.trim() || createCargoMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createCargoMutation.isPending ? "Criando..." : "Criar função"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={localModal} onOpenChange={setLocalModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Local de Trabalho</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={novoLocal.nome}
                onChange={(event) => setNovoLocal((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Ex: Obra Av. Paulista"
              />
            </div>
            <div className="space-y-1.5">
              <Label>CNOS</Label>
              <Input
                value={novoLocal.cnos}
                onChange={(event) => setNovoLocal((current) => ({ ...current, cnos: event.target.value }))}
                placeholder="Código CNOS"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input
                value={novoLocal.endereco}
                onChange={(event) => setNovoLocal((current) => ({ ...current, endereco: event.target.value }))}
                placeholder="Rua, número e complemento"
                maxLength={255}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input
                  value={novoLocal.cidade}
                  onChange={(event) => setNovoLocal((current) => ({ ...current, cidade: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Input
                  maxLength={2}
                  value={novoLocal.estado}
                  onChange={(event) => setNovoLocal((current) => ({ ...current, estado: event.target.value.toUpperCase() }))}
                  placeholder="SP"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocalModal(false)}>Cancelar</Button>
            <Button
              onClick={() =>
                createLocalMutation.mutate({
                  companyId,
                  nome: novoLocal.nome.trim(),
                  cnos: novoLocal.cnos.trim() || undefined,
                  endereco: novoLocal.endereco.trim() || undefined,
                  cidade: novoLocal.cidade.trim() || undefined,
                  estado: novoLocal.estado.trim().toUpperCase() || undefined,
                })
              }
              disabled={!novoLocal.nome.trim() || createLocalMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createLocalMutation.isPending ? "Criando..." : "Criar local"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={legalModal}
        onOpenChange={(open) => {
          setLegalModal(open);
          if (!open) {
            setEditingLegalId(null);
            setLegalForm(emptyLegalForm);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLegalId ? "Editar Requisito Legal" : "Adicionar Requisito Legal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Norma *</Label>
              <Input
                value={legalForm.norma}
                onChange={(event) => setLegalForm((current) => ({ ...current, norma: event.target.value }))}
                placeholder="Ex: NR-35"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Requisito *</Label>
              <Input
                value={legalForm.requisito}
                onChange={(event) => setLegalForm((current) => ({ ...current, requisito: event.target.value }))}
                placeholder="Ex: Trabalho em altura"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Documento Exigido *</Label>
              <Input
                value={legalForm.documentoExigido}
                onChange={(event) => setLegalForm((current) => ({ ...current, documentoExigido: event.target.value }))}
                placeholder="Ex: Certificado NR-35"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Validade (meses)</Label>
              <Input
                type="number"
                value={legalForm.validadeMeses}
                onChange={(event) => setLegalForm((current) => ({ ...current, validadeMeses: event.target.value }))}
                placeholder="Ex: 24"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                rows={5}
                className="min-h-32 resize-y"
                value={legalForm.descricao}
                onChange={(event) => setLegalForm((current) => ({ ...current, descricao: event.target.value }))}
                placeholder="Observações adicionais, exceções ou detalhes do requisito."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLegalModal(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveLegal}
              disabled={
                !legalForm.norma.trim() ||
                !legalForm.requisito.trim() ||
                !legalForm.documentoExigido.trim() ||
                createLegalMutation.isPending ||
                updateLegalMutation.isPending
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createLegalMutation.isPending || updateLegalMutation.isPending
                ? "Salvando..."
                : editingLegalId
                  ? "Salvar alterações"
                  : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CompanyLayout>
  );
}
