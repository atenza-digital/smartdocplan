import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  Briefcase,
  Building2,
  Check,
  ClipboardCheck,
  FileCheck2,
  FilePlus2,
  MapPin,
  MoveRight,
  Paperclip,
  Plus,
  ShieldAlert,
  Trash2,
  Upload,
  UserRoundSearch,
} from "lucide-react";
import { toast } from "sonner";
import { canCreateRequests, canManageCompanyData } from "@shared/permissions";
import {
  formatCpf,
  getBirthDateMax,
  isAtLeastYearsOld,
  isValidCpf,
  normalizeCpf,
} from "@shared/formValidation";

const PROCESS_OPTIONS = [
  { key: "admissao", label: "Admissão", description: "Novo ingresso na empresa." },
  { key: "demissao", label: "Demissão", description: "Desligamento de colaborador ativo." },
  { key: "mudanca_funcao", label: "Mudança de função", description: "Troca de cargo, atividade ou local." },
  { key: "afastamento", label: "Afastamento", description: "Licenças, afastamentos e ocorrências." },
  { key: "atestado_medico", label: "Atestado médico", description: "Recebimento e tratamento de atestados." },
  { key: "outros", label: "Outros", description: "Demandas fora dos fluxos padrão." },
] as const;

const WORK_FORMAT_OPTIONS = [
  { key: "clt_presencial", label: "CLT presencial" },
  { key: "clt_remoto", label: "CLT remoto" },
  { key: "clt_intermitente", label: "CLT intermitente" },
  { key: "jovem_aprendiz", label: "Jovem aprendiz" },
  { key: "estagio", label: "Estágio" },
] as const;

const CONTRACT_TERM_OPTIONS = [
  { key: "prazo_indeterminado", label: "Prazo indeterminado" },
  { key: "prazo_determinado", label: "Prazo determinado" },
  { key: "experiencia", label: "Contrato de experiência" },
] as const;

type ProcessType = (typeof PROCESS_OPTIONS)[number]["key"];
type StepId = "company" | "process" | "person" | "hiring" | "requirements" | "review";
type PendingUpload = {
  id: string;
  templateId?: number;
  positionRequirementId?: number;
  nome: string;
  categoria: "pessoal" | "empresa" | "treinamento" | "exame_medico" | "psicossocial" | "outros";
  fileNome: string;
  fileMime: string;
  fileTamanho: number;
  fileBase64: string;
  numeroDocumento?: string;
  dataEmissao?: string;
  validade?: string;
};

const REQUEST_CATEGORY_LABELS: Record<string, string> = {
  pessoal: "Pessoal",
  empresa: "Empresa",
  treinamento: "Treinamento",
  exame_medico: "Exame Médico",
  psicossocial: "Psicossocial",
  outros: "Outros",
};

