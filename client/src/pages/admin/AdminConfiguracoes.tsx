import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Settings, Info } from "lucide-react";

export default function AdminConfiguracoes() {
  const { user } = useAuth();

  const roleLabel: Record<string, string> = {
    platform_admin: "Administrador da Plataforma",
    platform_analyst: "Analista de RH",
    platform_auditor: "Auditor",
  };

  return (
    <AdminLayout title="Configurações">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configurações da Plataforma</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as configurações globais da plataforma SmartDocPlan.
          </p>
        </div>

        {/* Meu Perfil */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Meu Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {roleLabel[user?.role ?? ""] ?? user?.role}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium text-foreground">Autenticação</p>
                <p className="text-xs text-muted-foreground">Login via e-mail e senha</p>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                Ativo
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium text-foreground">Controle de Acesso</p>
                <p className="text-xs text-muted-foreground">Papéis: platform_admin, platform_analyst, platform_auditor, company_admin, company_hr, company_manager, company_viewer</p>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                Configurado
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Sobre a Plataforma */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Sobre a Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Plataforma", value: "SmartDocPlan" },
                { label: "Versão", value: "1.0.0" },
                { label: "Tipo", value: "SaaS de Gestão de RH" },
                { label: "Multi-tenant", value: "Sim" },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
