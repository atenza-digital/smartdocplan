import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import AdminLayout from "@/components/AdminLayout";
import CompanyLayout from "@/components/CompanyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { canManageCompanyData, isPlatformUser } from "@shared/permissions";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

type Kind = "contrato" | "unidade" | "obra";
const labels: Record<Kind, string> = {
  contrato: "Contratos",
  unidade: "Unidades",
  obra: "Obras",
};
const empty = {
  nome: "",
  codigo: "",
  observacoes: "",
  status: "ativo" as "ativo" | "inativo",
};
const selectClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-auto";

export default function OrganizationRegisters() {
  const { user, effectiveCompanyId } = useLocalAuth();
  const [location] = useLocation();
  const adminView = location.startsWith("/admin");
  const Layout = adminView ? AdminLayout : CompanyLayout;
  const [selectedCompany, setSelectedCompany] = useState(0);
  const companyId = isPlatformUser(user?.role)
    ? selectedCompany || effectiveCompanyId || 0
    : effectiveCompanyId || 0;
  const [kind, setKind] = useState<Kind>("contrato");
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const canEdit = canManageCompanyData(user?.role);
  const companies = trpc.companies.list.useQuery();
  const records = trpc.organization.list.useQuery(
    { kind, companyId, includeInactive },
    { enabled: companyId > 0 }
  );
  const success = () => {
    setOpen(false);
    void records.refetch();
    toast.success("Cadastro salvo.");
  };
  const create = trpc.organization.create.useMutation({
    onSuccess: success,
    onError: e => toast.error(e.message),
  });
  const update = trpc.organization.update.useMutation({
    onSuccess: success,
    onError: e => toast.error(e.message),
  });
  const filtered = (records.data ?? []).filter(r =>
    `${r.nome} ${r.codigo ?? ""}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR"))
  );
  return (
    <Layout title="Estrutura da empresa">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Estrutura da empresa</h1>
          <p className="mt-2 text-muted-foreground">
            Cadastre contratos, unidades e obras separadamente e selecione-os
            nas solicitações. As frentes existentes são preservadas.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {isPlatformUser(user?.role) && (
            <select
              aria-label="Empresa"
              className={selectClass}
              value={companyId}
              onChange={e => {
                setSelectedCompany(Number(e.target.value));
                setOpen(false);
              }}
            >
              <option value={0}>Selecione a empresa</option>
              {companies.data?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.razaoSocial}
                </option>
              ))}
            </select>
          )}
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Tipo de cadastro"
          >
            {(Object.keys(labels) as Kind[]).map(k => (
              <Button
                key={k}
                variant={kind === k ? "default" : "outline"}
                onClick={() => {
                  setKind(k);
                  setSearch("");
                  setOpen(false);
                }}
              >
                {labels[k]}
              </Button>
            ))}
          </div>
          {canEdit && (
            <Button
              disabled={!companyId}
              onClick={() => {
                setEditingId(null);
                setForm(empty);
                setOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="flex-1 min-w-48"
            aria-label="Buscar por nome ou código"
            placeholder="Buscar por nome ou código"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={e => setIncludeInactive(e.target.checked)}
            />
            Mostrar também inativos
          </label>
        </div>
        {!companyId ? (
          <p>Selecione uma empresa para consultar os cadastros.</p>
        ) : records.isLoading ? (
          <p role="status">Carregando cadastros...</p>
        ) : records.error ? (
          <p role="alert" className="text-destructive">
            Não foi possível carregar os cadastros.{" "}
            <Button variant="link" onClick={() => records.refetch()}>
              Tentar novamente
            </Button>
          </p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum cadastro encontrado em {labels[kind].toLowerCase()}.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(r => (
              <Card key={r.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold break-words min-w-0">
                      {r.nome}
                    </h2>
                    <Badge variant="outline">
                      {r.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {r.codigo && <p className="text-sm">Código: {r.codigo}</p>}
                  {r.observacoes && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {r.observacoes}
                    </p>
                  )}
                  {canEdit && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingId(r.id);
                        setForm({
                          nome: r.nome,
                          codigo: r.codigo ?? "",
                          observacoes: r.observacoes ?? "",
                          status: r.status === "ativo" ? "ativo" : "inativo",
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Funções, matriz básica por função e frentes continuam em{" "}
          <Link
            className="text-primary underline"
            href={
              adminView && companyId
                ? `/admin/empresas/${companyId}`
                : "/empresa/configuracoes"
            }
          >
            cadastros da empresa
          </Link>
          . Não é necessário duplicar os registros existentes.
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar" : "Adicionar"} {kind}
            </DialogTitle>
          </DialogHeader>
          <form
            className="min-w-0 space-y-4"
            onSubmit={e => {
              e.preventDefault();
              if (
                editingId &&
                form.status === "inativo" &&
                !window.confirm(
                  "Inativar este cadastro? Ele permanecerá no histórico, mas não poderá ser selecionado em novas solicitações."
                )
              )
                return;
              if (editingId) update.mutate({ ...form, kind, id: editingId });
              else create.mutate({ ...form, kind, companyId });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="org-name">Nome</Label>
              <Input
                id="org-name"
                required
                minLength={2}
                maxLength={255}
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-code">
                Código de identificação (opcional)
              </Label>
              <Input
                id="org-code"
                maxLength={60}
                value={form.codigo}
                onChange={e => setForm({ ...form, codigo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-notes">Observações</Label>
              <Textarea
                id="org-notes"
                rows={5}
                maxLength={20000}
                value={form.observacoes}
                onChange={e =>
                  setForm({ ...form, observacoes: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-status">Situação</Label>
              <select
                id="org-status"
                className={selectClass}
                value={form.status}
                onChange={e =>
                  setForm({
                    ...form,
                    status: e.target.value as "ativo" | "inativo",
                  })
                }
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending
                  ? "Salvando..."
                  : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
