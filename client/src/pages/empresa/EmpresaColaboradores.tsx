import { useState } from "react";
import CompanyLayout from "@/components/CompanyLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Users, FolderOpen, UserCheck, UserMinus, UserX } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { canManageCompanyData } from "@shared/permissions";

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

export default function EmpresaColaboradores() {
  const { user } = useAuth();
  const companyId = user?.companyId ?? 0;
  const canCreate = canManageCompanyData(user?.role ?? null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    nome: "", cpf: "", email: "", telefone: "",
    dataAdmissao: "", dataNascimento: "",
    positionId: "", worksiteId: "",
  });

  const { data: colaboradores = [], isLoading, refetch } = trpc.employees.list.useQuery(
    { companyId },
    { enabled: companyId > 0 }
  );
  const { data: cargos = [] } = trpc.positions.list.useQuery({ companyId }, { enabled: companyId > 0 });
  const { data: obras = [] } = trpc.worksites.list.useQuery({ companyId }, { enabled: companyId > 0 });

  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador cadastrado!");
      setShowModal(false);
      refetch();
      setForm({ nome: "", cpf: "", email: "", telefone: "", dataAdmissao: "", dataNascimento: "", positionId: "", worksiteId: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = colaboradores.filter((c) => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search);
    const matchStatus = filterStatus === "todos" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <CompanyLayout title="Colaboradores">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Colaboradores</h2>
            <p className="text-muted-foreground text-sm mt-1">Gerencie os colaboradores da sua empresa.</p>
          </div>
          {canCreate && (
            <Button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Novo Colaborador
            </Button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
        </div>

        {/* Lista */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading && [...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum colaborador encontrado</p>
              <p className="text-sm">
                {canCreate ? 'Cadastre o primeiro colaborador clicando em "Novo Colaborador"' : "Nenhum colaborador disponivel para consulta."}
              </p>
            </div>
          )}
          {filtered.map((col) => {
            const StatusIcon = statusIcons[col.status] ?? UserCheck;
            return (
              <Card key={col.id} className="border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">
                          {col.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm leading-tight">{col.nome}</p>
                        <p className="text-xs text-muted-foreground font-mono">{col.cpf}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${statusColors[col.status]}`}>
                      {col.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {col.dataAdmissao && (
                      <p>Admissão: <span className="text-foreground">{new Date(col.dataAdmissao).toLocaleDateString("pt-BR")}</span></p>
                    )}
                    {col.scoreConformidade !== null && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${(col.scoreConformidade ?? 0) >= 80 ? "bg-green-500" : (col.scoreConformidade ?? 0) >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${col.scoreConformidade ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground">{col.scoreConformidade}%</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                      <Link href={`/empresa/colaboradores/${col.id}`}>
                        <FolderOpen className="w-3 h-3 mr-1" />
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

      {/* Modal Novo Colaborador */}
      <Dialog open={showModal && canCreate} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Colaborador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome Completo *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: João da Silva" />
              </div>
              <div className="space-y-1.5">
                <Label>CPF *</Label>
                <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={form.dataNascimento} onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="joao@empresa.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Admissão</Label>
                <Input type="date" value={form.dataAdmissao} onChange={(e) => setForm({ ...form, dataAdmissao: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Select value={form.positionId} onValueChange={(v) => setForm({ ...form, positionId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar cargo" /></SelectTrigger>
                  <SelectContent>
                    {cargos.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Obra / Local</Label>
                <Select value={form.worksiteId} onValueChange={(v) => setForm({ ...form, worksiteId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar obra" /></SelectTrigger>
                  <SelectContent>
                    {obras.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({
                companyId,
                nome: form.nome,
                cpf: form.cpf,
                email: form.email || undefined,
                telefone: form.telefone || undefined,
                dataNascimento: form.dataNascimento || undefined,
                dataAdmissao: form.dataAdmissao || undefined,
                positionId: form.positionId ? parseInt(form.positionId) : undefined,
                worksiteId: form.worksiteId ? parseInt(form.worksiteId) : undefined,
              })}
              disabled={!form.nome || !form.cpf || createMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {createMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CompanyLayout>
  );
}
