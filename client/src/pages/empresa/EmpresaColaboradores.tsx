import { useEffect, useMemo, useState } from "react";
import { RELEASE_LABELS, type EmployeeRelease } from "@shared/compliance";
import { RELEASE_COLORS } from "@/components/DossieChecklist";
import { Link, useSearch } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPLOYEE_SECTION_LABELS, type EmployeeSection } from "@shared/employeeSections";
import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, FolderOpen, Plus, Search, UserCheck, UserMinus, Users, UserX } from "lucide-react";
import { toast } from "sonner";
import { canManageCompanyData } from "@shared/permissions";
import {
  formatCpf,
  formatDateOnlyBr,
  formatPhone,
  getBirthDateMax,
  hasFullName,
  isAtLeastYearsOld,
  isValidCpf,
  isValidPhone,
} from "@shared/formValidation";

const statusColors: Record<string, string> = {
  ativo: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  afastado: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  desligado: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const statusIcons: Record<string, React.ElementType> = {
  ativo: UserCheck,
  afastado: UserMinus,
  desligado: UserX,
};

const PAGE_SIZE = 12;
const SECOES: EmployeeSection[] = ["ativos", "efetivacao", "desligados"];

type SectionFilters = { search: string; status: string; liberacao: string; position: string; worksite: string; page: number };
const emptyFilters: SectionFilters = { search: "", status: "todos", liberacao: "todos", position: "todos", worksite: "todos", page: 1 };

const emptyForm = {
  nome: "",
  cpf: "",
  email: "",
  telefone: "",
  dataAdmissao: "",
  dataNascimento: "",
  positionId: "",
  worksiteId: "",
};

export default function EmpresaColaboradores() {
  const { user, effectiveCompanyId } = useAuth();
  const companyId = effectiveCompanyId ?? 0;
  const canCreate = canManageCompanyData(user?.role ?? null);
  const maxBirthDate = getBirthDateMax(12);

  // Cada aba guarda os próprios filtros e página ("duas telas em uma").
  const searchParams = new URLSearchParams(useSearch());
  const abaInicial = searchParams.get("aba");
  const [aba, setAba] = useState<EmployeeSection>(SECOES.includes(abaInicial as EmployeeSection) ? (abaInicial as EmployeeSection) : "ativos");
  const [filtros, setFiltros] = useState<Record<EmployeeSection, SectionFilters>>({
    ativos: emptyFilters,
    efetivacao: emptyFilters,
    desligados: emptyFilters,
  });
  const atual = filtros[aba];
  const setFiltro = (patch: Partial<SectionFilters>) =>
    setFiltros((current) => ({ ...current, [aba]: { ...current[aba], page: 1, ...patch } }));
  const [buscaDebounced, setBuscaDebounced] = useState(atual.search);
  useEffect(() => {
    const timer = setTimeout(() => setBuscaDebounced(atual.search), 300);
    return () => clearTimeout(timer);
  }, [atual.search]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const mudarAba = (secao: EmployeeSection, patch?: Partial<SectionFilters>) => {
    setAba(secao);
    if (patch) setFiltros((current) => ({ ...current, [secao]: { ...current[secao], page: 1, ...patch } }));
    // Mantém a aba na URL para voltar a ela ao recarregar ou compartilhar o link.
    const params = new URLSearchParams(window.location.search);
    params.set("aba", secao);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  };

  const utils = trpc.useUtils();
  const { data: pagina, isLoading } = trpc.employees.listPaged.useQuery(
    {
      companyId,
      secao: aba,
      page: atual.page,
      pageSize: PAGE_SIZE,
      search: buscaDebounced.trim() || undefined,
      status: aba === "ativos" && atual.status !== "todos" ? (atual.status as "ativo" | "afastado") : undefined,
      liberacao: aba === "efetivacao" && atual.liberacao !== "todos" ? (atual.liberacao as "aguardando_documentacao" | "em_analise") : undefined,
      positionId: atual.position !== "todos" ? Number(atual.position) : undefined,
      worksiteId: atual.worksite !== "todos" ? Number(atual.worksite) : undefined,
    },
    { enabled: companyId > 0, placeholderData: (previous) => previous }
  );
  const colaboradores = pagina?.rows ?? [];
  const total = pagina?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const { data: stats } = trpc.employees.stats.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: cargos = [] } = trpc.positions.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: obras = [] } = trpc.worksites.list.useQuery({ companyId }, { enabled: companyId > 0 });

  const cargoMap = useMemo(() => new Map(cargos.map((cargo) => [cargo.id, cargo.nome])), [cargos]);
  const obraMap = useMemo(() => new Map(obras.map((obra) => [obra.id, obra.nome])), [obras]);

  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador cadastrado com sucesso!");
      setShowModal(false);
      setForm(emptyForm);
      utils.employees.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const fullNameValid = !form.nome.trim() || hasFullName(form.nome);
  const birthDateValid = !form.dataNascimento || isAtLeastYearsOld(form.dataNascimento, 12);
  const canSubmitCreate =
    hasFullName(form.nome) &&
    !!form.cpf.trim() &&
    (!form.telefone.trim() || isValidPhone(form.telefone)) &&
    birthDateValid &&
    !createMutation.isPending;

  const handleCreate = () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome completo.");
      return;
    }

    if (!hasFullName(form.nome)) {
      toast.error("Informe nome e sobrenome do colaborador.");
      return;
    }

    if (!isValidCpf(form.cpf)) {
      toast.error("Informe um CPF válido.");
      return;
    }

    if (form.telefone.trim() && !isValidPhone(form.telefone)) {
      toast.error("Informe um telefone válido com DDD.");
      return;
    }

    if (form.dataNascimento && !isAtLeastYearsOld(form.dataNascimento, 12)) {
      toast.error("A pessoa deve ter pelo menos 12 anos completos.");
      return;
    }

    createMutation.mutate({
      companyId,
      nome: form.nome.trim(),
      cpf: form.cpf,
      email: form.email.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      dataNascimento: form.dataNascimento || undefined,
      dataAdmissao: form.dataAdmissao || undefined,
      positionId: form.positionId ? Number(form.positionId) : undefined,
      worksiteId: form.worksiteId ? Number(form.worksiteId) : undefined,
    });
  };

  return (
    <CompanyLayout title="Colaboradores">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Colaboradores</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie os colaboradores da sua empresa com CPF e data de nascimento validados.
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setShowModal(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Novo Colaborador
            </Button>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {([
              ["liberado", stats.liberados, "Liberados"],
              ["em_analise", stats.emAnalise, "Em análise"],
              ["aguardando_documentacao", stats.aguardandoDocumentacao, "Aguardando documentação"],
              ["sem_requisitos", stats.semRequisitos, "Sem requisitos definidos"],
            ] as const).map(([key, value, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  key === "em_analise" || key === "aguardando_documentacao"
                    ? mudarAba("efetivacao", { liberacao: key })
                    : mudarAba("ativos")
                }
                className="rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
              >
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </button>
            ))}
          </div>
        )}

        <Tabs value={aba} onValueChange={(value) => mudarAba(value as EmployeeSection)}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start sm:w-auto">
            {SECOES.map((secao) => (
              <TabsTrigger key={secao} value={secao}>
                {EMPLOYEE_SECTION_LABELS[secao]}
                {pagina ? ` (${pagina.contagens[secao]})` : ""}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="-mt-3 text-sm text-muted-foreground">
          {aba === "ativos" && "Colaboradores liberados (e de cargos sem documentos exigidos), inclusive afastados."}
          {aba === "efetivacao" && "Colaboradores com documentação pendente ou em análise pela equipe SmartDocPlan para efetivação."}
          {aba === "desligados" && "Colaboradores desligados, mantidos para consulta e histórico."}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, telefone ou CPF..."
              value={atual.search}
              onChange={(event) => setFiltro({ search: event.target.value })}
              className="pl-9"
              aria-label="Buscar colaborador"
            />
          </div>

          {aba === "ativos" && (
            <Select value={atual.status} onValueChange={(status) => setFiltro({ status })}>
              <SelectTrigger className="w-40" aria-label="Filtrar por situação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as situações</SelectItem>
                <SelectItem value="ativo">Em atividade</SelectItem>
                <SelectItem value="afastado">Afastados</SelectItem>
              </SelectContent>
            </Select>
          )}

          {aba === "efetivacao" && (
            <Select value={atual.liberacao} onValueChange={(liberacao) => setFiltro({ liberacao })}>
              <SelectTrigger className="w-56" aria-label="Filtrar por etapa">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as etapas</SelectItem>
                <SelectItem value="aguardando_documentacao">{RELEASE_LABELS.aguardando_documentacao}</SelectItem>
                <SelectItem value="em_analise">{RELEASE_LABELS.em_analise}</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={atual.position} onValueChange={(position) => setFiltro({ position })}>
            <SelectTrigger className="w-52" aria-label="Filtrar por função">
              <SelectValue placeholder="Todas as funções" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as funções</SelectItem>
              {cargos.map((cargo) => (
                <SelectItem key={cargo.id} value={String(cargo.id)}>
                  {cargo.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={atual.worksite} onValueChange={(worksite) => setFiltro({ worksite })}>
            <SelectTrigger className="w-52" aria-label="Filtrar por local">
              <SelectValue placeholder="Todos os locais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os locais</SelectItem>
              {obras.map((obra) => (
                <SelectItem key={obra.id} value={String(obra.id)}>
                  {obra.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading &&
            [...Array(6)].map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-lg bg-muted" />
            ))}

          {!isLoading && colaboradores.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">Nenhum colaborador encontrado</p>
              <p className="text-sm">
                {atual.search || atual.status !== "todos" || atual.liberacao !== "todos" || atual.position !== "todos" || atual.worksite !== "todos"
                  ? "Ajuste os filtros desta aba."
                  : aba === "ativos" && canCreate
                    ? 'Cadastre o primeiro colaborador clicando em "Novo Colaborador".'
                    : "Nenhum colaborador nesta aba."}
              </p>
            </div>
          )}

          {colaboradores.map((colaborador) => {
            const StatusIcon = statusIcons[colaborador.status] ?? UserCheck;

            return (
              <Card key={colaborador.id} className="border-border transition-colors hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-semibold text-primary">
                          {colaborador.nome
                            .split(" ")
                            .map((parte) => parte[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight text-foreground">{colaborador.nome}</p>
                        <p className="font-mono text-xs text-muted-foreground">{colaborador.cpf}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${statusColors[colaborador.status]}`}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {colaborador.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {colaborador.positionId ? (
                      <p>
                        Função:{" "}
                        <span className="text-foreground">
                          {cargoMap.get(colaborador.positionId) ?? "Não informada"}
                        </span>
                      </p>
                    ) : null}
                    {colaborador.worksiteId ? (
                      <p>
                        Frente / local:{" "}
                        <span className="text-foreground">
                          {obraMap.get(colaborador.worksiteId) ?? "Não informada"}
                        </span>
                      </p>
                    ) : null}
                    {colaborador.dataAdmissao && (
                      <p>
                        Admissão:{" "}
                        <span className="text-foreground">
                          {formatDateOnlyBr(colaborador.dataAdmissao)}
                        </span>
                      </p>
                    )}

                    <div className="pt-1">
                      <Badge variant="outline" className={`text-xs ${RELEASE_COLORS[colaborador.liberacao as EmployeeRelease] ?? ""}`}>
                        {RELEASE_LABELS[colaborador.liberacao as EmployeeRelease] ?? colaborador.liberacao}
                      </Badge>
                    </div>
                    {colaborador.scoreConformidade !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${
                              (colaborador.scoreConformidade ?? 0) >= 80
                                ? "bg-green-500"
                                : (colaborador.scoreConformidade ?? 0) >= 50
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${colaborador.scoreConformidade ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {colaborador.scoreConformidade}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                      <Link href={`/empresa/colaboradores/${colaborador.id}`}>
                        <FolderOpen className="mr-1 h-3 w-3" />
                        Dossiê
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              {total} colaborador(es) · página {atual.page} de {totalPages}
            </span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={atual.page <= 1} onClick={() => setFiltro({ page: atual.page - 1, search: atual.search })}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={atual.page >= totalPages} onClick={() => setFiltro({ page: atual.page + 1, search: atual.search })}>
                  Próxima
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={showModal && canCreate}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setForm(emptyForm);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Colaborador</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={form.nome}
                  onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                  placeholder="Ex: João da Silva"
                  maxLength={255}
                  aria-invalid={!fullNameValid}
                />
                {!fullNameValid && <p className="text-xs text-destructive">Informe nome e sobrenome do colaborador.</p>}
              </div>

              <div className="space-y-1.5">
                <Label>CPF *</Label>
                <Input
                  value={form.cpf}
                  onChange={(event) => setForm((current) => ({ ...current, cpf: formatCpf(event.target.value) }))}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={form.dataNascimento}
                  max={maxBirthDate}
                  onChange={(event) => setForm((current) => ({ ...current, dataNascimento: event.target.value }))}
                  aria-invalid={!birthDateValid}
                />
                {!birthDateValid && <p className="text-xs text-destructive">A pessoa deve ter pelo menos 12 anos completos.</p>}
              </div>

              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="joao@empresa.com"
                  maxLength={320}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(event) => setForm((current) => ({ ...current, telefone: formatPhone(event.target.value) }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Data de Admissão</Label>
                <Input
                  type="date"
                  value={form.dataAdmissao}
                  onChange={(event) => setForm((current) => ({ ...current, dataAdmissao: event.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Select value={form.positionId} onValueChange={(value) => setForm((current) => ({ ...current, positionId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cargos.map((cargo) => (
                      <SelectItem key={cargo.id} value={String(cargo.id)}>
                        {cargo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Obra / Local</Label>
                <Select value={form.worksiteId} onValueChange={(value) => setForm((current) => ({ ...current, worksiteId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar obra" />
                  </SelectTrigger>
                  <SelectContent>
                    {obras.map((obra) => (
                      <SelectItem key={obra.id} value={String(obra.id)}>
                        {obra.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              O nome deve conter nome e sobrenome. A data de nascimento aceita somente pessoas com 12 anos completos ou mais.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canSubmitCreate}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CompanyLayout>
  );
}
