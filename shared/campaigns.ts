export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const PUBLICO_LABELS: Record<string, string> = {
  todos: "Empresas e equipe SmartDocPlan",
  empresas: "Só empresas",
  plataforma: "Só equipe SmartDocPlan",
};

/** Link da campanha: só https (evita javascript:, http e outros esquemas). */
export function isSafeCampaignLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname;
  } catch {
    return false;
  }
}

/** A campanha aparece para o perfil: empresas, plataforma ou ambos. */
export function campaignVisibleTo(publico: string, platformUser: boolean) {
  return publico === "todos" || (publico === "plataforma" ? platformUser : !platformUser);
}

// ─── Cor da campanha aplicada ao tema ────────────────────────────────────────

function hexToRgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function rgbToHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

/** Luminância relativa (WCAG). */
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste entre duas cores (1 a 21). */
export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function mix(hex: string, target: [number, number, number], amount: number) {
  const rgb = hexToRgb(hex);
  return rgbToHex(rgb.map((v, i) => v + (target[i] - v) * amount) as [number, number, number]);
}

const FUNDO_CLARO = "#ffffff";
const FUNDO_ESCURO = "#0f172a";

/**
 * Cor da campanha ajustada para virar a cor principal da plataforma: no tema claro escurece e no escuro clareia,
 * aos poucos, até ter contraste de pelo menos 3:1 com o fundo (botões, ícones e destaques legíveis).
 * Também escolhe o texto sobre a cor (branco ou quase preto, o que tiver mais contraste).
 */
export function campaignThemeColors(hex: string, modo: "claro" | "escuro") {
  const fundo = modo === "claro" ? FUNDO_CLARO : FUNDO_ESCURO;
  const alvo: [number, number, number] = modo === "claro" ? [0, 0, 0] : [255, 255, 255];
  let cor = hex.toLowerCase();
  for (let passo = 0; passo < 20 && contrastRatio(cor, fundo) < 3; passo++) cor = mix(cor, alvo, 0.1);
  const texto = contrastRatio(cor, "#ffffff") >= contrastRatio(cor, "#0f172a") ? "#ffffff" : "#0f172a";
  return { primary: cor, primaryForeground: texto };
}
