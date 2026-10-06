import { normalizeCep } from "@shared/address";

export type CepResult = { endereco: string; bairro: string; cidade: string; estado: string };

/**
 * Consulta o CEP no ViaCEP (serviço público, sem chave). Só o CEP sai do navegador.
 * Retorna null se o CEP não existir; lança erro se o serviço não responder.
 */
export async function lookupCep(cep: string, signal?: AbortSignal): Promise<CepResult | null> {
  const digits = normalizeCep(cep);
  if (digits.length !== 8) return null;
  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal });
  if (!response.ok) throw new Error("Serviço de CEP indisponível.");
  const data = await response.json();
  if (data?.erro) return null;
  return { endereco: data.logradouro ?? "", bairro: data.bairro ?? "", cidade: data.localidade ?? "", estado: data.uf ?? "" };
}
