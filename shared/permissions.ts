export const PLATFORM_ROLES = [
  "platform_admin",
  "platform_analyst",
  "platform_auditor",
] as const;

export const COMPANY_ROLES = [
  "company_admin",
  "company_hr",
  "company_manager",
  "company_viewer",
] as const;

export const ALL_ROLES = [...PLATFORM_ROLES, ...COMPANY_ROLES] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type CompanyRole = (typeof COMPANY_ROLES)[number];
export type AppRole = (typeof ALL_ROLES)[number];

/**
 * Permissões editáveis dos perfis da empresa (Etapa 5). Os perfis da equipe SmartDocPlan continuam fixos.
 * Sem nenhuma edição, cada perfil da empresa tem exatamente as permissões padrão abaixo (= regras de antes).
 */
export const PERMISSOES = [
  { chave: "colaboradores.ver", area: "Colaboradores", rotulo: "Ver colaboradores e dossiês" },
  { chave: "colaboradores.gerenciar", area: "Colaboradores", rotulo: "Cadastrar e editar colaboradores, enviar documentos e pedir exclusão" },
  { chave: "saude.enviar", area: "Saúde", rotulo: "Enviar documentos de saúde e ver situação e validade (sem abrir)" },
  { chave: "saude.abrir", area: "Saúde", rotulo: "Abrir documentos de saúde, observações e solicitações de saúde" },
  { chave: "documentos_empresa.ver", area: "Documentos da empresa", rotulo: "Ver documentos da empresa" },
  { chave: "documentos_empresa.gerenciar", area: "Documentos da empresa", rotulo: "Enviar novas versões e pedir exclusão de documentos da empresa" },
  { chave: "solicitacoes.ver", area: "Solicitações de RH", rotulo: "Ver solicitações" },
  { chave: "solicitacoes.criar", area: "Solicitações de RH", rotulo: "Abrir solicitações e enviar documentos nelas" },
  { chave: "ferias.ver", area: "Férias", rotulo: "Ver férias e calendário" },
  { chave: "ferias.gerenciar", area: "Férias", rotulo: "Programar e alterar férias" },
  { chave: "pendencias.ver", area: "Pendências", rotulo: "Ver pendências" },
  { chave: "chamados.ver", area: "Chamados", rotulo: "Ver chamados" },
  { chave: "chamados.abrir", area: "Chamados", rotulo: "Abrir e responder chamados" },
  { chave: "bi.ver", area: "BI / Relatórios", rotulo: "Ver BI e exportar relatórios" },
  { chave: "parametros.gerenciar", area: "Configuração", rotulo: "Alterar Parâmetros e Estrutura da empresa" },
  { chave: "avisos.receber", area: "Configuração", rotulo: "Receber avisos de documentos, férias e decisões no sino" },
  { chave: "perfis.gerenciar", area: "Configuração", rotulo: "Gerenciar perfis e permissões da empresa" },
] as const;

export type Permissao = (typeof PERMISSOES)[number]["chave"];
export const CHAVES_PERMISSAO: readonly Permissao[] = PERMISSOES.map((p) => p.chave);

const VER: Permissao[] = ["colaboradores.ver", "documentos_empresa.ver", "solicitacoes.ver", "ferias.ver", "pendencias.ver", "chamados.ver", "bi.ver"];
const GERIR: Permissao[] = ["colaboradores.gerenciar", "documentos_empresa.gerenciar", "solicitacoes.criar", "ferias.gerenciar", "chamados.abrir", "parametros.gerenciar", "avisos.receber"];

/** Permissões padrão de cada perfil da empresa: reproduzem as regras fixas usadas até a Etapa 5. */
export const PERMISSOES_PADRAO: Record<CompanyRole, readonly Permissao[]> = {
  company_admin: [...VER, ...GERIR, "saude.enviar", "perfis.gerenciar"],
  company_hr: [...VER, ...GERIR, "saude.enviar", "saude.abrir"],
  company_manager: [...VER, "chamados.abrir"],
  company_viewer: [...VER],
};

export const PERFIL_BASE_LABEL: Record<CompanyRole, string> = {
  company_admin: "Admin da empresa",
  company_hr: "RH da empresa",
  company_manager: "Gestor",
  company_viewer: "Consulta",
};

/** Travas que valem mesmo em perfil editado (conferidas no servidor ao salvar). */
export function permissoesPermitidas(baseRole: CompanyRole): Permissao[] {
  return CHAVES_PERMISSAO.filter((chave) => {
    if (chave.startsWith("saude.")) return baseRole === "company_admin" || baseRole === "company_hr";
    if (chave === "perfis.gerenciar") return baseRole === "company_admin";
    return true;
  });
}

