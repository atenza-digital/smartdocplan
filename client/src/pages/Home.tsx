import { useEffect } from "react";
import { useLocation } from "wouter";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { Loader2 } from "lucide-react";

const PLATFORM_ROLES = ["platform_admin", "platform_analyst", "platform_auditor"];

/**
 * Pagina inicial: redireciona para o painel correto com base no papel do usuario.
 * Se nao autenticado, redireciona para /login.
 */
export default function Home() {
  const { user, loading, isAuthenticated } = useLocalAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!user) return;

    if (PLATFORM_ROLES.includes(user.role)) {
      navigate("/admin");
    } else {
      navigate("/empresa");
    }
  }, [user, loading, isAuthenticated, navigate]);

  return (
    <div className="min-h-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}
