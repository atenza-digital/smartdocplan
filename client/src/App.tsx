import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocalAuthProvider, useLocalAuth } from "./contexts/LocalAuthContext";
import Login from "./pages/Login";
import Home from "./pages/Home";

// Admin da Plataforma
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEmpresas from "./pages/admin/AdminEmpresas";
import AdminSolicitacoes from "./pages/admin/AdminSolicitacoes";
import AdminChamados from "./pages/admin/AdminChamados";
import AdminMatrizLegal from "./pages/admin/AdminMatrizLegal";
import AdminAuditoria from "./pages/admin/AdminAuditoria";
import AdminBI from "./pages/admin/AdminBI";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminConfiguracoes from "./pages/admin/AdminConfiguracoes";

// Empresa (usuarios das empresas clientes)
import EmpresaDashboard from "./pages/empresa/EmpresaDashboard";
import EmpresaSolicitacoes from "./pages/empresa/EmpresaSolicitacoes";
import EmpresaColaboradores from "./pages/empresa/EmpresaColaboradores";
import EmpresaDossie from "./pages/empresa/EmpresaDossie";
import EmpresaPendencias from "./pages/empresa/EmpresaPendencias";
import EmpresaChamados from "./pages/empresa/EmpresaChamados";
import EmpresaBI from "./pages/empresa/EmpresaBI";
import EmpresaConfiguracoes from "./pages/empresa/EmpresaConfiguracoes";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useLocalAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated && location !== "/login") {
      navigate("/login");
    }
  }, [loading, isAuthenticated, location, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

function Router() {
  const { user, loading } = useLocalAuth();
  const [location, navigate] = useLocation();

  // Redirecionar / para o painel correto apos login
  useEffect(() => {
    if (!loading && user && location === "/") {
      const isPlatform = ["platform_admin", "platform_analyst", "platform_auditor"].includes(user.role);
      navigate(isPlatform ? "/admin" : "/empresa");
    }
  }, [loading, user, location, navigate]);

  return (
    <Switch>
      {/* Pagina de login (publica) */}
      <Route path="/login" component={Login} />

      {/* Rota raiz - redireciona apos autenticacao */}
      <Route path="/" component={Home} />

      {/* -- Admin da Plataforma -- */}
      <Route path="/admin">
        <AuthGuard><AdminDashboard /></AuthGuard>
      </Route>
      <Route path="/admin/empresas">
        <AuthGuard><AdminEmpresas /></AuthGuard>
      </Route>
      <Route path="/admin/solicitacoes">
        <AuthGuard><AdminSolicitacoes /></AuthGuard>
      </Route>
      <Route path="/admin/chamados">
        <AuthGuard><AdminChamados /></AuthGuard>
      </Route>
      <Route path="/admin/matriz-legal">
        <AuthGuard><AdminMatrizLegal /></AuthGuard>
      </Route>
      <Route path="/admin/auditoria">
        <AuthGuard><AdminAuditoria /></AuthGuard>
      </Route>
      <Route path="/admin/bi">
        <AuthGuard><AdminBI /></AuthGuard>
      </Route>
      <Route path="/admin/usuarios">
        <AuthGuard><AdminUsuarios /></AuthGuard>
      </Route>
      <Route path="/admin/configuracoes">
        <AuthGuard><AdminConfiguracoes /></AuthGuard>
      </Route>

      {/* -- Empresa (usuarios das empresas clientes) -- */}
      <Route path="/empresa">
        <AuthGuard><EmpresaDashboard /></AuthGuard>
      </Route>
      <Route path="/empresa/solicitacoes">
        <AuthGuard><EmpresaSolicitacoes /></AuthGuard>
      </Route>
      <Route path="/empresa/colaboradores">
        <AuthGuard><EmpresaColaboradores /></AuthGuard>
      </Route>
      <Route path="/empresa/colaboradores/:id">
        <AuthGuard><EmpresaDossie /></AuthGuard>
      </Route>
      <Route path="/empresa/pendencias">
        <AuthGuard><EmpresaPendencias /></AuthGuard>
      </Route>
      <Route path="/empresa/chamados">
        <AuthGuard><EmpresaChamados /></AuthGuard>
      </Route>
      <Route path="/empresa/bi">
        <AuthGuard><EmpresaBI /></AuthGuard>
      </Route>
      <Route path="/empresa/configuracoes">
        <AuthGuard><EmpresaConfiguracoes /></AuthGuard>
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <LocalAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LocalAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
