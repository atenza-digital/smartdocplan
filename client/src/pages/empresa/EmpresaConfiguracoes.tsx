import { useEffect, useState } from "react";
import CompanyLayout from "@/components/CompanyLayout";
import CompanyDocumentsManager from "@/components/CompanyDocumentsManager";
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

type PositionRequirementForm = {
  categoria: "treinamento" | "exame_medico" | "psicossocial" | "outros";
  tipoSolicitacao: "todos" | "admissao" | "demissao" | "mudanca_funcao";
  documentoNome: string;
  descricao: string;
  obrigatorio: boolean;
  validadeMeses: string;
  legalRequirementId: string;
  ordem: string;
};

const emptyPositionRequirementForm: PositionRequirementForm = {
  categoria: "treinamento",
  tipoSolicitacao: "todos",
  documentoNome: "",
  descricao: "",
  obrigatorio: true,
  validadeMeses: "",
  legalRequirementId: "none",
  ordem: "0",
};

const requirementCategoryLabel: Record<string, string> = {
  treinamento: "Treinamento",
  exame_medico: "Exame Médico",
  psicossocial: "Psicossocial",
  outros: "Outros",
};

const requirementProcessLabel: Record<string, string> = {
  todos: "Todos os processos",
  admissao: "Admissão",
  demissao: "Demissão",
  mudanca_funcao: "Mudança de função",
};