export default function EmpresaNovaSolicitacao() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const canCreate = canCreateRequests(user?.role ?? null);
  const canManageHelpers = canManageCompanyData(user?.role ?? null);
  const isPlatformAdmin = user?.role === "platform_admin";
  const listRoute = isPlatformAdmin ? "/admin/solicitacoes" : "/empresa/solicitacoes";
  const LayoutComponent = isPlatformAdmin ? AdminLayout : CompanyLayout;

  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.companyId ? String(user.companyId) : "");
  const [currentStep, setCurrentStep] = useState<StepId>(isPlatformAdmin ? "company" : "process");
  const [form, setForm] = useState({
    tipo: "admissao" as ProcessType,
    cpf: "",
    nome: "",
    positionId: "",
    worksiteId: "",
    dataNascimento: "",
    formatoTrabalho: "clt_presencial",
    tempoContrato: "prazo_indeterminado",
    prioridade: "media" as "baixa" | "media" | "alta" | "urgente",
    observacoes: "",
  });
  const [cargoModalOpen, setCargoModalOpen] = useState(false);
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const [novoCargo, setNovoCargo] = useState({ nome: "", cbo: "", descricao: "" });
  const [novoLocal, setNovoLocal] = useState({ nome: "", cnos: "", endereco: "", cidade: "", estado: "" });
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedUploadTarget, setSelectedUploadTarget] = useState<{
    templateId?: number;
    positionRequirementId?: number;
    nome: string;
    categoria: PendingUpload["categoria"];
  } | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ numeroDocumento: "", dataEmissao: "", validade: "" });

  useEffect(() => {
    if (!isPlatformAdmin && user?.companyId) {
      setSelectedCompanyId(String(user.companyId));
    }
  }, [isPlatformAdmin, user?.companyId]);

  const companyId = isPlatformAdmin ? Number(selectedCompanyId || 0) : user?.companyId ?? 0;
  const maxBirthDate = getBirthDateMax(12);

  const { data: companies = [] } = trpc.companies.list.useQuery(undefined, { enabled: isPlatformAdmin });
  const { data: company } = trpc.companies.get.useQuery({ id: companyId }, { enabled: companyId > 0 });
  const { data: employees = [] } = trpc.employees.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: positions = [] } = trpc.positions.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: worksites = [] } = trpc.worksites.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: legalRequirements = [] } = trpc.legalRequirements.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: positionRequirements = [] } = trpc.positionRequirements.listByContext.useQuery(
    { companyId, positionId: Number(form.positionId || 0), tipoSolicitacao: form.tipo },
    { enabled: companyId > 0 && Number(form.positionId) > 0 }
  );
  const { data: documentTemplates = [] } = trpc.documentTemplates.listByTipo.useQuery(
    { tipoSolicitacao: form.tipo },
    { enabled: !!form.tipo }
  );

  const matchedEmployee = useMemo(() => {
    const normalized = normalizeCpf(form.cpf);
    if (!normalized) return null;
    return employees.find((employee) => normalizeCpf(employee.cpf) === normalized) ?? null;
  }, [employees, form.cpf]);

  useEffect(() => {
    if (!matchedEmployee) return;

    setForm((current) => ({
      ...current,
      nome: current.nome || matchedEmployee.nome,
      positionId: current.positionId || (matchedEmployee.positionId ? String(matchedEmployee.positionId) : ""),
      worksiteId: current.worksiteId || (matchedEmployee.worksiteId ? String(matchedEmployee.worksiteId) : ""),
      dataNascimento:
        current.dataNascimento ||
        (matchedEmployee.dataNascimento ? new Date(matchedEmployee.dataNascimento).toISOString().slice(0, 10) : ""),
    }));
  }, [matchedEmployee]);

  const selectedProcess = PROCESS_OPTIONS.find((option) => option.key === form.tipo) ?? PROCESS_OPTIONS[0];
  const selectedPosition = positions.find((position) => position.id === Number(form.positionId));
  const selectedWorksite = worksites.find((worksite) => worksite.id === Number(form.worksiteId));
  const selectedFormat = WORK_FORMAT_OPTIONS.find((option) => option.key === form.formatoTrabalho);
  const selectedContract = CONTRACT_TERM_OPTIONS.find((option) => option.key === form.tempoContrato);
  const pendingUploadsByTemplate = pendingUploads.reduce((acc, upload) => {
    if (upload.templateId) {
      acc[upload.templateId] = [...(acc[upload.templateId] || []), upload];
    }
    return acc;
  }, {} as Record<number, PendingUpload[]>);
  const pendingUploadsByPositionRequirement = pendingUploads.reduce((acc, upload) => {
    if (upload.positionRequirementId) {
      acc[upload.positionRequirementId] = [...(acc[upload.positionRequirementId] || []), upload];
    }
    return acc;
  }, {} as Record<number, PendingUpload[]>);
  const pendingGeneralUploads = pendingUploads.filter((upload) => !upload.templateId && !upload.positionRequirementId);

  const visibleSteps = useMemo(
    () =>
      [
        isPlatformAdmin
          ? { id: "company" as const, label: "Empresa", title: "Escolha a empresa" }
          : null,
        { id: "process" as const, label: "Processo", title: "Escolha o processo" },
        { id: "person" as const, label: "Pessoa", title: "Identificação da pessoa" },
        form.tipo === "admissao"
          ? { id: "hiring" as const, label: "Contratação", title: "Formato e prazo do contrato" }
          : null,
        { id: "requirements" as const, label: "Requisitos", title: "Checklist Docs e Matriz Legal" },
        { id: "review" as const, label: "Revisão", title: "Conferência e abertura" },
      ].filter(Boolean) as Array<{ id: StepId; label: string; title: string }>,
    [form.tipo, isPlatformAdmin]
  );

  useEffect(() => {
    if (!visibleSteps.some((step) => step.id === currentStep)) {
      setCurrentStep(visibleSteps[0]?.id ?? "process");
    }
  }, [currentStep, visibleSteps]);

  const currentIndex = visibleSteps.findIndex((step) => step.id === currentStep);

  const createMutation = trpc.requests.create.useMutation({
    onError: (error) => toast.error(error.message),
  });
  const createCargoMutation = trpc.positions.create.useMutation({
    onSuccess: async () => {
      await utils.positions.list.invalidate({ companyId });
      toast.success("Função cadastrada com sucesso!");
      setCargoModalOpen(false);
      setNovoCargo({ nome: "", cbo: "", descricao: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  const createLocalMutation = trpc.worksites.create.useMutation({
    onSuccess: async () => {
      await utils.worksites.list.invalidate({ companyId });
      toast.success("Frente / local cadastrado com sucesso!");
      setLocalModalOpen(false);
      setNovoLocal({ nome: "", cnos: "", endereco: "", cidade: "", estado: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  const uploadRequestDocumentMutation = trpc.requestDocUploads.upload.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const openUploadModal = (target: {
    templateId?: number;
    positionRequirementId?: number;
    nome: string;
    categoria: PendingUpload["categoria"];
  }) => {
    setSelectedUploadTarget(target);
    setSelectedUploadFile(null);
    setUploadForm({ numeroDocumento: "", dataEmissao: "", validade: "" });
    setUploadModalOpen(true);
  };

  const handleQueueUpload = async () => {
    if (!selectedUploadTarget || !selectedUploadFile) {
      toast.error("Selecione um arquivo para anexar.");
      return;
    }

    if (selectedUploadFile.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. O limite é 10MB.");
      return;
    }

    try {
      const fileBase64 = await fileToBase64(selectedUploadFile);
      setPendingUploads((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          templateId: selectedUploadTarget.templateId,
          positionRequirementId: selectedUploadTarget.positionRequirementId,
          nome: selectedUploadTarget.nome,
          categoria: selectedUploadTarget.categoria,
          fileNome: selectedUploadFile.name,
          fileMime: selectedUploadFile.type || "application/octet-stream",
          fileTamanho: selectedUploadFile.size,
          fileBase64,
          numeroDocumento: uploadForm.numeroDocumento.trim() || undefined,
          dataEmissao: uploadForm.dataEmissao || undefined,
          validade: uploadForm.validade || undefined,
        },
      ]);
      setUploadModalOpen(false);
      setSelectedUploadTarget(null);
      setSelectedUploadFile(null);
      setUploadForm({ numeroDocumento: "", dataEmissao: "", validade: "" });
      toast.success("Arquivo preparado para ser enviado com a solicitação.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler o arquivo.");
    }
  };

  const removePendingUpload = (uploadId: string) => {
    if (!window.confirm("Deseja remover este arquivo da solicitação?")) {
      return;
    }
    setPendingUploads((current) => current.filter((upload) => upload.id !== uploadId));
  };

  const buildDescription = () => {
    const details = [
      `Processo: ${selectedProcess.label}`,
      `Empresa: ${company?.nomeFantasia || company?.razaoSocial || companyId || "-"}`,
      `CPF: ${form.cpf}`,
      `Nome: ${form.nome}`,
      `Cargo/Função: ${selectedPosition?.nome ?? "-"}`,
      `Frente/Local: ${selectedWorksite?.nome ?? "-"}`,
    ];

    if (form.tipo === "admissao") {
      details.push(`Formato de trabalho: ${selectedFormat?.label ?? "-"}`);
      details.push(`Tempo de contrato: ${selectedContract?.label ?? "-"}`);
    }

    if (form.dataNascimento) {
      details.push(`Data de nascimento: ${new Date(form.dataNascimento).toLocaleDateString("pt-BR")}`);
    }

    if (matchedEmployee) {
      details.push(`Colaborador vinculado: #${matchedEmployee.id}`);
    }

    details.push("");
    details.push(`Checklist Docs aplicável: ${documentTemplates.length} item(ns).`);
    if (documentTemplates.length) {
      details.push(`Itens previstos: ${documentTemplates.map((item) => item.nome).join(", ")}`);
    }
    details.push(`Requisitos da função aplicáveis: ${positionRequirements.length} item(ns).`);
    if (positionRequirements.length) {
      details.push(
        `Requisitos da função: ${positionRequirements
          .map((item) => `${item.documentoNome} (${REQUEST_CATEGORY_LABELS[item.categoria] ?? item.categoria})`)
          .join(", ")}`
      );
    }
    details.push(`Arquivos preparados nesta abertura: ${pendingUploads.length}.`);

    details.push(`Matriz Legal ativa da empresa: ${legalRequirements.length} requisito(s).`);
    if (legalRequirements.length) {
      details.push(
        `Normas relacionadas: ${legalRequirements
          .slice(0, 5)
          .map((item) => `${item.norma} - ${item.documentoExigido}`)
          .join("; ")}`
      );
    }

    if (form.observacoes.trim()) {
      details.push("");
      details.push("Observações:");
      details.push(form.observacoes.trim());
    }

    return details.join("\n");
  };

  const validateStep = (stepId: StepId) => {
    if (stepId === "company" && companyId <= 0) {
      return "Selecione a empresa.";
    }

    if (stepId === "person") {
      if (!form.cpf || !isValidCpf(form.cpf)) {
        return "Informe um CPF válido.";
      }

      if (!form.nome.trim()) {
        return "Informe o nome da pessoa.";
      }

      if (!form.positionId) {
        return "Selecione a função.";
      }

      if (form.dataNascimento && !isAtLeastYearsOld(form.dataNascimento, 12)) {
        return "A pessoa deve ter pelo menos 12 anos completos.";
      }

      if (form.tipo !== "admissao" && form.tipo !== "outros" && !matchedEmployee) {
        return "Para esse processo, use um CPF já cadastrado no banco.";
      }
    }

    return null;
  };

  const goToNextStep = () => {
    const error = validateStep(currentStep);
    if (error) {
      toast.error(error);
      return;
    }

    const nextStep = visibleSteps[currentIndex + 1];
    if (nextStep) {
      setCurrentStep(nextStep.id);
    }
  };

  const goToPreviousStep = () => {
    const previousStep = visibleSteps[currentIndex - 1];
    if (previousStep) {
      setCurrentStep(previousStep.id);
    }
  };

  const handleCreate = async () => {
    for (const step of visibleSteps) {
      const error = validateStep(step.id);
      if (error) {
        toast.error(error);
        setCurrentStep(step.id);
        return;
      }
    }

    if (!canCreate) {
      toast.error("Seu perfil não pode abrir solicitações.");
      return;
    }

    const titulo = `${selectedProcess.label} - ${form.nome}`.trim();

    try {
      const createdRequest = await createMutation.mutateAsync({
        companyId,
        employeeId: matchedEmployee?.id,
        positionId: form.positionId ? Number(form.positionId) : undefined,
        tipo: form.tipo,
        titulo,
        descricao: buildDescription(),
        prioridade: form.prioridade,
      });

      if (createdRequest.id && pendingUploads.length > 0) {
        for (const upload of pendingUploads) {
          await uploadRequestDocumentMutation.mutateAsync({
            requestId: createdRequest.id,
            templateId: upload.templateId,
            nome: upload.nome,
            categoria: upload.categoria,
            obrigatorio: false,
            numeroDocumento: upload.numeroDocumento,
            dataEmissao: upload.dataEmissao,
            validade: upload.validade,
            fileNome: upload.fileNome,
            fileMime: upload.fileMime,
            fileTamanho: upload.fileTamanho,
            fileBase64: upload.fileBase64,
          });
        }
      }

      toast.success("Solicitação criada com sucesso!");
      navigate(listRoute);
    } catch {
      // handled by mutations
    }
  };

  const handleCreateCargo = () => {
    if (companyId <= 0) {
      toast.error("Selecione a empresa antes de cadastrar uma função.");
      return;
    }

    if (!novoCargo.nome.trim()) {
      toast.error("Informe o nome da função.");
      return;
    }

    createCargoMutation.mutate({
      companyId,
      nome: novoCargo.nome.trim(),
      cbo: novoCargo.cbo.trim() || undefined,
      descricao: novoCargo.descricao.trim() || undefined,
    });
  };

  const handleCreateLocal = () => {
    if (companyId <= 0) {
      toast.error("Selecione a empresa antes de cadastrar uma frente / local.");
      return;
    }

    if (!novoLocal.nome.trim()) {
      toast.error("Informe o nome da frente / local.");
      return;
    }

    createLocalMutation.mutate({
      companyId,
      nome: novoLocal.nome.trim(),
      cnos: novoLocal.cnos.trim() || undefined,
      endereco: novoLocal.endereco.trim() || undefined,
      cidade: novoLocal.cidade.trim() || undefined,
      estado: novoLocal.estado.trim().toUpperCase() || undefined,
    });
  };

  if (!canCreate) {
    return (
      <LayoutComponent title="Nova solicitação">
        <Card className="max-w-2xl border-border">
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Seu perfil é somente de consulta</AlertTitle>
              <AlertDescription>
                Apenas administradores da plataforma, administradores da empresa e perfis de RH podem abrir solicitações.
              </AlertDescription>
            </Alert>
            <Button asChild variant="outline">
              <Link href={listRoute}>Voltar para solicitações</Link>
            </Button>
          </CardContent>
        </Card>
      </LayoutComponent>
    );
  }

  const renderCurrentStep = () => {
    if (currentStep === "company") {
      return (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Para qual empresa essa solicitação será vinculada?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.nomeFantasia || item.razaoSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertTitle>Administrador com escolha de empresa</AlertTitle>
              <AlertDescription>
                Como esse perfil pode operar em toda a plataforma, a empresa é definida manualmente antes da abertura do processo.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    if (currentStep === "process") {
      return (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5 text-primary" />
              Qual processo deseja iniciar?
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {PROCESS_OPTIONS.map((option) => {
              const isSelected = form.tipo === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                  }`}
                  onClick={() => setForm((current) => ({ ...current, tipo: option.key }))}
                >
                  <p className="font-semibold text-foreground">{option.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>
      );
    }

    if (currentStep === "person") {
      return (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRoundSearch className="h-5 w-5 text-primary" />
              Quem é a pessoa vinculada a este processo?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input
                  value={form.cpf}
                  onChange={(event) => setForm((current) => ({ ...current, cpf: formatCpf(event.target.value) }))}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={form.nome}
                  onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                  placeholder="Nome completo"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Label>Função</Label>
                  {canManageHelpers && companyId > 0 && (
                    <Button type="button" variant="ghost" size="sm" className="h-auto px-0 text-primary" onClick={() => setCargoModalOpen(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Cadastrar função
                    </Button>
                  )}
                </div>
                <Select
                  value={form.positionId}
                  onValueChange={(value) => setForm((current) => ({ ...current, positionId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((position) => (
                      <SelectItem key={position.id} value={String(position.id)}>
                        {position.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Esse campo vem do cadastro auxiliar de funções da empresa.
                </p>
                {positions.length === 0 && (
                  <Alert>
                    <Briefcase className="h-4 w-4" />
                    <AlertTitle>Nenhuma função cadastrada</AlertTitle>
                    <AlertDescription>
                      {canManageHelpers
                        ? "Cadastre a primeira função para liberar a escolha nesta etapa."
                        : "Peça para um administrador ou RH cadastrar as funções da empresa."}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Label>Frente / local</Label>
                  {canManageHelpers && companyId > 0 && (
                    <Button type="button" variant="ghost" size="sm" className="h-auto px-0 text-primary" onClick={() => setLocalModalOpen(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Cadastrar frente / local
                    </Button>
                  )}
                </div>
                <Select
                  value={form.worksiteId}
                  onValueChange={(value) => setForm((current) => ({ ...current, worksiteId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a frente" />
                  </SelectTrigger>
                  <SelectContent>
                    {worksites.map((worksite) => (
                      <SelectItem key={worksite.id} value={String(worksite.id)}>
                        {worksite.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Esse campo vem do cadastro auxiliar de frentes, locais ou obras da empresa.
                </p>
                {worksites.length === 0 && (
                  <Alert>
                    <MapPin className="h-4 w-4" />
                    <AlertTitle>Nenhuma frente / local cadastrado</AlertTitle>
                    <AlertDescription>
                      {canManageHelpers
                        ? "Cadastre a primeira frente ou local para disponibilizar a escolha neste processo."
                        : "Peça para um administrador ou RH cadastrar as frentes e locais da empresa."}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Data de nascimento</Label>
                <Input
                  type="date"
                  max={maxBirthDate}
                  value={form.dataNascimento}
                  onChange={(event) => setForm((current) => ({ ...current, dataNascimento: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  A pessoa precisa ter pelo menos 12 anos completos.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select
                  value={form.prioridade}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      prioridade: value as "baixa" | "media" | "alta" | "urgente",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {matchedEmployee ? (
              <Alert>
                <Briefcase className="h-4 w-4" />
                <AlertTitle>CPF encontrado na base</AlertTitle>
                <AlertDescription>
                  O colaborador será vinculado ao registro #{matchedEmployee.id}. Nome, cargo e frente continuam editáveis para conferência.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertTitle>CPF ainda não encontrado no banco</AlertTitle>
                <AlertDescription>
                  Para admissão e outros fluxos livres, você pode seguir com o cadastro manual. Para demissão, afastamento, atestado e mudança de função, use um CPF já cadastrado.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      );
    }

    if (currentStep === "hiring") {
      return (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MoveRight className="h-5 w-5 text-primary" />
              Como será a contratação?
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <Label>Formato de trabalho</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {WORK_FORMAT_OPTIONS.map((option) => {
                  const isSelected = form.formatoTrabalho === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                      onClick={() => setForm((current) => ({ ...current, formatoTrabalho: option.key }))}
                    >
                      <span className="text-sm font-medium text-foreground">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Tempo do contrato</Label>
              <div className="grid gap-3">
                {CONTRACT_TERM_OPTIONS.map((option) => {
                  const isSelected = form.tempoContrato === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                      onClick={() => setForm((current) => ({ ...current, tempoContrato: option.key }))}
                    >
                      <span className="text-sm font-medium text-foreground">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentStep === "requirements") {
      return (
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-primary" />
                Checklist Docs aplicável ao processo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <ClipboardCheck className="h-4 w-4" />
                <AlertTitle>Checklist puxado pelo tipo de solicitação</AlertTitle>
                <AlertDescription>
                  Os itens abaixo vêm do módulo Checklist Docs, mas o anexo pode ser feito agora pelo solicitante ou depois por quem vai avaliar.
                </AlertDescription>
              </Alert>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Itens do checklist</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{documentTemplates.length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Anexos preparados</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{pendingUploads.length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Processo</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{selectedProcess.label}</p>
                </div>
              </div>

              <div className="space-y-3">
                {documentTemplates.length === 0 ? (
                  <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Nenhum documento configurado</AlertTitle>
                    <AlertDescription>
                      Ainda não há checklist cadastrado para este tipo de processo. A solicitação será aberta, mas sem anexos guiados automaticamente.
                    </AlertDescription>
                  </Alert>
                ) : (
                  documentTemplates.map((template) => (
                    <div key={template.id} className="rounded-2xl border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{template.nome}</p>
                            <Badge variant="outline">{REQUEST_CATEGORY_LABELS[template.categoria as PendingUpload["categoria"]]}</Badge>
                          </div>
                          {template.descricao ? <p className="text-sm text-muted-foreground">{template.descricao}</p> : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openUploadModal({
                              templateId: template.id,
                              nome: template.nome,
                              categoria: template.categoria as PendingUpload["categoria"],
                            })
                          }
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Anexar arquivo
                        </Button>
                      </div>

                      {(pendingUploadsByTemplate[template.id] ?? []).length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {(pendingUploadsByTemplate[template.id] ?? []).map((upload) => (
                            <div
                              key={upload.id}
                              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-muted/20 p-3"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">{upload.fileNome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(upload.fileTamanho / 1024 / 1024).toFixed(2)} MB
                                  {upload.numeroDocumento ? ` • Nº ${upload.numeroDocumento}` : ""}
                                  {upload.validade ? ` • validade ${new Date(upload.validade).toLocaleDateString("pt-BR")}` : ""}
                                </p>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removePendingUpload(upload.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-muted-foreground">Nenhum arquivo preparado para este item ainda.</p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-2xl border-2 border-dashed border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">Documento complementar</p>
                    <p className="text-sm text-muted-foreground">
                      Use esta opção para anexar algo fora do checklist padrão.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openUploadModal({ nome: "Documento complementar", categoria: "outros" })}
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    Adicionar anexo
                  </Button>
                </div>

                {pendingGeneralUploads.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {pendingGeneralUploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-muted/20 p-3"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{upload.fileNome}</p>
                          <p className="text-xs text-muted-foreground">
                            {(upload.fileTamanho / 1024 / 1024).toFixed(2)} MB
                            {upload.numeroDocumento ? ` • Nº ${upload.numeroDocumento}` : ""}
                            {upload.validade ? ` • validade ${new Date(upload.validade).toLocaleDateString("pt-BR")}` : ""}
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removePendingUpload(upload.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Requisitos da função selecionada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Briefcase className="h-4 w-4" />
                <AlertTitle>Treinamentos, exames e psicossocial por função</AlertTitle>
                <AlertDescription>
                  Esses itens vêm do cadastro da função e ajudam a preparar admissões, demissões e mudanças de função com mais contexto operacional.
                </AlertDescription>
              </Alert>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Itens por função</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{positionRequirements.length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Obrigatórios</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {positionRequirements.filter((item) => item.obrigatorio).length}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Uploads preparados</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {Object.values(pendingUploadsByPositionRequirement).reduce((total, items) => total + items.length, 0)}
                  </p>
                </div>
              </div>

              {positionRequirements.length === 0 ? (
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Sem requisitos vinculados à função</AlertTitle>
                  <AlertDescription>
                    A função selecionada ainda não possui treinamentos, exames ou itens psicossociais configurados para este processo.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {positionRequirements.map((requirement) => (
                    <div key={requirement.id} className="rounded-2xl border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{requirement.documentoNome}</p>
                            <Badge variant="outline">
                              {REQUEST_CATEGORY_LABELS[requirement.categoria] ?? requirement.categoria}
                            </Badge>
                            <Badge variant={requirement.obrigatorio ? "default" : "outline"}>
                              {requirement.obrigatorio ? "Obrigatório" : "Opcional"}
                            </Badge>
                            <Badge variant="outline">{requirement.tipoSolicitacao}</Badge>
                          </div>
                          {requirement.descricao ? (
                            <p className="text-sm text-muted-foreground">{requirement.descricao}</p>
                          ) : null}
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {requirement.validadeMeses ? <span>Validade sugerida: {requirement.validadeMeses} meses</span> : null}
                            {requirement.norma ? <span>Base legal: {requirement.norma}</span> : null}
                            {requirement.requisitoLegal ? <span>{requirement.requisitoLegal}</span> : null}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openUploadModal({
                              positionRequirementId: requirement.id,
                              nome: requirement.documentoNome,
                              categoria: requirement.categoria as PendingUpload["categoria"],
                            })
                          }
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Anexar arquivo
                        </Button>
                      </div>

                      {(pendingUploadsByPositionRequirement[requirement.id] ?? []).length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {(pendingUploadsByPositionRequirement[requirement.id] ?? []).map((upload) => (
                            <div
                              key={upload.id}
                              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-muted/20 p-3"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">{upload.fileNome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(upload.fileTamanho / 1024 / 1024).toFixed(2)} MB
                                  {upload.numeroDocumento ? ` • Nº ${upload.numeroDocumento}` : ""}
                                  {upload.validade ? ` • validade ${new Date(upload.validade).toLocaleDateString("pt-BR")}` : ""}
                                </p>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removePendingUpload(upload.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-muted-foreground">Nenhum arquivo preparado para este item ainda.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Matriz Legal ativa da empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <BookOpen className="h-4 w-4" />
                <AlertTitle>Contexto legal trazido da empresa</AlertTitle>
                <AlertDescription>
                  A Matriz Legal continua trazendo o contexto da empresa, e a função selecionada agora também pode carregar treinamentos, exames e referências psicossociais no mesmo fluxo.
                </AlertDescription>
              </Alert>

              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Requisitos ativos</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{legalRequirements.length}</p>
              </div>

              <div className="space-y-3">
                {legalRequirements.length === 0 ? (
                  <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Matriz Legal vazia para esta empresa</AlertTitle>
                    <AlertDescription>
                      A empresa ainda não possui requisitos legais ativos cadastrados. O fluxo segue normalmente, mas sem referência normativa adicional nesta etapa.
                    </AlertDescription>
                  </Alert>
                ) : (
                  legalRequirements.map((requirement) => (
                    <div key={requirement.id} className="rounded-2xl border border-border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{requirement.norma}</Badge>
                        <p className="font-medium text-foreground">{requirement.documentoExigido}</p>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{requirement.requisito}</p>
                      {requirement.validadeMeses ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Validade de {requirement.validadeMeses} mês(es).
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Revise a abertura e registre observações finais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Empresa</p>
              <p className="mt-1 font-medium text-foreground">
                {company?.nomeFantasia || company?.razaoSocial || "Selecione a empresa"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Processo</p>
              <p className="mt-1 font-medium text-foreground">{selectedProcess.label}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações adicionais</Label>
            <Textarea
              value={form.observacoes}
              onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}
              placeholder="Descreva prazos, contexto, documentos já disponíveis ou qualquer instrução relevante para o time."
              rows={8}
              className="min-h-40 resize-y"
            />
          </div>

          <Alert>
            <Check className="h-4 w-4" />
            <AlertTitle>Fluxo alinhado com a abertura por etapas</AlertTitle>
            <AlertDescription>
              Primeiro definimos empresa e processo, depois CPF, nome e função. Em admissão, entram formato de trabalho e prazo do contrato. Antes de abrir, a tela já mostra o checklist documental e a matriz legal vinculados ao contexto.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  };

  return (
    <LayoutComponent title="Nova solicitação">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Nova solicitação de RH</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O fluxo foi reorganizado por etapas para ficar mais leve: processo, pessoa, contratação quando necessário, requisitos e revisão final.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={listRoute}>Voltar para lista</Link>
          </Button>
        </div>

        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              {visibleSteps.map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = index < currentIndex;

                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : isCompleted
                          ? "border-primary/30 bg-primary/5"
                          : "border-border hover:border-primary/30"
                    }`}
                    onClick={() => {
                      if (index <= currentIndex) {
                        setCurrentStep(step.id);
                      }
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                          isActive || isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                      </span>
                      <p className="text-sm font-semibold text-foreground">{step.label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.title}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            {renderCurrentStep()}

            <Card className="sticky bottom-0 z-10 border-border bg-background/95 shadow-lg backdrop-blur">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <Button variant="outline" onClick={goToPreviousStep} disabled={currentIndex === 0}>
                  Voltar etapa
                </Button>

                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="ghost">
                    <Link href={listRoute}>Cancelar</Link>
                  </Button>
                  {currentIndex < visibleSteps.length - 1 ? (
                    <Button onClick={goToNextStep}>Próxima etapa</Button>
                  ) : (
                    <Button onClick={handleCreate} disabled={createMutation.isPending || uploadRequestDocumentMutation.isPending}>
                      {createMutation.isPending || uploadRequestDocumentMutation.isPending ? "Criando..." : "Criar solicitação"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="xl:sticky xl:top-6 space-y-6">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Resumo da solicitação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Empresa</p>
                    <p className="font-medium text-foreground">
                      {company?.nomeFantasia || company?.razaoSocial || "Selecione a empresa"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Processo</p>
                    <p className="font-medium text-foreground">{selectedProcess.label}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Pessoa</p>
                    <p className="font-medium text-foreground">{form.nome || "-"}</p>
                    <p className="text-muted-foreground">{form.cpf || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Função e frente</p>
                    <p className="font-medium text-foreground">{selectedPosition?.nome ?? "-"}</p>
                    <p className="text-muted-foreground">{selectedWorksite?.nome ?? "Sem frente selecionada"}</p>
                  </div>
                  {form.tipo === "admissao" && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Vínculo</p>
                      <p className="font-medium text-foreground">{selectedFormat?.label ?? "-"}</p>
                      <p className="text-muted-foreground">{selectedContract?.label ?? "-"}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Requisitos considerados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Checklist Docs</p>
                    <p className="mt-1 font-medium text-foreground">
                      {documentTemplates.length} item(ns) para {selectedProcess.label.toLowerCase()}
                    </p>
                    <p className="text-muted-foreground">{pendingUploads.length} arquivo(s) preparado(s) nesta abertura.</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Matriz Legal</p>
                    <p className="mt-1 font-medium text-foreground">{legalRequirements.length} requisito(s) ativo(s)</p>
                    <p className="text-muted-foreground">
                      Referência da empresa selecionada para apoiar a abertura do processo.
                    </p>
                  </div>

                  <Alert>
                    <BookOpen className="h-4 w-4" />
                    <AlertTitle>Leitura honesta do fluxo atual</AlertTitle>
                    <AlertDescription>
                      O checklist documental já entra no wizard por tipo de processo. A Matriz Legal também aparece aqui, mas no modelo atual ela é considerada por empresa, não por cargo.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={uploadModalOpen}
        onOpenChange={(open) => {
          setUploadModalOpen(open);
          if (!open) {
            setSelectedUploadTarget(null);
            setSelectedUploadFile(null);
            setUploadForm({ numeroDocumento: "", dataEmissao: "", validade: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle>Anexar documento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Item do checklist</Label>
              <Input value={selectedUploadTarget?.nome ?? ""} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>Arquivo</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(event) => setSelectedUploadFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOC ou DOCX com até 10MB.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Número do documento</Label>
              <Input
                value={uploadForm.numeroDocumento}
                onChange={(event) => setUploadForm((current) => ({ ...current, numeroDocumento: event.target.value }))}
                placeholder="Ex.: 2026-001, ASO-4587, matrícula ou referência"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data de emissão</Label>
                <Input
                  type="date"
                  value={uploadForm.dataEmissao}
                  onChange={(event) => setUploadForm((current) => ({ ...current, dataEmissao: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Validade</Label>
                <Input
                  type="date"
                  value={uploadForm.validade}
                  onChange={(event) => setUploadForm((current) => ({ ...current, validade: event.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleQueueUpload}>Preparar anexo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cargoModalOpen} onOpenChange={setCargoModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar função</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome da função</Label>
              <Input value={novoCargo.nome} onChange={(event) => setNovoCargo((current) => ({ ...current, nome: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>CBO</Label>
              <Input value={novoCargo.cbo} onChange={(event) => setNovoCargo((current) => ({ ...current, cbo: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={novoCargo.descricao}
                onChange={(event) => setNovoCargo((current) => ({ ...current, descricao: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCargoModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCargo} disabled={createCargoMutation.isPending}>
              {createCargoMutation.isPending ? "Salvando..." : "Salvar função"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={localModalOpen} onOpenChange={setLocalModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar frente / local</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={novoLocal.nome} onChange={(event) => setNovoLocal((current) => ({ ...current, nome: event.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>CNOS</Label>
                <Input value={novoLocal.cnos} onChange={(event) => setNovoLocal((current) => ({ ...current, cnos: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Input maxLength={2} value={novoLocal.estado} onChange={(event) => setNovoLocal((current) => ({ ...current, estado: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={novoLocal.cidade} onChange={(event) => setNovoLocal((current) => ({ ...current, cidade: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input
                maxLength={255}
                placeholder="Rua, número, complemento"
                value={novoLocal.endereco}
                onChange={(event) => setNovoLocal((current) => ({ ...current, endereco: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocalModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLocal} disabled={createLocalMutation.isPending}>
              {createLocalMutation.isPending ? "Salvando..." : "Salvar frente / local"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutComponent>
  );
}
