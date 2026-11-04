import { useMemo, useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Edit, Mail, Phone, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AddressFields } from "@/components/AddressFields";
import { fileToBase64 } from "@/lib/files";
import { emptyAddress, type AddressValue } from "@shared/address";
import {
  formatCnpj,
  formatPhone,
  isValidCnpj,
  isValidPhone,
  normalizeTextSearch,
} from "@shared/formValidation";

const statusColors: Record<string, string> = {
  ativo: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  inativo: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  suspenso: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

type CompanyForm = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  status: "ativo" | "inativo" | "suspenso";
} & AddressValue;

const emptyForm: CompanyForm = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  email: "",
  telefone: "",
  status: "ativo",
  ...emptyAddress,
};

export default function AdminEmpresas() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { data: empresas = [], refetch } = trpc.companies.list.useQuery();

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setLogoFile(null);
  };

  const logoMutation = trpc.companies.updateLogo.useMutation();

  const createMutation = trpc.companies.create.useMutation({
    onSuccess: async (result) => {
      // A logo só pode ser enviada depois que a empresa existe.
      let logoOk = true;
      if (logoFile && result.id) {
        try {
          await logoMutation.mutateAsync({ companyId: result.id, fileBase64: await fileToBase64(logoFile) });
        } catch (error) {
          logoOk = false;
          toast.error(`Empresa cadastrada, mas a logo não foi enviada: ${error instanceof Error ? error.message : "tente de novo na ficha da empresa."}`);
        }
      }
      if (logoOk) toast.success("Empresa cadastrada com sucesso!");
      setShowModal(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const escolherLogo = (file: File | null) => {
    if (!file) return setLogoFile(null);
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Envie a logo em PNG ou JPG.");
      return setLogoFile(null);
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A logo deve ter no máximo 2 MB.");
      return setLogoFile(null);
    }
    setLogoFile(file);
  };

  const updateMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast.success("Empresa atualizada com sucesso!");
      setShowModal(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const normalizedSearch = normalizeTextSearch(search);
    const digitSearch = search.replace(/\D/g, "");

    return empresas.filter((empresa) => {
      const matchesStatus = statusFilter === "todos" || empresa.status === statusFilter;
      if (!matchesStatus) return false;

      if (!normalizedSearch) return true;

      const searchableText = normalizeTextSearch(
        [empresa.razaoSocial, empresa.nomeFantasia ?? "", empresa.email ?? ""].join(" ")
      );
      const cnpjDigits = (empresa.cnpj ?? "").replace(/\D/g, "");
      const phoneDigits = (empresa.telefone ?? "").replace(/\D/g, "");

      return (
        searchableText.includes(normalizedSearch) ||
        (!!digitSearch && (cnpjDigits.includes(digitSearch) || phoneDigits.includes(digitSearch)))
      );
    });
  }, [empresas, search, statusFilter]);

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (empresa: (typeof empresas)[number]) => {
    setEditingId(empresa.id);
    setForm({
      razaoSocial: empresa.razaoSocial ?? "",
      nomeFantasia: empresa.nomeFantasia ?? "",
      cnpj: empresa.cnpj ?? "",
      email: empresa.email ?? "",
      telefone: empresa.telefone ?? "",
      status: empresa.status,
      cep: empresa.cep ?? "",
      endereco: empresa.endereco ?? "",
      numero: empresa.numero ?? "",
      complemento: empresa.complemento ?? "",
      bairro: empresa.bairro ?? "",
      cidade: empresa.cidade ?? "",
      estado: empresa.estado ?? "",
    });
    setShowModal(true);
  };

  const validateForm = () => {
    if (!form.razaoSocial.trim()) {
      return "Informe a razão social.";
    }

    if (form.cnpj.trim() && !isValidCnpj(form.cnpj)) {
      return "Informe um CNPJ válido.";
    }

    if (form.telefone.trim() && !isValidPhone(form.telefone)) {
      return "Informe um telefone válido com DDD.";
    }

    return null;
  };

  const handleSave = () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    const payload = {
      razaoSocial: form.razaoSocial.trim(),
      nomeFantasia: form.nomeFantasia.trim() || undefined,
      cnpj: form.cnpj.trim() || undefined,
      email: form.email.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      status: form.status,
      cep: form.cep,
      endereco: form.endereco,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.estado,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout title="Empresas">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Gestão de Empresas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre, edite e filtre as empresas clientes da plataforma.
            </p>
          </div>
          <Button onClick={openCreateModal} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Nova Empresa
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-72 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por razão social, fantasia, e-mail, CNPJ ou telefone..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Ativas e inativas</SelectItem>
              <SelectItem value="ativo">Somente ativas</SelectItem>
              <SelectItem value="inativo">Somente inativas</SelectItem>
              <SelectItem value="suspenso">Somente suspensas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground">
              <Building2 className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="font-medium">Nenhuma empresa encontrada</p>
              <p className="text-sm">Ajuste os filtros ou cadastre uma nova empresa.</p>
            </div>
          )}

          {filtered.map((empresa) => (
            <Card key={empresa.id} className="border-border transition-colors hover:border-primary/30">
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight text-foreground">{empresa.razaoSocial}</p>
                      {empresa.nomeFantasia && (
                        <p className="text-xs text-muted-foreground">{empresa.nomeFantasia}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs ${statusColors[empresa.status]}`}>
                    {empresa.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {empresa.cnpj && <p className="font-mono">CNPJ: {empresa.cnpj}</p>}
                  {empresa.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      <span>{empresa.email}</span>
                    </div>
                  )}
                  {empresa.telefone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      <span>{empresa.telefone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                    <Link href={`/admin/empresas/${empresa.id}`}>Ver detalhes</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="px-3" onClick={() => openEditModal(empresa)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Empresa" : "Cadastrar Nova Empresa"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Razão Social *</Label>
              <Input
                value={form.razaoSocial}
                onChange={(event) => setForm((current) => ({ ...current, razaoSocial: event.target.value }))}
                placeholder="Ex: Empresa ABC Ltda"
                maxLength={255}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Nome Fantasia</Label>
              <Input
                value={form.nomeFantasia}
                onChange={(event) => setForm((current) => ({ ...current, nomeFantasia: event.target.value }))}
                placeholder="Ex: ABC Construções"
                maxLength={255}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input
                  value={form.cnpj}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      cnpj: formatCnpj(event.target.value),
                    }))
                  }
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      telefone: formatPhone(event.target.value),
                    }))
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="contato@empresa.com.br"
                maxLength={320}
              />
            </div>

            <AddressFields idPrefix="admin-empresa" value={form} onChange={(address) => setForm((current) => ({ ...current, ...address }))} />

            {!editingId && (
              <div className="space-y-1.5">
                <Label htmlFor="empresa-logo">Logo (opcional)</Label>
                <Input id="empresa-logo" type="file" accept="image/png,image/jpeg" onChange={(event) => escolherLogo(event.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">PNG ou JPG de até 2 MB, de preferência com fundo transparente. Aparece no topo da área da empresa e nos relatórios.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as CompanyForm["status"] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.razaoSocial.trim() || isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