/** Normaliza a lista salva: só chaves conhecidas e permitidas para a base; o perfil Admin padrão nunca perde perfis.gerenciar. */
export function normalizarPermissoes(baseRole: CompanyRole, permissoes: readonly string[], perfilPadrao: boolean): Permissao[] {
  const permitidas = new Set(permissoesPermitidas(baseRole));
  const lista = CHAVES_PERMISSAO.filter((chave) => permitidas.has(chave) && permissoes.includes(chave));
  if (perfilPadrao && baseRole === "company_admin" && !lista.includes("perfis.gerenciar")) lista.push("perfis.gerenciar");
  return lista;
}

/** Quem age: só o papel (regras padrão) ou o usuário com as permissões efetivas já resolvidas. */
export type Ator = string | null | undefined | { role: string; permissoes?: readonly string[] | null };

const papelDe = (ator: Ator) => (typeof ator === "object" && ator ? ator.role : ator ?? null);

/** Permissão de um perfil da empresa (perfis da plataforma respondem pelas funções específicas abaixo). */
export function temPermissao(ator: Ator, chave: Permissao): boolean {
  const role = papelDe(ator);
  if (!isCompanyUser(role)) return false;
  const lista = typeof ator === "object" && ator?.permissoes ? ator.permissoes : PERMISSOES_PADRAO[role];
  return lista.includes(chave);
}

/** Visualização de uma área: a equipe SmartDocPlan vê tudo; a empresa depende do perfil. */
export function podeVer(ator: Ator, chave: Permissao): boolean {
  return isPlatformUser(papelDe(ator)) || temPermissao(ator, chave);
}

export function isPlatformUser(role?: string | null): role is PlatformRole {
  return !!role && PLATFORM_ROLES.includes(role as PlatformRole);
}

export function isCompanyUser(role?: string | null): role is CompanyRole {
  return !!role && COMPANY_ROLES.includes(role as CompanyRole);
}

export function isPlatformOperator(role?: string | null) {
  return role === "platform_admin" || role === "platform_analyst";
}

/**
 * Destinatários da equipe SmartDocPlan (administrador e analista) de um aviso.
 * Aviso de dado de saúde só vai a quem pode ver dado de saúde.
 */
export function platformTeamRecipients(rows: { id: number; role: string }[], saude = false) {
  return rows
    .filter((row) => isPlatformOperator(row.role) && (!saude || canAccessHealthData(row.role)))
    .map((row) => row.id);
}

export function isPlatformAuditor(role?: string | null) {
  return role === "platform_auditor";
}

export function canAccessHealthData(ator?: Ator) {
  const role = papelDe(ator);
  if (isPlatformUser(role)) return role === "platform_admin";
  return temPermissao(ator, "saude.abrir");
}

/** Enviar documento de saúde e ver a situação dele: quem vê dado de saúde e o Administrador da empresa (sem abrir o arquivo). */
export function canSendHealthDocuments(ator?: Ator) {
  return canAccessHealthData(ator) || temPermissao(ator, "saude.enviar");
}

export function isHealthCategory(value?: string | null) {
  return ["exame_medico", "psicossocial", "atestado", "atestado_medico", "afastamento"].includes(value ?? "");
}

/** Alterar dados da empresa numa área (padrão: colaboradores). A equipe SmartDocPlan (admin e analista) altera todas. */
export function canManageCompanyData(
  ator?: Ator,
  area: "colaboradores.gerenciar" | "documentos_empresa.gerenciar" | "parametros.gerenciar" | "ferias.gerenciar" = "colaboradores.gerenciar",
) {
  const role = papelDe(ator);
  if (isPlatformUser(role)) return role === "platform_admin" || role === "platform_analyst";
  return temPermissao(ator, area);
}

export function canCreateRequests(ator?: Ator) {
  const role = papelDe(ator);
  if (isPlatformUser(role)) return role === "platform_admin";
  return temPermissao(ator, "solicitacoes.criar");
}

export function canManageRequestWorkflow(role?: string | null) {
  return role === "platform_admin" || role === "platform_analyst";
}

export function canCreateTickets(ator?: Ator) {
  const role = papelDe(ator);
  if (isPlatformUser(role)) return role === "platform_admin";
  return temPermissao(ator, "chamados.abrir");
}

export function canManagePlatformSettings(role?: string | null) {
  return role === "platform_admin";
}

export function canSeeAdminManagement(role?: string | null) {
  return role === "platform_admin";
}

export function canSeeCompanySettings(ator?: Ator) {
  const role = papelDe(ator);
  if (isPlatformUser(role)) return role === "platform_admin";
  return temPermissao(ator, "parametros.gerenciar");
}

/** Gerenciar perfis e permissões da empresa: Administrador Geral ou quem tem a permissão no perfil. */
export function canManageProfiles(ator?: Ator) {
  const role = papelDe(ator);
  if (isPlatformUser(role)) return role === "platform_admin";
  return temPermissao(ator, "perfis.gerenciar");
}