export default function EmpresaConfiguracoes() {
  const { user, effectiveCompanyId } = useAuth();
  const companyId = effectiveCompanyId ?? 0;
  const canEdit = ["platform_admin", "company_admin", "company_hr"].includes(user?.role ?? "");

  const { data: empresa } = trpc.companies.get.useQuery({ id: companyId }, { enabled: companyId > 0 });
  const { data: companyUpdateRequests = [], refetch: refetchCompanyUpdateRequests } = trpc.companyUpdateRequests.listByCompany.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );
  const { data: cargos = [], refetch: refetchCargos } = trpc.positions.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: locais = [], refetch: refetchLocais } = trpc.worksites.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: matrizLegal = [], refetch: refetchMatriz } = trpc.legalRequirements.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const [selectedCargoId, setSelectedCargoId] = useState<number | null>(null);
  const { data: requisitosCargo = [], refetch: refetchRequisitosCargo } = trpc.positionRequirements.listByPosition.useQuery(
    { positionId: selectedCargoId ?? 0 },
    { enabled: (selectedCargoId ?? 0) > 0 }
  );

  const [form, setForm] = useState({ razaoSocial: "", nomeFantasia: "", cnpj: "", email: "", telefone: "" });
  const [novoCargo, setNovoCargo] = useState({ nome: "", cbo: "", descricao: "" });
  const [cargoModal, setCargoModal] = useState(false);
  const [editingCargoId, setEditingCargoId] = useState<number | null>(null);
  const [novoLocal, setNovoLocal] = useState({ nome: "", cnos: "", endereco: "", cidade: "", estado: "" });
  const [localModal, setLocalModal] = useState(false);
  const [editingLocalId, setEditingLocalId] = useState<number | null>(null);
  const [legalModal, setLegalModal] = useState(false);
  const [editingLegalId, setEditingLegalId] = useState<number | null>(null);
  const [legalForm, setLegalForm] = useState<LegalForm>(emptyLegalForm);
  const [requirementModal, setRequirementModal] = useState(false);
  const [editingRequirementId, setEditingRequirementId] = useState<number | null>(null);
  const [positionRequirementForm, setPositionRequirementForm] = useState<PositionRequirementForm>(emptyPositionRequirementForm);

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

  useEffect(() => {
    if (cargos.length === 0) {
      setSelectedCargoId(null);
      return;
    }

    setSelectedCargoId((current) => {
      if (current && cargos.some((cargo) => cargo.id === current)) {
        return current;
      }
      return cargos[0]?.id ?? null;
    });
  }, [cargos]);

  const updateEmpresaMutation = trpc.companyUpdateRequests.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitação enviada para aprovação da SmartDocPlan.");
      refetchCompanyUpdateRequests();
    },
    onError: (error) => toast.error(error.message),
  });

  const createCargoMutation = trpc.positions.create.useMutation({
    onSuccess: () => {
      toast.success("Função cadastrada com sucesso!");
      setCargoModal(false);
      setEditingCargoId(null);
      setNovoCargo({ nome: "", cbo: "", descricao: "" });
      refetchCargos();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateCargoMutation = trpc.positions.update.useMutation({
    onSuccess: () => {
      toast.success("Função atualizada com sucesso!");
      setCargoModal(false);
      setEditingCargoId(null);
      setNovoCargo({ nome: "", cbo: "", descricao: "" });
      refetchCargos();
    },
    onError: (error) => toast.error(error.message),
  });

  const createLocalMutation = trpc.worksites.create.useMutation({
    onSuccess: () => {
      toast.success("Frente / local cadastrado com sucesso!");
      setLocalModal(false);
      setEditingLocalId(null);
      setNovoLocal({ nome: "", cnos: "", endereco: "", cidade: "", estado: "" });
      refetchLocais();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateLocalMutation = trpc.worksites.update.useMutation({
    onSuccess: () => {
      toast.success("Frente / local atualizada com sucesso!");
      setLocalModal(false);
      setEditingLocalId(null);
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

  const createPositionRequirementMutation = trpc.positionRequirements.create.useMutation({
    onSuccess: () => {
      toast.success("Requisito da função cadastrado!");
      setRequirementModal(false);
      setEditingRequirementId(null);
      setPositionRequirementForm(emptyPositionRequirementForm);
      refetchRequisitosCargo();
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePositionRequirementMutation = trpc.positionRequirements.update.useMutation({
    onSuccess: () => {
      toast.success("Requisito da função atualizado!");
      setRequirementModal(false);
      setEditingRequirementId(null);
      setPositionRequirementForm(emptyPositionRequirementForm);
      refetchRequisitosCargo();
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePositionRequirementMutation = trpc.positionRequirements.delete.useMutation({
    onSuccess: () => {
      toast.success("Requisito da função inativado!");
      refetchRequisitosCargo();
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
      companyId,
      razaoSocial: form.razaoSocial.trim(),
      nomeFantasia: form.nomeFantasia.trim() || undefined,
      cnpj: form.cnpj.trim() || undefined,
      email: form.email.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
    });
  };

  const openNewCargoModal = () => {
    setEditingCargoId(null);
    setNovoCargo({ nome: "", cbo: "", descricao: "" });
    setCargoModal(true);
  };

  const openEditCargoModal = (cargo: (typeof cargos)[number]) => {
    setEditingCargoId(cargo.id);
    setNovoCargo({
      nome: cargo.nome ?? "",
      cbo: cargo.cbo ?? "",
      descricao: cargo.descricao ?? "",
    });
    setCargoModal(true);
  };

  const openNewLocalModal = () => {
    setEditingLocalId(null);
    setNovoLocal({ nome: "", cnos: "", endereco: "", cidade: "", estado: "" });
    setLocalModal(true);
  };

  const openEditLocalModal = (local: (typeof locais)[number]) => {
    setEditingLocalId(local.id);
    setNovoLocal({
      nome: local.nome ?? "",
      cnos: local.cnos ?? "",
      endereco: local.endereco ?? "",
      cidade: local.cidade ?? "",
      estado: local.estado ?? "",
    });
    setLocalModal(true);
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

  const openNewRequirementModal = () => {
    if (!selectedCargoId) {
      toast.error("Selecione uma função antes de cadastrar requisitos.");
      return;
    }

    setEditingRequirementId(null);
    setPositionRequirementForm(emptyPositionRequirementForm);
    setRequirementModal(true);
  };

  const openEditRequirementModal = (item: (typeof requisitosCargo)[number]) => {
    setEditingRequirementId(item.id);
    setPositionRequirementForm({
      categoria: item.categoria,
      tipoSolicitacao: item.tipoSolicitacao,
      documentoNome: item.documentoNome,
      descricao: item.descricao ?? "",
      obrigatorio: item.obrigatorio,
      validadeMeses: item.validadeMeses ? String(item.validadeMeses) : "",
      legalRequirementId: item.legalRequirementId ? String(item.legalRequirementId) : "none",
      ordem: String(item.ordem ?? 0),
    });
    setRequirementModal(true);
  };

  const handleSavePositionRequirement = () => {
    if (!selectedCargoId) {
      toast.error("Selecione uma função antes de salvar.");
      return;
    }

    if (!positionRequirementForm.documentoNome.trim()) {
      toast.error("Informe o nome do requisito.");
      return;
    }

    const payload = {
      categoria: positionRequirementForm.categoria,
      tipoSolicitacao: positionRequirementForm.tipoSolicitacao,
      documentoNome: positionRequirementForm.documentoNome.trim(),
      descricao: positionRequirementForm.descricao.trim() || undefined,
      obrigatorio: positionRequirementForm.obrigatorio,
      validadeMeses: positionRequirementForm.validadeMeses ? Number(positionRequirementForm.validadeMeses) : undefined,
      legalRequirementId:
        positionRequirementForm.legalRequirementId !== "none"
          ? Number(positionRequirementForm.legalRequirementId)
          : undefined,
      ordem: Number(positionRequirementForm.ordem || "0"),
    };

    if (editingRequirementId) {
      updatePositionRequirementMutation.mutate({ id: editingRequirementId, ...payload });
      return;
    }

    createPositionRequirementMutation.mutate({ positionId: selectedCargoId, ...payload });
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
            <div className="max-w-5xl space-y-4">
            <Card className="max-w-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Atualizações cadastrais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  As alterações feitas nesta visão são enviadas para aprovação da SmartDocPlan antes de atualizar o cadastro oficial.
                </p>
                {companyUpdateRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma solicitação registrada até o momento.</p>
                ) : (
                  <div className="space-y-2">
                    {companyUpdateRequests.slice(0, 3).map((item) => (
                      <div key={item.id} className="rounded-lg border border-border px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">Solicitação #{item.id}</p>
                          <Badge variant="outline">{item.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("pt-BR")}
                        </p>
                        {item.motivo && <p className="mt-1 text-xs text-muted-foreground">{item.motivo}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                      {updateEmpresaMutation.isPending ? "Enviando..." : "Enviar para aprovação"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <CompanyDocumentsManager
                  companyId={companyId}
                  canEdit={canEdit}
                  title="Documentos da empresa"
                  description="Anexe e acompanhe Cartão CNPJ, Contrato Social, PCMSO, PGR, LTCAT e CNO opcional com alerta de validade."
                />
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          <TabsContent value="cargos" className="mt-4">
            <div className="max-w-5xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Funções da Empresa</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Cadastre as funções auxiliares usadas nos fluxos e colaboradores.
                  </p>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={openNewCargoModal} className="bg-primary text-primary-foreground hover:bg-primary/90">
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
                  <Card
                    key={cargo.id}
                    className={`cursor-pointer border transition-colors ${
                      cargo.id === selectedCargoId ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => setSelectedCargoId(cargo.id)}
                  >
                    <CardContent className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{cargo.nome}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {cargo.cbo && <span>CBO: {cargo.cbo}</span>}
                            {cargo.descricao && <span>{cargo.descricao}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditCargoModal(cargo);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {cargo.id === selectedCargoId && (
                            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                              Selecionada
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {cargos.find((cargo) => cargo.id === selectedCargoId)?.nome ?? "Requisitos por função"}
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Selecione uma função acima e vincule treinamentos, exames e itens psicossociais por processo.
                      </p>
                    </div>
                    {canEdit && selectedCargoId && (
                      <Button size="sm" onClick={openNewRequirementModal} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="mr-1.5 h-4 w-4" />
                        Novo requisito
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!selectedCargoId ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                      Selecione uma função para configurar seus requisitos.
                    </div>
                  ) : requisitosCargo.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhum requisito vinculado a esta função.
                    </div>
                  ) : (
                    requisitosCargo.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="space-y-3 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{item.documentoNome}</p>
                                <Badge variant="outline">{requirementCategoryLabel[item.categoria] ?? item.categoria}</Badge>
                                <Badge variant="outline">{requirementProcessLabel[item.tipoSolicitacao] ?? item.tipoSolicitacao}</Badge>
                                <Badge variant={item.obrigatorio ? "default" : "outline"}>
                                  {item.obrigatorio ? "Obrigatório" : "Opcional"}
                                </Badge>
                              </div>
                              {item.descricao && (
                                <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{item.descricao}</p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                {item.validadeMeses ? <span>Validade: {item.validadeMeses} meses</span> : null}
                                {item.norma ? <span>{item.norma}</span> : null}
                                {item.requisitoLegal ? <span>{item.requisitoLegal}</span> : null}
                              </div>
                            </div>

                            {canEdit && (
                              <div className="flex shrink-0 items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRequirementModal(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (window.confirm("Deseja inativar este requisito da função?")) {
                                      deletePositionRequirementMutation.mutate({ id: item.id });
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
                    ))
                  )}
                </CardContent>
              </Card>
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
                  <Button size="sm" onClick={openNewLocalModal} className="bg-primary text-primary-foreground hover:bg-primary/90">
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
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{local.nome}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {local.cnos && <span>CNOS: {local.cnos}</span>}
                            {local.cidade && <span>{local.cidade}{local.estado ? `/${local.estado}` : ""}</span>}
                            {local.endereco && <span>{local.endereco}</span>}
                          </div>
                        </div>
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLocalModal(local)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
            <DialogTitle>{editingCargoId ? "Editar Função" : "Nova Função"}</DialogTitle>
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
              onClick={() => {
                const payload = {
                  nome: novoCargo.nome.trim(),
                  cbo: novoCargo.cbo.trim() || undefined,
                  descricao: novoCargo.descricao.trim() || undefined,
                };

                if (editingCargoId) {
                  updateCargoMutation.mutate({
                    id: editingCargoId,
                    ...payload,
                  });
                  return;
                }

                createCargoMutation.mutate({
                  companyId,
                  ...payload,
                });
              }}
              disabled={!novoCargo.nome.trim() || createCargoMutation.isPending || updateCargoMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createCargoMutation.isPending || updateCargoMutation.isPending
                ? "Salvando..."
                : editingCargoId
                  ? "Salvar função"
                  : "Criar função"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={localModal} onOpenChange={setLocalModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingLocalId ? "Editar Frente / Local" : "Novo Local de Trabalho"}</DialogTitle>
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
              onClick={() => {
                const payload = {
                  nome: novoLocal.nome.trim(),
                  cnos: novoLocal.cnos.trim() || undefined,
                  endereco: novoLocal.endereco.trim() || undefined,
                  cidade: novoLocal.cidade.trim() || undefined,
                  estado: novoLocal.estado.trim().toUpperCase() || undefined,
                };

                if (editingLocalId) {
                  updateLocalMutation.mutate({
                    id: editingLocalId,
                    ...payload,
                  });
                  return;
                }

                createLocalMutation.mutate({
                  companyId,
                  ...payload,
                });
              }}
              disabled={!novoLocal.nome.trim() || createLocalMutation.isPending || updateLocalMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createLocalMutation.isPending || updateLocalMutation.isPending
                ? "Salvando..."
                : editingLocalId
                  ? "Salvar frente / local"
                  : "Criar local"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={requirementModal}
        onOpenChange={(open) => {
          setRequirementModal(open);
          if (!open) {
            setEditingRequirementId(null);
            setPositionRequirementForm(emptyPositionRequirementForm);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingRequirementId ? "Editar requisito da função" : "Novo requisito da função"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={positionRequirementForm.categoria}
                  onChange={(event) =>
                    setPositionRequirementForm((current) => ({
                      ...current,
                      categoria: event.target.value as PositionRequirementForm["categoria"],
                    }))
                  }
                >
                  {Object.entries(requirementCategoryLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Processo *</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={positionRequirementForm.tipoSolicitacao}
                  onChange={(event) =>
                    setPositionRequirementForm((current) => ({
                      ...current,
                      tipoSolicitacao: event.target.value as PositionRequirementForm["tipoSolicitacao"],
                    }))
                  }
                >
                  {Object.entries(requirementProcessLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nome do requisito *</Label>
              <Input
                value={positionRequirementForm.documentoNome}
                onChange={(event) =>
                  setPositionRequirementForm((current) => ({ ...current, documentoNome: event.target.value }))
                }
                placeholder="Ex: ASO admissional, treinamento NR-35, avaliação psicossocial"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Requisito legal relacionado</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={positionRequirementForm.legalRequirementId}
                  onChange={(event) =>
                    setPositionRequirementForm((current) => ({ ...current, legalRequirementId: event.target.value }))
                  }
                >
                  <option value="none">Nenhum</option>
                  {matrizLegal.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.norma} • {item.documentoExigido}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Validade</Label>
                  <Input
                    type="number"
                    value={positionRequirementForm.validadeMeses}
                    onChange={(event) =>
                      setPositionRequirementForm((current) => ({ ...current, validadeMeses: event.target.value }))
                    }
                    placeholder="Meses"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={positionRequirementForm.ordem}
                    onChange={(event) =>
                      setPositionRequirementForm((current) => ({ ...current, ordem: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={positionRequirementForm.obrigatorio}
                  onChange={(event) =>
                    setPositionRequirementForm((current) => ({ ...current, obrigatorio: event.target.checked }))
                  }
                />
                Item obrigatório para esta função
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                Quando obrigatório, ele já aparece com destaque na abertura da solicitação e na avaliação posterior.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                rows={5}
                className="min-h-32 resize-y"
                value={positionRequirementForm.descricao}
                onChange={(event) =>
                  setPositionRequirementForm((current) => ({ ...current, descricao: event.target.value }))
                }
                placeholder="Explique a aplicação, o momento do processo, exceções ou observações do requisito."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequirementModal(false)}>Cancelar</Button>
            <Button
              onClick={handleSavePositionRequirement}
              disabled={
                !positionRequirementForm.documentoNome.trim() ||
                createPositionRequirementMutation.isPending ||
                updatePositionRequirementMutation.isPending
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createPositionRequirementMutation.isPending || updatePositionRequirementMutation.isPending
                ? "Salvando..."
                : editingRequirementId
                  ? "Salvar alterações"
                  : "Adicionar requisito"}
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
