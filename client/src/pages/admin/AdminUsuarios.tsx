import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Search, UserPlus, MoreVertical, UserCog, KeyRound, UserCheck, UserX, Building2 } from "lucide-react";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  platform_admin: "Admin Plataforma",
  platform_analyst: "Analista RH",
  platform_auditor: "Auditor",
  company_admin: "Admin Empresa",
  company_hr: "RH Empresa",
  company_manager: "Gestor",
  company_viewer: "Consulta",
};

const roleColors: Record<string, string> = {
  platform_admin: "bg-primary/10 text-primary border-primary/20",
  platform_analyst: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  platform_auditor: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  company_admin: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  company_hr: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  company_manager: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
  company_viewer: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

type ModalType = "create" | "editRole" | "resetPassword" | null;

export default function AdminUsuarios() {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form de criacao
  const [createForm, setCreateForm] = useState({
    name: "", email: "", password: "", role: "company_hr", companyId: "",
  });
  // Form de edicao de papel
  const [editRole, setEditRole] = useState({ role: "", companyId: "" });
  // Form de reset de senha
  const [newPassword, setNewPassword] = useState("");

  const { data: usuarios = [], isLoading, refetch } = trpc.users.list.useQuery();
  const { data: empresas = [] } = trpc.companies.list.useQuery();

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Usuario criado com sucesso!");
      setModal(null);
      setCreateForm({ name: "", email: "", password: "", role: "company_hr", companyId: "" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Papel atualizado!");
      setModal(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleAtivoMutation = trpc.users.toggleAtivo.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.ativo ? "Usuario ativado!" : "Usuario desativado!");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPasswordMutation = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso!");
      setModal(null);
      setNewPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = usuarios.filter((u) =>
    (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const getEmpresaNome = (companyId: number | null) => {
    if (!companyId) return null;
    const e = empresas.find(e => e.id === companyId);
    return e ? (e.nomeFantasia || e.razaoSocial) : `Empresa #${companyId}`;
  };

  const isPlatformRole = (role: string) =>
    ["platform_admin", "platform_analyst", "platform_auditor"].includes(role);

  return (
    <AdminLayout title="Usuarios">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Gestao de Usuarios</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Usuarios internos da plataforma e usuarios vinculados as empresas.
            </p>
          </div>
          <Button
            onClick={() => setModal("create")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Usuario
          </Button>
        </div>

        {/* Busca */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Secoes: Plataforma e Empresas */}
        {["platform", "company"].map((group) => {
          const groupUsers = filtered.filter((u) =>
            group === "platform" ? isPlatformRole(u.role) : !isPlatformRole(u.role)
          );
          if (groupUsers.length === 0) return null;

          return (
            <div key={group} className="space-y-3">
              <div className="flex items-center gap-2">
                {group === "platform" ? (
                  <><Users className="w-4 h-4 text-primary" /><h3 className="font-semibold text-foreground">Equipe Interna da Plataforma</h3></>
                ) : (
                  <><Building2 className="w-4 h-4 text-amber-500" /><h3 className="font-semibold text-foreground">Usuarios das Empresas</h3></>
                )}
                <Badge variant="outline" className="text-xs">{groupUsers.length}</Badge>
              </div>

              <div className="grid gap-2">
                {groupUsers.map((u) => (
                  <Card key={u.id} className={`hover:shadow-sm transition-shadow ${u.ativo === false ? "opacity-60" : ""}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary font-semibold text-sm">
                              {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {u.name ?? "(sem nome)"}
                              {u.ativo === false && (
                                <span className="ml-2 text-xs text-destructive font-normal">(inativo)</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            {u.companyId && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3" />
                                {getEmpresaNome(u.companyId)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={`text-xs hidden sm:flex ${roleColors[u.role] ?? ""}`}>
                            {roleLabels[u.role] ?? u.role}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-8 h-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedUser(u);
                                setEditRole({ role: u.role, companyId: u.companyId?.toString() ?? "" });
                                setModal("editRole");
                              }}>
                                <UserCog className="w-4 h-4 mr-2" />
                                Alterar Papel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedUser(u);
                                setModal("resetPassword");
                              }}>
                                <KeyRound className="w-4 h-4 mr-2" />
                                Redefinir Senha
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => toggleAtivoMutation.mutate({ userId: u.id, ativo: !u.ativo })}
                                className={u.ativo === false ? "text-green-600" : "text-destructive"}
                              >
                                {u.ativo === false ? (
                                  <><UserCheck className="w-4 h-4 mr-2" />Ativar Usuario</>
                                ) : (
                                  <><UserX className="w-4 h-4 mr-2" />Desativar Usuario</>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {!isLoading && filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhum usuario encontrado</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal: Criar usuario */}
      <Dialog open={modal === "create"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Nome do usuario" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Senha inicial *</Label>
              <Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Minimo 6 caracteres" />
            </div>
            <div className="space-y-1.5">
              <Label>Papel *</Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isPlatformRole(createForm.role) && (
              <div className="space-y-1.5">
                <Label>Empresa *</Label>
                <Select value={createForm.companyId} onValueChange={(v) => setCreateForm({ ...createForm, companyId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa..." /></SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id.toString()}>{e.nomeFantasia || e.razaoSocial}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({
                name: createForm.name,
                email: createForm.email,
                password: createForm.password,
                role: createForm.role as any,
                companyId: createForm.companyId ? parseInt(createForm.companyId) : undefined,
              })}
              disabled={!createForm.name || !createForm.email || !createForm.password || createMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {createMutation.isPending ? "Criando..." : "Criar Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar papel */}
      <Dialog open={modal === "editRole"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Papel — {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Novo Papel</Label>
              <Select value={editRole.role} onValueChange={(v) => setEditRole({ ...editRole, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isPlatformRole(editRole.role) && (
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Select value={editRole.companyId} onValueChange={(v) => setEditRole({ ...editRole, companyId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa..." /></SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id.toString()}>{e.nomeFantasia || e.razaoSocial}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Button
              onClick={() => updateRoleMutation.mutate({
                userId: selectedUser.id,
                role: editRole.role as any,
                companyId: editRole.companyId ? parseInt(editRole.companyId) : undefined,
              })}
              disabled={!editRole.role || updateRoleMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {updateRoleMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Reset de senha */}
      <Dialog open={modal === "resetPassword"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir Senha — {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Button
              onClick={() => resetPasswordMutation.mutate({ userId: selectedUser.id, newPassword })}
              disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {resetPasswordMutation.isPending ? "Redefinindo..." : "Redefinir Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
