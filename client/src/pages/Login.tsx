import { useState } from "react";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, FolderOpen } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function Login() {
  const { login, loading, error } = useLocalAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setLocalError(err.message ?? "Erro ao fazer login.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header minimalista */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FolderOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight">
            Smart<span className="text-primary">Doc</span>Plan
          </span>
        </div>
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Conteudo central */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo e titulo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <FolderOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Bem-vindo</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Acesse sua conta SmartDocPlan
            </p>
          </div>

          <Card className="border-border/60 shadow-lg">
            <CardHeader className="pb-0 pt-6 px-6">
              <p className="text-sm font-semibold text-foreground">Entrar na plataforma</p>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={submitting}
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {displayError && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                    <p className="text-sm text-destructive font-medium">{displayError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  disabled={submitting || loading}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Problemas de acesso? Entre em contato com o administrador da plataforma.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border/50">
        &copy; {new Date().getFullYear()} SmartDocPlan &mdash; Gestao Documental de RH
      </footer>
    </div>
  );
}
