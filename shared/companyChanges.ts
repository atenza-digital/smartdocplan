/** Campos do cadastro da empresa que a empresa pode pedir para alterar, com o nome mostrado ao usuário. */
export const COMPANY_FIELD_LABELS: Record<string, string> = {
  razaoSocial: "Razão social",
  nomeFantasia: "Nome fantasia",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  cep: "CEP",
  endereco: "Endereço",
  numero: "Número",
  complemento: "Complemento",
  bairro: "Bairro",
  cidade: "Cidade",
  estado: "UF",
};

const texto = (valor: unknown) => {
  const limpo = valor === null || valor === undefined ? "" : String(valor).trim();
  return limpo === "" ? "(vazio)" : limpo;
};

/**
 * Linhas "Campo: antes → depois" só dos campos que mudam. `novo` traz os campos do pedido; um campo ausente
 * ou igual ao atual não entra.
 */
export function describeCompanyChanges(atual: Record<string, unknown>, novo: Record<string, unknown>): string[] {
  return Object.entries(COMPANY_FIELD_LABELS).flatMap(([campo, rotulo]) => {
    if (!(campo in novo)) return [];
    const antes = texto(atual[campo]);
    const depois = texto(novo[campo]);
    return antes === depois ? [] : [`${rotulo}: ${antes} → ${depois}`];
  });
}
