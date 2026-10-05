export type Agrupamento = "dia" | "semana" | "mes";
export type Preset = "semana" | "mes" | "ano" | "12meses" | "personalizado";

export type Periodo = { inicio: string; fim: string; agrupamento: Agrupamento };

export const PRESET_LABELS: Record<Preset, string> = {
  semana: "Esta semana",
  mes: "Este mês",
  ano: "Este ano",
  "12meses": "Últimos 12 meses",
  personalizado: "Personalizado",
};

export const AGRUPAMENTO_LABELS: Record<Agrupamento, string> = {
  dia: "Por dia",
  semana: "Por semana",
  mes: "Por mês",
};

const pad = (n: number) => String(n).padStart(2, "0");
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Intervalo do atalho, no fuso do navegador (semana começa na segunda). */
export function presetRange(preset: Exclude<Preset, "personalizado">, hoje = new Date()): { inicio: string; fim: string } {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  if (preset === "semana") {
    const diaSemana = (d.getDay() + 6) % 7; // 0 = segunda
    const inicio = new Date(d);
    inicio.setDate(d.getDate() - diaSemana);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    return { inicio: toIso(inicio), fim: toIso(fim) };
  }
  if (preset === "mes") {
    return { inicio: toIso(new Date(d.getFullYear(), d.getMonth(), 1)), fim: toIso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
  }
  if (preset === "ano") {
    return { inicio: `${d.getFullYear()}-01-01`, fim: `${d.getFullYear()}-12-31` };
  }
  const inicio = new Date(d.getFullYear(), d.getMonth() - 11, 1);
  return { inicio: toIso(inicio), fim: toIso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
}

/** Agrupamento sugerido: até 31 dias por dia, até ~6 meses por semana, acima disso por mês. */
export function autoAgrupamento(inicio: string, fim: string): Agrupamento {
  const dias = (Date.parse(fim) - Date.parse(inicio)) / 86_400_000 + 1;
  if (dias <= 31) return "dia";
  if (dias <= 186) return "semana";
  return "mes";
}

export const formatDataBr = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

export const formatDataHoraBr = (date: Date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Rótulo curto de um ponto da série conforme o agrupamento. */
export function rotuloPeriodo(iso: string, agrupamento: Agrupamento) {
  const [a, m, d] = iso.slice(0, 10).split("-");
  if (agrupamento === "mes") return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
  if (agrupamento === "semana") return `sem. ${d}/${m}`;
  return `${d}/${m}`;
}

export const formatNumero = (n: number, casas = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const formatPercent = (parte: number, total: number) =>
  total > 0 ? `${formatNumero((parte / total) * 100, 1)}%` : "—";

export const formatDias = (dias: number | null) => (dias === null ? "—" : `${formatNumero(dias, 1)} ${dias === 1 ? "dia" : "dias"}`);

export const STATUS_SOLICITACAO: Record<string, string> = {
  nova: "Nova",
  em_analise: "Em análise",
  aguardando_documentos: "Aguardando documentos",
  aguardando_correcao: "Aguardando correção",
  aprovado: "Aprovada",
  concluido: "Concluída",
  rejeitado: "Rejeitada",
};

export const TIPO_SOLICITACAO: Record<string, string> = {
  admissao: "Admissão",
  demissao: "Demissão",
  mudanca_funcao: "Mudança de função",
  afastamento: "Afastamento",
  atestado_medico: "Atestado médico",
  outros: "Outros",
};

export const STATUS_CHAMADO: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando retorno",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

export const TIPO_CHAMADO: Record<string, string> = {
  criacao_usuario: "Criação de usuário",
  bloqueio_usuario: "Bloqueio de usuário",
  alteracao_acesso: "Alteração de acesso",
  suporte_tecnico: "Suporte técnico",
  duvida: "Dúvida",
  outros: "Outros",
};

export const qtd = (n: number, singular: string, plural: string) => `${formatNumero(n)} ${n === 1 ? singular : plural}`;
