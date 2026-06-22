import { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Building2, Edit, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { normalizeTextSearch } from "@shared/formValidation";

const nrColors: Record<string, string> = {
  NR10: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  NR12: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  NR20: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  NR33: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  NR35: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

type LegalForm = {
  norma: string;
  requisito: string;
  documentoExigido: string;
  validadeMeses: string;
  descricao: string;
};

const emptyForm: LegalForm = {
  norma: "",
  requisito: "",
  documentoExigido: "",
  validadeMeses: "",
  descricao: "",
};

export default function AdminMatrizLegal() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LegalForm>(emptyForm);

  const { data: empresas = [] } = trpc.companies.list.useQuery();
  const { data: requisitos = [], isLoading, refetch } = trpc.legalRequirements.list.useQuery(
    { companyId: selectedCompanyId ?? 0 },
    { enabled: !!selectedCompanyId }
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const createMutation = trpc.legalRequirements.create.useMutation({
    onSuccess: () => {
      toast.success("Requisito cadastrado com sucesso!");
      setShowModal(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.legalRequirements.update.useMutation({
    onSuccess: () => {
      toast.success("Requisito atualizado com sucesso!");
      setShowModal(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.legalRequirements.delete.useMutation({
    onSuccess: () => {
      toast.success("Requisito removido.");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const normalizedSearch = normalizeTextSearch(search);
    if (!normalizedSearch) return requisitos;

    return requisitos.filter((requisito) =>
      normalizeTextSearch(
        [requisito.norma, requisito.requisito, requisito.documentoExigido, requisito.descricao ?? ""].join(" ")
      ).includes(normalizedSearch)
    );
  }, [requisitos, search]);

  const selectedEmpresa = empresas.find((empresa) => empresa.id === selectedCompanyId);

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (requisito: (typeof requisitos)[number]) => {
    setEditingId(requisito.id);
    setForm({
      norma: requisito.norma,
      requisito: requisito.requisito,
      documentoExigido: requisito.documentoExigido,
      validadeMeses: requisito.validadeMeses ? String(requisito.validadeMeses) : "",
      descricao: requisito.descricao ?? "",
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!selectedCompanyId) {
      toast.error("Selecione uma empresa primeiro.");
      return;
    }

    if (!form.norma.trim() || !form.requisito.trim() || !form.documentoExigido.trim()) {
      toast.error("Preencha norma, requisito e documento exigido.");
      return;
    }

    const payload = {
      norma: form.norma.trim(),
      requisito: form.requisito.trim(),
      documentoExigido: form.documentoExigido.trim(),
      validadeMeses: form.validadeMeses ? Number(form.validadeMeses) : undefined,
      descricao: form.descricao.trim() || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
      return;
    }

    createMutation.mutate({ companyId: selectedCompanyId, ...payload });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout title="Matriz Legal">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Matriz de Requisitos Legais</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie as NRs e requisitos legais por empresa, com edição e histórico de manutenção.
            </p>
          </div>
          <Button
            onClick={openCreateModal}
            disabled={!selectedCompanyId}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Requisito
          </Button>
        </div>

        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Building2 className="h-5 w-5 shrink-0 text-primary" />
              <div className="max-w-sm flex-1">
                <Select
                  value={selectedCompanyId?.toString() ?? ""}
                  onValueChange={(value) => setSelectedCompanyId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id.toString()}>
                        {empresa.nomeFantasia || empresa.razaoSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedEmpresa && (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {selectedEmpresa.nomeFantasia || selectedEmpresa.razaoSocial}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedCompanyId ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">Selecione uma empresa acima</p>
              <p className="mt-1 text-sm text-muted-foreground">
                para visualizar, editar e manter a matriz legal.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar requisito, NR ou documento..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">Nenhum requisito encontrado</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cadastre um requisito ou ajuste sua busca.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filtered.map((requisito) => (
                  <Card key={requisito.id} className="transition-shadow hover:shadow-sm">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs font-semibold ${nrColors[requisito.norma] ?? "border-primary/20 bg-primary/10 text-primary"}`}
                            >
                              {requisito.norma}
                            </Badge>
                            <p className="text-sm font-medium text-foreground">{requisito.requisito}</p>
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Documento: <span className="font-medium">{requisito.documentoExigido}</span>
                            {requisito.validadeMeses ? ` • Validade: ${requisito.validadeMeses} meses` : ""}
                          </p>

                          {requisito.descricao && (
                            <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                              {requisito.descricao}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(requisito)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (window.confirm("Deseja inativar este requisito legal?")) {
                                deleteMutation.mutate({ id: requisito.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Requisito Legal" : "Novo Requisito Legal"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Norma Regulamentadora *</Label>
              <Input
                value={form.norma}
                onChange={(event) => setForm((current) => ({ ...current, norma: event.target.value }))}
                placeholder="Ex: NR35"
                maxLength={50}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Requisito *</Label>
              <Input
                value={form.requisito}
                onChange={(event) => setForm((current) => ({ ...current, requisito: event.target.value }))}
                placeholder="Ex: Trabalho em altura"
                maxLength={255}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Documento Exigido *</Label>
              <Input
                value={form.documentoExigido}
                onChange={(event) => setForm((current) => ({ ...current, documentoExigido: event.target.value }))}
                placeholder="Ex: Certificado NR35"
                maxLength={255}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Validade (meses)</Label>
              <Input
                type="number"
                min={0}
                value={form.validadeMeses}
                onChange={(event) => setForm((current) => ({ ...current, validadeMeses: event.target.value }))}
                placeholder="Ex: 24"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                placeholder="Descreva o contexto, exceções e observações deste requisito..."
                rows={5}
                className="min-h-32 resize-y"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.norma.trim() || !form.requisito.trim() || !form.documentoExigido.trim() || isSaving}
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
