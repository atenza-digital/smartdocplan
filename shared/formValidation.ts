function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return date;
}

export function normalizeTextSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function hasFullName(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.length >= 2;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeCpf(value: string) {
  return onlyDigits(value).slice(0, 11);
}

export function formatCpf(value: string) {
  const digits = normalizeCpf(value);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function isValidCpf(value: string) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf[index]) * (10 - index);
  }

  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(cpf[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf[index]) * (11 - index);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(cpf[10]);
}

export function normalizeCnpj(value: string) {
  return value.replace(/[^0-9a-z]/gi, "").toUpperCase().slice(0, 14);
}

export function formatCnpj(value: string) {
  const cleaned = normalizeCnpj(value);
  const p1 = cleaned.slice(0, 2);
  const p2 = cleaned.slice(2, 5);
  const p3 = cleaned.slice(5, 8);
  const p4 = cleaned.slice(8, 12);
  const p5 = cleaned.slice(12, 14);

  let formatted = p1;
  if (p2) formatted += `.${p2}`;
  if (p3) formatted += `.${p3}`;
  if (p4) formatted += `/${p4}`;
  if (p5) formatted += `-${p5}`;
  return formatted;
}

export function isValidCnpj(value: string) {
  const cleaned = normalizeCnpj(value);
  if (cleaned.length !== 14) return false;

  if (/[A-Z]/.test(cleaned)) {
    return true;
  }

  if (/^(\d)\1+$/.test(cleaned)) return false;

  const calculateDigit = (base: string, factors: number[]) => {
    const total = base
      .split("")
      .reduce((sum, digit, index) => sum + Number(digit) * factors[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const base = cleaned.slice(0, 12);
  const firstDigit = calculateDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateDigit(`${base}${firstDigit}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return cleaned === `${base}${firstDigit}${secondDigit}`;
}

export function normalizePhone(value: string) {
  return onlyDigits(value).slice(0, 11);
}

export function formatPhone(value: string) {
  const digits = normalizePhone(value);
  if (!digits) return "";

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(value: string) {
  const digits = normalizePhone(value);
  return digits.length === 10 || digits.length === 11;
}

export function isAtLeastYearsOld(value: string, years: number, referenceDate = new Date()) {
  const date = parseDateOnly(value);
  if (!date) return false;

  const comparisonDate = new Date(referenceDate.getFullYear() - years, referenceDate.getMonth(), referenceDate.getDate());
  return date <= comparisonDate;
}

export function getBirthDateMax(years: number, referenceDate = new Date()) {
  const date = new Date(referenceDate.getFullYear() - years, referenceDate.getMonth(), referenceDate.getDate());
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Datas de documentos (emissão e validade): faixa plausível para barrar erros de digitação como 04/04/1900.
export const DOCUMENT_DATE_MIN = "1950-01-01";
const DOCUMENT_VALIDITY_MAX_YEARS = 50;

function toDateOnly(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Limites para os campos de data de documentos (formato AAAA-MM-DD, usados também em `min`/`max` dos inputs). */
export function getDocumentDateBounds(referenceDate = new Date()) {
  const tomorrow = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + 1);
  const validadeMax = new Date(referenceDate.getFullYear() + DOCUMENT_VALIDITY_MAX_YEARS, referenceDate.getMonth(), referenceDate.getDate());
  return { min: DOCUMENT_DATE_MIN, emissaoMax: toDateOnly(tomorrow), validadeMax: toDateOnly(validadeMax) };
}

/** Retorna a mensagem de erro das datas de um documento, ou null se estiverem coerentes. Datas vazias são aceitas. */
export function getDocumentDatesError(dataEmissao?: string | null, validade?: string | null, referenceDate = new Date()) {
  const bounds = getDocumentDateBounds(referenceDate);
  const formatBr = (value: string) => value.split("-").reverse().join("/");
  if (dataEmissao) {
    if (!parseDateOnly(dataEmissao)) return "Data de emissão inválida.";
    if (dataEmissao < bounds.min) return `A data de emissão deve ser a partir de ${formatBr(bounds.min)}.`;
    if (dataEmissao > bounds.emissaoMax) return "A data de emissão não pode estar no futuro.";
  }
  if (validade) {
    if (!parseDateOnly(validade)) return "Data de validade inválida.";
    if (validade < bounds.min) return `A data de validade deve ser a partir de ${formatBr(bounds.min)}.`;
    if (validade > bounds.validadeMax) return `A data de validade não pode passar de ${formatBr(bounds.validadeMax)}.`;
  }
  if (dataEmissao && validade && validade < dataEmissao) return "A validade não pode ser anterior à data de emissão.";
  return null;
}

/** Situação de validade derivada da data: vencido, vence em até 30 dias ou em dia. */
export function getValidityState(validade?: string | Date | null, referenceDate = new Date()) {
  if (!validade) return "sem_validade" as const;
  const value = typeof validade === "string" ? validade.slice(0, 10) : toDateOnly(validade);
  const today = toDateOnly(referenceDate);
  if (value < today) return "vencido" as const;
  const limit = toDateOnly(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + 30));
  return value <= limit ? ("a_vencer" as const) : ("valido" as const);
}

/** Formata uma data AAAA-MM-DD como dd/mm/aaaa sem passar por fuso (new Date("AAAA-MM-DD") volta um dia no Brasil). */
export function formatDateOnlyBr(value?: string | Date | null) {
  if (!value) return "";
  const text = typeof value === "string" ? value : toDateOnly(value);
  const [year, month, day] = text.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}
