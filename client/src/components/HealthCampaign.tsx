import { useEffect, useState, useSyncExternalStore } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { campaignThemeColors } from "@shared/campaigns";
import { Eye, Ribbon, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Campaign = { id: number; titulo: string; mensagem: string; link: string | null; linkTexto: string | null; cor: string };

/** Cor clara (ex.: Janeiro Branco) precisa de contorno para continuar visível no fundo claro. */
function isLightColor(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.8;
}

// ─── Prévia do tema: só neste navegador, sem ativar a campanha para ninguém ──
const PREVIEW_KEY = "campanha-previa";
const PREVIEW_EVENT = "campanha-previa-mudou";

function readPreview(): Campaign | null {
  try {
    const raw = sessionStorage.getItem(PREVIEW_KEY);
    return raw ? (JSON.parse(raw) as Campaign) : null;
  } catch {
    return null;
  }
}
let previewCache: { raw: string | null; value: Campaign | null } = { raw: null, value: null };
function previewSnapshot() {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PREVIEW_KEY);
  } catch {
    raw = null;
  }
  if (raw !== previewCache.raw) previewCache = { raw, value: raw ? readPreview() : null };
  return previewCache.value;
}
function subscribePreview(callback: () => void) {
  window.addEventListener(PREVIEW_EVENT, callback);
  return () => window.removeEventListener(PREVIEW_EVENT, callback);
}

/** Liga (ou desliga, com null) a prévia do tema de uma campanha nesta aba do navegador. */
export function setCampaignPreview(campaign: Campaign | null) {
  try {
    if (campaign) sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(campaign));
    else sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    // Sem armazenamento: a prévia não persiste.
  }
  window.dispatchEvent(new Event(PREVIEW_EVENT));
}

export function useCampaignPreview() {
  return useSyncExternalStore(subscribePreview, previewSnapshot, () => null);
}

/** Campanha a aplicar: a prévia (se houver, só para quem a ligou) ou a ativa do mês. */
export function useActiveCampaign() {
  const preview = useCampaignPreview();
  const { data } = trpc.healthCampaigns.active.useQuery(undefined, { staleTime: 30 * 60 * 1000, refetchOnWindowFocus: false });
  return preview ?? data ?? null;
}

/** Barra que avisa que a prévia está ligada e permite encerrá-la. */
export function CampaignPreviewBar() {
  const preview = useCampaignPreview();
  if (!preview) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-foreground px-4 py-1.5 text-xs text-background">
      <span className="inline-flex items-center gap-1.5">
        <Eye className="h-3.5 w-3.5" />
        Prévia do tema "{preview.titulo}": só você está vendo; a campanha não foi ativada.
      </span>
      <button type="button" onClick={() => setCampaignPreview(null)} className="rounded border border-background/40 px-2 py-0.5 font-medium hover:bg-background/10">
        Encerrar prévia
      </button>
    </div>
  );
}

const THEME_VARS = ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring", "--primary-foreground", "--sidebar-primary-foreground"];

/**
 * Aplica a cor da campanha como cor principal da plataforma inteira (botões, destaques e menu) durante o mês.
 * A cor é ajustada para manter contraste no tema claro e no escuro; com alto contraste ligado, nada muda.
 */
export function CampaignTheme({ campaign }: { campaign: Campaign | null }) {
  const { theme } = useTheme();
  const { highContrast } = useAccessibility();
  useEffect(() => {
    const root = document.documentElement;
    if (!campaign || highContrast) return;
    const { primary, primaryForeground } = campaignThemeColors(campaign.cor, theme === "dark" ? "escuro" : "claro");
    for (const v of ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring"]) root.style.setProperty(v, primary);
    for (const v of ["--primary-foreground", "--sidebar-primary-foreground"]) root.style.setProperty(v, primaryForeground);
    return () => THEME_VARS.forEach((v) => root.style.removeProperty(v));
  }, [campaign?.id, campaign?.cor, theme, highContrast]);
  return null;
}

/** Faixa fina com a cor da campanha, acima do cabeçalho. */
export function CampaignStrip({ campaign }: { campaign: Campaign | null }) {
  if (!campaign) return null;
  return (
    <div
      aria-hidden="true"
      className={`h-[3px] w-full shrink-0 ${isLightColor(campaign.cor) ? "border-b border-border" : ""}`}
      style={{ backgroundColor: campaign.cor }}
    />
  );
}

/** Laço da campanha no cabeçalho, com o nome no tooltip. */
export function CampaignRibbon({ campaign }: { campaign: Campaign | null }) {
  if (!campaign) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="hidden shrink-0 items-center sm:inline-flex" aria-label={campaign.titulo} role="img">
          <Ribbon
            className="h-5 w-5"
            style={{ color: campaign.cor, fill: campaign.cor }}
            stroke={isLightColor(campaign.cor) ? "#64748b" : campaign.cor}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>{campaign.titulo}</TooltipContent>
    </Tooltip>
  );
}

const dismissKey = (campaign: Campaign) => {
  const hoje = new Date();
  return `campanha-fechada-${campaign.id}-${hoje.getFullYear()}-${hoje.getMonth() + 1}`;
};

function readDismissed(campaign: Campaign) {
  try {
    return localStorage.getItem(dismissKey(campaign)) === "1";
  } catch {
    return false;
  }
}

/** Banner da campanha do mês. Fechado, não volta até o mesmo mês do ano seguinte (neste navegador). */
export function CampaignBanner({ campaign, preview = false }: { campaign: Campaign | null; preview?: boolean }) {
  const [dismissed, setDismissed] = useState(() => (campaign && !preview ? readDismissed(campaign) : false));
  if (!campaign || dismissed) return null;
  const close = () => {
    try {
      localStorage.setItem(dismissKey(campaign), "1");
    } catch {
      // Sem armazenamento disponível: fecha só nesta visita.
    }
    setDismissed(true);
  };
  return (
    <div
      role="note"
      aria-label={`Campanha: ${campaign.titulo}`}
      className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
      style={{ borderLeftWidth: 6, borderLeftColor: campaign.cor }}
    >
      <Ribbon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: campaign.cor, fill: campaign.cor }} stroke={isLightColor(campaign.cor) ? "#64748b" : campaign.cor} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{campaign.titulo}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{campaign.mensagem}</p>
        {campaign.link && (
          <a href={campaign.link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
            {campaign.linkTexto || "Saiba mais"}
          </a>
        )}
      </div>
      {!preview && (
        <button type="button" onClick={close} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Fechar aviso da campanha">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
