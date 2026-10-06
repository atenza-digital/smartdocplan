import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import { DisplayPreferencesProvider } from "./contexts/DisplayPreferencesContext";
import { LocalAuthProvider, useLocalAuth } from "./contexts/LocalAuthContext";
import { AccessibilityBar } from "./components/AccessibilityBar";
import { CookieBanner } from "./components/CookieBanner";
import Login from "./pages/Login";
import Home from "./pages/Home";

import { Loader2 } from "lucide-react";
import { canManagePlatformSettings, canSeeCompanySettings, isPlatformUser } from "@shared/permissions";
// Páginas carregadas sob demanda: cada tela vira um arquivo próprio e o carregamento inicial fica leve.
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminEmpresas = lazy(() => import("./pages/admin/AdminEmpresas"));
const AdminSolicitacoes = lazy(() => import("./pages/admin/AdminSolicitacoes"));
const AdminChamados = lazy(() => import("./pages/admin/AdminChamados"));
const AdminMatrizLegal = lazy(() => import("./pages/admin/AdminMatrizLegal"));
const AdminAuditoria = lazy(() => import("./pages/admin/AdminAuditoria"));
const AdminBI = lazy(() => import("./pages/admin/AdminBI"));
const AdminUsuarios = lazy(() => import("./pages/admin/AdminUsuarios"));
const AdminConfiguracoes = lazy(() => import("./pages/admin/AdminConfiguracoes"));
const AdminEmpresaDetalhe = lazy(() => import("./pages/admin/AdminEmpresaDetalhe"));
const AdminValidacaoDocumentos = lazy(() => import("./pages/admin/AdminValidacaoDocumentos"));
const AdminCampanhas = lazy(() => import("./pages/admin/AdminCampanhas"));
const AdminDocumentos = lazy(() => import("./pages/admin/AdminDocumentos"));

const EmpresaDashboard = lazy(() => import("./pages/empresa/EmpresaDashboard"));
const EmpresaNovaSolicitacao = lazy(() => import("./pages/empresa/EmpresaNovaSolicitacao"));
const EmpresaSolicitacoes = lazy(() => import("./pages/empresa/EmpresaSolicitacoes"));
const EmpresaColaboradores = lazy(() => import("./pages/empresa/EmpresaColaboradores"));
const EmpresaDossie = lazy(() => import("./pages/empresa/EmpresaDossie"));
const EmpresaPendencias = lazy(() => import("./pages/empresa/EmpresaPendencias"));
const EmpresaDocumentos = lazy(() => import("./pages/empresa/EmpresaDocumentos"));
const EmpresaParametros = lazy(() => import("./pages/empresa/EmpresaParametros"));
const EmpresaChamados = lazy(() => import("./pages/empresa/EmpresaChamados"));
const EmpresaBI = lazy(() => import("./pages/empresa/EmpresaBI"));
const EmpresaConfiguracoes = lazy(() => import("./pages/empresa/EmpresaConfiguracoes"));
const OrganizationRegisters = lazy(() => import("./pages/OrganizationRegisters"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Vacations = lazy(() => import("./pages/Vacations"));

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useLocalAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated && location !== "/login") {
      navigate("/login");
    }
  }, [loading, isAuthenticated, location, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

function RoleGuard({
  allow,
  redirectTo,
  children,
}: {
  allow: (role?: string | null) => boolean;
  redirectTo: string;
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useLocalAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && user && !allow(user.role)) {
      navigate(redirectTo);
    }
  }, [allow, isAuthenticated, loading, navigate, redirectTo, user]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !allow(user.role)) return null;
  return <>{children}</>;
}

/** Carregamento enquanto o arquivo da tela é baixado. */
function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      Carregando...
    </div>
  );
}

