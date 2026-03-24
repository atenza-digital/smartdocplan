import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Plus, Search, Building2 } from "lucide-react";
import { toast } from "sonner";

const nrColors: Record<string, string> = {
  NR10: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  NR12: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  NR20: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  NR33: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  NR35: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

export default function AdminMatrizLegal() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [form, setForm] = useState({ norma: "", requisito: "", documentoExigido: "", validadeMeses: "", descricao: "" });

  const { data: empresas = [] } = trpc.companies.list.useQuery();

  const { data: requisitos = [], isLoading, refetch } = trpc.legalRequirements.list.useQuery(
    { companyId: selectedCompanyId ?? 0 },
    { enabled: !!selectedCompanyId }
  );

  const createMutation = trpc.legalRequirements.create.useMutation({
    onSuccess: () => {
      toast.success("Requisito cadastrado!");
      setShowModal(false);
      refetch();
      setForm({ norma: "", requisito: "", documentoExigido: "", validadeMeses: "", descricao: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = requisitos.filter((r) =>
    r.norma.toLowerCase().includes(search.toLowerCase()) ||
    r.requisito.toLowerCase().includes(search.toLowerCase()) ||
    r.documentoExigido.toLowerCase().includes(search.toLowerCase())
  );

  const selectedEmpresa = empresas.find(e => e.id === selectedCompanyId);

  return (
    <AdminLayout title="Matriz Legal">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Matriz de Requisitos Legais</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie as NRs e requisitos legais por empresa.
            </p>
          </div>
          <Button
            onClick={() => setShowModal(true)}
            disabled={!selectedCompanyId}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Requisito
          </Button>
        </div>

        {/* Seletor de empresa */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 max-w-sm">
                <Select
                  value={selectedCompanyId?.toString() ?? ""}
                  onValueChange={(v) => setSelectedCompanyId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id.toString()}>
                        {e.nomeFantasia || e.razaoSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedEmpresa && (
                <Badge variant="outline" className="text-primary border-primary/30">
                  {selectedEmpresa.nomeFantasia || selectedEmpresa.razaoSocial}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedCompanyId ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium">Selecione uma empresa acima</p>
              <p className="text-muted-foreground text-sm mt-1">para visualizar e gerenciar os requisitos legais.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar requisito..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground font-medium">Nenhum requisito cadastrado</p>
                  <p className="text-muted-foreground text-sm mt-1">Clique em "Novo Requisito" para adicionar.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filtered.map((r) => (
                  <Card key={r.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-xs font-semibold ${nrColors[r.norma] ?? "bg-primary/10 text-primary border-primary/20"}`}
                          >
                            {r.norma}
                          </Badge>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm">{r.requisito}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Documento: <span className="font-medium">{r.documentoExigido}</span>
                              {r.validadeMeses && ` · Validade: ${r.validadeMeses} meses`}
                            </p>
                            {r.descricao && (
                              <p className="text-xs text-muted-foreground mt-1">{r.descricao}</p>
                            )}
                          </div>
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

      {/* Modal de novo requisito */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Requisito Legal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Norma Regulamentadora *</Label>
              <Input value={form.norma} onChange={(e) => setForm({ ...form, norma: e.target.value })} placeholder="Ex: NR10, NR35, NR33..." />
            </div>
            <div className="space-y-1.5">
              <Label>Requisito *</Label>
              <Input value={form.requisito} onChange={(e) => setForm({ ...form, requisito: e.target.value })} placeholder="Ex: Trabalho em altura" />
            </div>
            <div className="space-y-1.5">
              <Label>Documento Exigido *</Label>
              <Input value={form.documentoExigido} onChange={(e) => setForm({ ...form, documentoExigido: e.target.value })} placeholder="Ex: Certificado NR35" />
            </div>
            <div className="space-y-1.5">
              <Label>Validade (meses)</Label>
              <Input type="number" value={form.validadeMeses} onChange={(e) => setForm({ ...form, validadeMeses: e.target.value })} placeholder="Ex: 24" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição detalhada do requisito..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({
                companyId: selectedCompanyId!,
                norma: form.norma,
                requisito: form.requisito,
                documentoExigido: form.documentoExigido,
                validadeMeses: form.validadeMeses ? parseInt(form.validadeMeses) : undefined,
                descricao: form.descricao || undefined,
              })}
              disabled={!form.norma || !form.requisito || !form.documentoExigido || createMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {createMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
