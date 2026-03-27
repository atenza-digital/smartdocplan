import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, Users, Settings, Info, Lock, Bell, Database, Globe } from "lucide-react";
import { toast } from "sonner";

export default function AdminConfiguracoes() {
  const { user } = useLocalAuth();
  const isAdmin = user?.role === "platform_admin";

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  const roleLabel: Record<string, string> = {
    platform_admin: "Administrador da Plataforma",
    platform_analyst: "Analista de RH",
    platform_auditor: "Auditor",
  };

  const handleSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (novaSenha.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      if (res.ok) {
        toast.success("Senha alterada com sucesso!");
        setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Erro ao alterar senha.");
      }
    } catch {
      toast.error("Erro de comunicação com o servidor.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AdminLayout title="Configurações">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configurações da Plataforma</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as configurações do sistema SmartDocPlan.
          </p>
        </div>

        {/* Meu Perfil */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Meu Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Nome</p>
                <p className="font-medium text-sm">{user?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">E-mail</p>
                <p className="font-medium text-sm">{user?.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Perfil de acesso</p>
                <Badge variant="outline" className="text-xs">
                  {roleLabel[user?.role ?? ""] ?? user?.role}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Autenticação</p>
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                  Login via e-mail e senha
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alterar Senha */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> Alterar Senha
            </CardTitle>
            <CardDescription className="text-xs">
              Recomendamos usar uma senha forte com letras, números e símbolos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSenha} className="space-y-4 max-w-sm">
              <div className="space-y-1.5">
                <Label htmlFor="senhaAtual" className="text-xs">Senha atual</Label>
                <Input id="senhaAtual" type="password" value={senhaAtual}
                  onChange={e => setSenhaAtual(e.target.value)} required className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="novaSenha" className="text-xs">Nova senha</Label>
                <Input id="novaSenha" type="password" value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)} required minLength={8} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmar" className="text-xs">Confirmar nova senha</Label>
                <Input id="confirmar" type="password" value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)} required className="h-9 text-sm" />
              </div>
              <Button type="submit" size="sm" disabled={salvando} className="bg-primary hover:bg-primary/90">
                {salvando ? "Salvando..." : "Alterar Senha"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Informações da Plataforma */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> Sobre a Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Sistema</p>
                <p className="font-semibold">SmartDocPlan</p>
                <p className="text-xs text-muted-foreground">Gestão Documental de SST</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Versão</p>
                <p className="font-semibold">1.0.0</p>
                <p className="text-xs text-muted-foreground">Produção</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Banco de Dados</p>
                <p className="font-semibold">MySQL 8.0</p>
                <p className="text-xs text-green-600">● Conectado</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Conformidade</p>
                <p className="font-semibold">LGPD</p>
                <p className="text-xs text-muted-foreground">Lei nº 13.709/2018</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissões por Perfil */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Permissões por Perfil
              </CardTitle>
              <CardDescription className="text-xs">
                Visão geral das permissões de cada perfil na plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { role: "Administrador", perms: ["Acesso total", "Criar/editar usuários", "Configurações", "Auditoria completa"] },
                  { role: "Analista RH", perms: ["Ver empresas", "Gerenciar solicitações", "Gerenciar chamados", "Ver auditoria"] },
                  { role: "Auditor", perms: ["Ver empresas (somente leitura)", "Ver solicitações", "Ver chamados", "Ver auditoria"] },
                  { role: "Admin Empresa", perms: ["Dashboard própria empresa", "Colaboradores", "Solicitações", "Chamados"] },
                  { role: "RH Empresa", perms: ["Colaboradores", "Solicitações", "Documentos"] },
                  { role: "Gestor", perms: ["Ver colaboradores", "Ver solicitações"] },
                  { role: "Consulta", perms: ["Somente visualização"] },
                ].map(p => (
                  <div key={p.role} className="flex flex-wrap items-start gap-2 py-2 border-b border-border last:border-0">
                    <span className="text-xs font-semibold w-28 shrink-0 pt-0.5">{p.role}</span>
                    <div className="flex flex-wrap gap-1">
                      {p.perms.map(perm => (
                        <Badge key={perm} variant="secondary" className="text-xs px-2 py-0.5">{perm}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