function Router() {
  const { user, loading } = useLocalAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user && (location === "/" || location === "/login")) {
      const isPlatform = ["platform_admin", "platform_analyst", "platform_auditor"].includes(user.role);
      navigate(isPlatform ? "/admin" : "/empresa");
    }
  }, [loading, user, location, navigate]);

  return (
    <Suspense fallback={<PageLoading />}>
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Home} />

      <Route path="/admin">
        <AuthGuard>
          <RoleGuard allow={isPlatformUser} redirectTo="/empresa">
            <AdminDashboard />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/empresas">
        <AuthGuard>
          <RoleGuard allow={isPlatformUser} redirectTo="/empresa">
            <AdminEmpresas />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/estrutura"><AuthGuard><RoleGuard allow={isPlatformUser} redirectTo="/empresa"><OrganizationRegisters /></RoleGuard></AuthGuard></Route>
      <Route path="/admin/ferias"><AuthGuard><RoleGuard allow={isPlatformUser} redirectTo="/empresa"><Vacations /></RoleGuard></AuthGuard></Route>
      <Route path="/empresa/ferias"><AuthGuard><Vacations /></AuthGuard></Route>
      <Route path="/empresa/estrutura"><AuthGuard><RoleGuard allow={canSeeCompanySettings} redirectTo="/empresa"><OrganizationRegisters /></RoleGuard></AuthGuard></Route>
      <Route path="/admin/colaboradores/:id">
        <AuthGuard>
          <RoleGuard allow={isPlatformUser} redirectTo="/empresa">
            <EmpresaDossie />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/campanhas">
        <AuthGuard>
          <RoleGuard allow={canManagePlatformSettings} redirectTo="/admin">
            <AdminCampanhas />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/validacao-documentos">
        <AuthGuard>
          <RoleGuard allow={isPlatformUser} redirectTo="/empresa">
            <AdminValidacaoDocumentos />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/empresas/:id">
        <AuthGuard>
          <RoleGuard allow={isPlatformUser} redirectTo="/empresa">
            <AdminEmpresaDetalhe />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/solicitacoes">
        <AuthGuard>
          <RoleGuard allow={isPlatformUser} redirectTo="/empresa">
            <AdminSolicitacoes />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/solicitacoes/nova">
        <AuthGuard>
          <RoleGuard allow={isPlatformUser} redirectTo="/empresa">
            <EmpresaNovaSolicitacao />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/chamados">
        <AuthGuard>
          <RoleGuard allow={isPlatformUser} redirectTo="/empresa">
            <AdminChamados />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/auditoria">
        <AuthGuard>
          <RoleGuard allow={isPlatformUser} redirectTo="/empresa">
            <AdminAuditoria />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/bi">
        <AuthGuard>
          <RoleGuard allow={isPlatformUser} redirectTo="/empresa">
            <AdminBI />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/usuarios">
        <AuthGuard>
          <RoleGuard allow={canManagePlatformSettings} redirectTo="/admin">
            <AdminUsuarios />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/configuracoes">
        <AuthGuard>
          <RoleGuard allow={canManagePlatformSettings} redirectTo="/admin">
            <AdminConfiguracoes />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/perfil">
        <AuthGuard>
          <RoleGuard allow={isPlatformUser} redirectTo="/empresa">
            <Perfil />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/documentos">
        <AuthGuard>
          <RoleGuard allow={canManagePlatformSettings} redirectTo="/admin">
            <AdminDocumentos />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/admin/matriz-legal">
        <AuthGuard>
          <RoleGuard allow={canManagePlatformSettings} redirectTo="/admin">
            <AdminMatrizLegal />
          </RoleGuard>
        </AuthGuard>
      </Route>

      <Route path="/empresa">
        <AuthGuard>
          <EmpresaDashboard />
        </AuthGuard>
      </Route>
      <Route path="/empresa/solicitacoes/nova">
        <AuthGuard>
          <EmpresaNovaSolicitacao />
        </AuthGuard>
      </Route>
      <Route path="/empresa/solicitacoes">
        <AuthGuard>
          <EmpresaSolicitacoes />
        </AuthGuard>
      </Route>
      <Route path="/empresa/colaboradores">
        <AuthGuard>
          <EmpresaColaboradores />
        </AuthGuard>
      </Route>
      <Route path="/empresa/colaboradores/:id">
        <AuthGuard>
          <EmpresaDossie />
        </AuthGuard>
      </Route>
      <Route path="/empresa/parametros">
        <AuthGuard>
          <RoleGuard allow={canSeeCompanySettings} redirectTo="/empresa">
            <EmpresaParametros />
          </RoleGuard>
        </AuthGuard>
      </Route>
      <Route path="/empresa/documentos">
        <AuthGuard>
          <EmpresaDocumentos />
        </AuthGuard>
      </Route>
      <Route path="/empresa/pendencias">
        <AuthGuard>
          <EmpresaPendencias />
        </AuthGuard>
      </Route>
      <Route path="/empresa/chamados">
        <AuthGuard>
          <EmpresaChamados />
        </AuthGuard>
      </Route>
      <Route path="/empresa/bi">
        <AuthGuard>
          <EmpresaBI />
        </AuthGuard>
      </Route>
      <Route path="/empresa/perfil">
        <AuthGuard>
          <Perfil />
        </AuthGuard>
      </Route>
      <Route path="/empresa/configuracoes">
        <AuthGuard>
          <EmpresaConfiguracoes />
        </AuthGuard>
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <ThemeProvider defaultTheme="light" switchable>
          <LocalAuthProvider>
          <DisplayPreferencesProvider>
            <TooltipProvider>
              <div className="flex h-dvh flex-col overflow-hidden bg-background">
                <a href="#main-content" className="skip-to-content">
                  Pular para o conteúdo principal
                </a>
                <AccessibilityBar />
                <main id="main-content" className="min-h-0 flex-1 overflow-hidden">
                  <Toaster />
                  <Router />
                </main>
                <CookieBanner />
              </div>
            </TooltipProvider>
          </DisplayPreferencesProvider>
          </LocalAuthProvider>
        </ThemeProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}

export default App;
