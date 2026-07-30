import { useMemo, useState } from "react";
import { Link } from "wouter";
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
import { FolderOpen, Plus, Search, UserCheck, UserMinus, Users, UserX } from "lucide-react";
import { toast } from "sonner";
import { canManageCompanyData } from "@shared/permissions";
import {
  formatCpf,
  formatPhone,
  getBirthDateMax,
  hasFullName,
  isAtLeastYearsOld,
  isValidCpf,
  isValidPhone,
  normalizeTextSearch,
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

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterPosition, setFilterPosition] = useState("todos");
  const [filterWorksite, setFilterWorksite] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: colaboradores = [], isLoading, refetch } = trpc.employees.list.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );
  const { data: cargos = [] } = trpc.positions.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: obras = [] } = trpc.worksites.list.useQuery({ companyId }, { enabled: companyId > 0 });

  const cargoMap = useMemo(() => new Map(cargos.map((cargo) => [cargo.id, cargo.nome])), [cargos]);
  const obraMap = useMemo(() => new Map(obras.map((obra) => [obra.id, obra.nome])), [obras]);

  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador cadastrado com sucesso!");
      setShowModal(false);
      setForm(emptyForm);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const normalizedSearch = normalizeTextSearch(search);
    const digitSearch = search.replace(/\D/g, "");

    return colaboradores.filter((colaborador) => {
      const matchesStatus = filterStatus === "todos" || colaborador.status === filterStatus;
      if (!matchesStatus) return false;

      const matchesPosition = filterPosition === "todos" || String(colaborador.positionId ?? "") === filterPosition;
      if (!matchesPosition) return false;

      const matchesWorksite = filterWorksite === "todos" || String(colaborador.worksiteId ?? "") === filterWorksite;
      if (!matchesWorksite) return false;

      if (!normalizedSearch) return true;

      const searchableText = normalizeTextSearch(
        [colaborador.nome, colaborador.email ?? "", colaborador.telefone ?? "", colaborador.cpf].join(" ")
      );
      const cpfDigits = colaborador.cpf.replace(/\D/g, "");

      return searchableText.includes(normalizedSearch) || (!!digitSearch && cpfDigits.includes(digitSearch));
    });
  }, [colaboradores, filterPosition, filterStatus, filterWorksite, search]);

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

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, telefone ou CPF..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="afastado">Afastados</SelectItem>
              <SelectItem value="desligado">Desligados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPosition} onValueChange={setFilterPosition}>
            <SelectTrigger className="w-52">
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

          <Select value={filterWorksite} onValueChange={setFilterWorksite}>
            <SelectTrigger className="w-52">
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

          {!isLoading && filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">Nenhum colaborador encontrado</p>
              <p className="text-sm">
                {canCreate
                  ? 'Cadastre o primeiro colaborador clicando em "Novo Colaborador".'
                  : "Nenhum colaborador disponível para consulta."}
              </p>
            </div>
          )}

          {filtered.map((colaborador) => {
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
                          {new Date(colaborador.dataAdmissao).toLocaleDateString("pt-BR")}
                        </span>
                      </p>
                    )}

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
      </div>

      <Dialog
        open={showModal && canCreate}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setForm(emptyForm);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Colaborador</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
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
