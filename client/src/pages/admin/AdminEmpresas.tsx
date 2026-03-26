import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, Building2, Phone, Mail, Edit } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  ativo: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  inativo: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  suspenso: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

export default function AdminEmpresas() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    razaoSocial: "", nomeFantasia: "", cnpj: "", email: "", telefone: "", status: "ativo" as const,
  });

  const { data: empresas = [], refetch } = trpc.companies.list.useQuery();
  const createMutation = trpc.companies.create.useMutation({
    onSuccess: () => { toast.success("Empresa cadastrada com sucesso!"); setShowModal(false); refetch(); setForm({ razaoSocial: "", nomeFantasia: "", cnpj: "", email: "", telefone: "", status: "ativo" }); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = empresas.filter((e) =>
    e.razaoSocial.toLowerCase().includes(search.toLowerCase()) ||
    (e.nomeFantasia ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (e.cnpj ?? "").includes(search)
  );

  return (
    <AdminLayout title="Empresas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Gestão de Empresas</h2>
            <p className="text-muted-foreground text-sm mt-1">Cadastre e gerencie as empresas clientes da plataforma.</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Nova Empresa
          </Button>
        </div>

        {/* Busca */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por razão social, CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma empresa encontrada</p>
              <p className="text-sm">Cadastre a primeira empresa clicando em "Nova Empresa"</p>
            </div>
          )}
          {filtered.map((empresa) => (
            <Card key={empresa.id} className="border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm leading-tight">{empresa.razaoSocial}</p>
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
                  {empresa.cnpj && (
                    <p className="font-mono">CNPJ: {empresa.cnpj}</p>
                  )}
                  {empresa.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      <span>{empresa.email}</span>
                    </div>
                  )}
                  {empresa.telefone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      <span>{empresa.telefone}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                    <Link href={`/admin/empresas/${empresa.id}`}>Ver Detalhes</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal Nova Empresa */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Razão Social *</Label>
              <Input value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} placeholder="Ex: Empresa ABC Ltda" />
            </div>
            <div className="space-y-1.5">
              <Label>Nome Fantasia</Label>
              <Input value={form.nomeFantasia} onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })} placeholder="Ex: ABC Construções" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contato@empresa.com.br" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.razaoSocial || createMutation.isPending}
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
