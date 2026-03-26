import { useState, useEffect } from "react";
import { Cookie, X, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOKIE_KEY = "smartdocplan-lgpd-consent";

type ConsentState = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
};

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_KEY);
    if (!saved) {
      // Pequeno delay para não "piscar" no carregamento
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const save = (c: ConsentState) => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ ...c, savedAt: new Date().toISOString() }));
    setVisible(false);
  };

  const acceptAll = () => save({ essential: true, analytics: true, marketing: true });
  const rejectAll = () => save({ essential: true, analytics: false, marketing: false });
  const saveCustom = () => save(consent);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aviso de cookies - LGPD"
      className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 print:hidden"
    >
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Cookie className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold text-foreground text-sm">Privacidade e Cookies</h2>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">LGPD</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Utilizamos cookies para garantir o funcionamento da plataforma e melhorar sua experiência.
              Em conformidade com a{" "}
              <strong className="text-foreground">Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</strong>,
              você pode escolher quais cookies aceitar.
            </p>
          </div>
        </div>

        {/* Configurações expandidas */}
        {expanded && (
          <div className="px-4 pb-3 space-y-2.5 border-t border-border pt-3">
            {/* Essenciais */}
            <div className="flex items-start justify-between gap-3 p-3 bg-muted/40 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-foreground">Cookies Essenciais</span>
                  <span className="text-xs text-green-700 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">Obrigatório</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Necessários para o funcionamento da plataforma: autenticação, sessão e segurança. Não podem ser desativados.
                </p>
              </div>
              <div className="shrink-0 mt-1">
                <div className="w-10 h-5 bg-green-500 rounded-full relative cursor-not-allowed opacity-80">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>
            </div>

            {/* Analíticos */}
            <div className="flex items-start justify-between gap-3 p-3 bg-muted/40 rounded-lg">
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground mb-0.5">Cookies Analíticos</p>
                <p className="text-xs text-muted-foreground">
                  Coletam dados anônimos sobre o uso da plataforma para melhorar funcionalidades.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={consent.analytics}
                onClick={() => setConsent(c => ({ ...c, analytics: !c.analytics }))}
                title={consent.analytics ? "Desativar cookies analíticos" : "Ativar cookies analíticos"}
                className={`shrink-0 mt-1 w-10 h-5 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  consent.analytics ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${consent.analytics ? "right-0.5" : "left-0.5"}`} />
              </button>
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-3 p-3 bg-muted/40 rounded-lg">
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground mb-0.5">Cookies de Marketing</p>
                <p className="text-xs text-muted-foreground">
                  Permitem personalizar comunicações e medir a eficácia de campanhas.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={consent.marketing}
                onClick={() => setConsent(c => ({ ...c, marketing: !c.marketing }))}
                title={consent.marketing ? "Desativar cookies de marketing" : "Ativar cookies de marketing"}
                className={`shrink-0 mt-1 w-10 h-5 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  consent.marketing ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${consent.marketing ? "right-0.5" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        )}

        {/* Rodapé com botões */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-muted/30 border-t border-border">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:underline"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Ocultar opções" : "Personalizar cookies"}
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={rejectAll}
              className="text-xs h-8 px-3"
            >
              Rejeitar opcionais
            </Button>
            {expanded && (
              <Button
                variant="outline"
                size="sm"
                onClick={saveCustom}
                className="text-xs h-8 px-3"
              >
                Salvar preferências
              </Button>
            )}
            <Button
              size="sm"
              onClick={acceptAll}
              className="text-xs h-8 px-4 bg-primary hover:bg-primary/90"
            >
              Aceitar todos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
