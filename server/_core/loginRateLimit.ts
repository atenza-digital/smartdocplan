/**
 * Limite de tentativas erradas (login e troca de senha), em memória: suficiente para uma instância só.
 * Cada chave (e-mail, IP ou usuário) tem um limite de erros numa janela; ao estourar, fica bloqueada por um tempo.
 * Reiniciar o servidor zera as contagens.
 */
export type RateLimitRule = { maxErros: number; janelaMs: number; bloqueioMs: number };

const QUINZE_MIN = 15 * 60 * 1000;

export const LOGIN_RULES = {
  email: { maxErros: 5, janelaMs: QUINZE_MIN, bloqueioMs: QUINZE_MIN },
  ip: { maxErros: 20, janelaMs: QUINZE_MIN, bloqueioMs: QUINZE_MIN },
  usuario: { maxErros: 5, janelaMs: QUINZE_MIN, bloqueioMs: QUINZE_MIN },
} satisfies Record<string, RateLimitRule>;

type Entry = { erros: number[]; bloqueadoAte: number };

export class AttemptLimiter {
  private entries = new Map<string, Entry>();

  constructor(private now: () => number = Date.now) {}

  /** Milissegundos restantes de bloqueio da chave (0 = liberada). */
  blockedFor(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.bloqueadoAte - this.now());
  }

  /** Registra um erro. Retorna true se a chave acabou de ser bloqueada. */
  registerFailure(key: string, rule: RateLimitRule) {
    const agora = this.now();
    const entry = this.entries.get(key) ?? { erros: [], bloqueadoAte: 0 };
    entry.erros = entry.erros.filter((t) => agora - t < rule.janelaMs);
    entry.erros.push(agora);
    let bloqueou = false;
    if (entry.erros.length >= rule.maxErros && entry.bloqueadoAte <= agora) {
      entry.bloqueadoAte = agora + rule.bloqueioMs;
      entry.erros = [];
      bloqueou = true;
    }
    this.entries.set(key, entry);
    return bloqueou;
  }

  /** Zera a chave (ex.: login com sucesso). */
  reset(key: string) {
    this.entries.delete(key);
  }

  /** Remove chaves sem bloqueio e sem erros recentes. */
  cleanup(maxJanelaMs = QUINZE_MIN) {
    const agora = this.now();
    this.entries.forEach((entry, key) => {
      const temErroRecente = entry.erros.some((t) => agora - t < maxJanelaMs);
      if (entry.bloqueadoAte <= agora && !temErroRecente) this.entries.delete(key);
    });
  }
}

/** Mensagem do bloqueio com os minutos restantes (arredondados para cima). */
export function blockedMessage(ms: number) {
  const minutos = Math.max(1, Math.ceil(ms / 60000));
  return `Muitas tentativas. Tente novamente em ${minutos} minuto${minutos === 1 ? "" : "s"}.`;
}

/** E-mail mascarado para a auditoria de falhas de login (ex.: jo***@empresa.com). */
export function maskEmail(email: string) {
  const [local, dominio] = email.split("@");
  if (!dominio) return "***";
  return `${local.slice(0, 2)}***@${dominio}`;
}

export const loginLimiter = new AttemptLimiter();
setInterval(() => loginLimiter.cleanup(), 5 * 60 * 1000).unref();
