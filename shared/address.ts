import { z } from "zod";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export function normalizeCep(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

/** Máscara 00000-000 (aplicada enquanto digita). */
export function formatCep(value: string) {
  const digits = normalizeCep(value);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function isValidCep(value: string) {
  return normalizeCep(value).length === 8;
}

export type AddressValue = {
  cep: string;
  endereco: string; // logradouro
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

export const emptyAddress: AddressValue = { cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" };

const optionalText = (max: number) => z.string().trim().max(max).optional();

/** Campos de endereço aceitos pelo servidor: CEP com 8 dígitos e UF da lista, quando informados. */
export const addressInput = {
  cep: z.string().optional().refine((v) => !v || isValidCep(v), "CEP inválido: use 8 dígitos."),
  endereco: optionalText(255),
  numero: optionalText(20),
  complemento: optionalText(100),
  bairro: optionalText(100),
  cidade: optionalText(100),
  estado: z.string().optional().refine((v) => !v || (UFS as readonly string[]).includes(v.toUpperCase()), "UF inválida."),
};

/** Normaliza para gravar: CEP formatado, UF em maiúsculas e vazios como null. */
export function addressForDb(input: Partial<AddressValue>) {
  const clean = (value?: string) => (value && value.trim() ? value.trim() : null);
  return {
    cep: input.cep && isValidCep(input.cep) ? formatCep(input.cep) : null,
    endereco: clean(input.endereco),
    numero: clean(input.numero),
    complemento: clean(input.complemento),
    bairro: clean(input.bairro),
    cidade: clean(input.cidade),
    estado: clean(input.estado)?.toUpperCase() ?? null,
  };
}

/** Uma linha para exibir: "Rua X, 123 - apto 4 · Bairro · Cidade/UF · CEP 00000-000". */
export function formatAddress(a: Partial<Record<keyof AddressValue, string | null>>) {
  const rua = [a.endereco, a.numero].filter(Boolean).join(", ") + (a.complemento ? ` - ${a.complemento}` : "");
  const cidade = [a.cidade, a.estado].filter(Boolean).join("/");
  return [rua, a.bairro, cidade, a.cep ? `CEP ${a.cep}` : ""].filter(Boolean).join(" · ");
}
