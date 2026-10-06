import { Link } from "wouter";
import CompanyLayout from "@/components/CompanyLayout";
import { DialogSizePreference } from "@/components/DialogSizePreference";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accessibility, Moon, Palette, SlidersHorizontal, Sun, UserRound } from "lucide-react";
import { canSeeCompanySettings } from "@shared/permissions";

const FONT_LABELS: Record<string, string> = { normal: "Normal", large: "Grande", xlarge: "Muito grande" };

/**
 * Configurações pessoais de quem está usando a plataforma: aparência, tamanho das janelas e acessibilidade.
 * As preferências ficam salvas neste navegador. Cadastro e regras da empresa ficam em Parâmetros da empresa.
 */
export default function EmpresaConfiguracoes() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { highContrast, fontSize, toggleHighContrast, increaseFontSize, decreaseFontSize, resetFontSize } = useAccessibility();

  return (
    <CompanyLayout title="Configurações">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Suas preferências de uso, salvas neste navegador.
            {canSeeCompanySettings(user?.role) && (
              <>
                {" "}Os dados e as regras da empresa ficam em{" "}
                <Link href="/empresa/parametros" className="text-primary underline">Parâmetros da empresa</Link>.
              </>
            )}
          </p>
        </div>

        <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-primary" />
                Aparência
              </CardTitle>
              <CardDescription>Tema claro ou escuro da plataforma.</CardDescription>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Accessibility className="h-4 w-4 text-primary" />
                Acessibilidade
              </CardTitle>
              <CardDescription>Tamanho do texto e alto contraste (também na barra do topo).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Texto: <span className="font-medium text-foreground">{FONT_LABELS[fontSize] ?? fontSize}</span>
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={decreaseFontSize} disabled={fontSize === "normal"} aria-label="Diminuir texto">A−</Button>
                  <Button variant="outline" size="sm" onClick={resetFontSize} disabled={fontSize === "normal"}>Padrão</Button>
                  <Button variant="outline" size="sm" onClick={increaseFontSize} disabled={fontSize === "xlarge"} aria-label="Aumentar texto">A+</Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Alto contraste: <span className="font-medium text-foreground">{highContrast ? "ligado" : "desligado"}</span>
                </p>
                <Button variant="outline" size="sm" onClick={toggleHighContrast} aria-pressed={highContrast}>
                  {highContrast ? "Desligar" : "Ligar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <DialogSizePreference />
          </div>

          <Card className="lg:col-span-2">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Meu perfil</p>
                  <p className="text-xs text-muted-foreground">Seus dados de acesso e troca de senha.</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/empresa/perfil">Abrir Meu perfil</Link>
              </Button>
            </CardContent>
          </Card>

          {canSeeCompanySettings(user?.role) && (
            <Card className="lg:col-span-2">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="flex items-center gap-3">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Parâmetros da empresa</p>
                    <p className="text-xs text-muted-foreground">Dados, endereço, funções, locais, matriz legal, documentos recorrentes e prazos de férias.</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/empresa/parametros">Abrir Parâmetros</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </CompanyLayout>
  );
}
