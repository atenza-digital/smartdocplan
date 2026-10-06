import AdminLayout from "@/components/AdminLayout";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { DialogSizePreference } from "@/components/DialogSizePreference";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Info, Lock } from "lucide-react";

export default function AdminConfiguracoes() {
  const { user } = useLocalAuth();
  const isAdmin = user?.role === "platform_admin";
  // Versão e conexão reais com o banco (o cartão mostrava valores fixos).
  const health = trpc.system.health.useQuery({ timestamp: 0 }, { retry: false, refetchOnWindowFocus: false });

  const roleLabel: Record<string, string> = {
    platform_admin: "Administrador da Plataforma",
    platform_analyst: "Analista de RH",
    platform_auditor: "Auditor",
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

        <DialogSizePreference />

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
            <ChangePasswordForm />
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
                <p className="font-semibold">{health.data?.appVersion ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {health.data?.ambiente ?? "—"}
                  {health.data?.version && health.data.version !== "development" ? ` · build ${health.data.version.slice(0, 7)}` : ""}
                </p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Banco de Dados</p>
                <p className="font-semibold">PostgreSQL</p>
                {health.isLoading ? (
                  <p className="text-xs text-muted-foreground">Verificando conexão...</p>
                ) : health.data?.ok ? (
                  <p className="text-xs text-green-600">● Conectado</p>
                ) : (
                  <p className="text-xs text-red-600">● Sem conexão</p>
                )}
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
