import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import CompanyLayout from "@/components/CompanyLayout";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Moon, Palette, Sun, UserRound } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Administrador da Plataforma",
  platform_analyst: "Analista de RH",
  platform_auditor: "Auditor",
  company_admin: "Administrador da Empresa",
  company_hr: "RH da Empresa",
  company_manager: "Gestor",
  company_viewer: "Consulta",
};

export default function Perfil() {
  const [location] = useLocation();
  const Layout = location.startsWith("/admin") ? AdminLayout : CompanyLayout;
  const { user } = useLocalAuth();
  const { theme, toggleTheme } = useTheme();
  const companyId = user?.companyId ?? 0;
  const { data: empresa } = trpc.companies.get.useQuery({ id: companyId }, { enabled: companyId > 0 });

  return (
    <Layout title="Meu perfil">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Meu perfil</h2>
          <p className="text-muted-foreground text-sm mt-1">Seus dados de acesso, preferências e senha.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserRound className="w-4 h-4 text-primary" /> Dados da conta
            </CardTitle>
            <CardDescription className="text-xs">
              Para alterar nome, e-mail ou perfil de acesso, fale com o administrador da plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground mb-1">Nome</dt>
                <dd className="font-medium text-sm break-words">{user?.name ?? "—"}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground mb-1">E-mail</dt>
                <dd className="font-medium text-sm break-words">{user?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground mb-1">Perfil de acesso</dt>
                <dd>
                  <Badge variant="outline" className="text-xs">
                    {ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? "—"}
                  </Badge>
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground mb-1">Empresa</dt>
                <dd className="font-medium text-sm break-words">
                  {companyId > 0 ? empresa?.nomeFantasia || empresa?.razaoSocial || "—" : "Equipe SmartDocPlan"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" /> Aparência
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Tema atual: <span className="font-medium text-foreground">{theme === "dark" ? "escuro" : "claro"}</span>
            </p>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> Alterar senha
            </CardTitle>
            <CardDescription className="text-xs">
              Use pelo menos 8 caracteres, com letras, números e símbolos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
