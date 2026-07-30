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

export function isPlatformUser(role?: string | null): role is PlatformRole {
  return !!role && PLATFORM_ROLES.includes(role as PlatformRole);
}

export function isCompanyUser(role?: string | null): role is CompanyRole {
  return !!role && COMPANY_ROLES.includes(role as CompanyRole);
}

export function isPlatformOperator(role?: string | null) {
  return role === "platform_admin" || role === "platform_analyst";
}

export function isPlatformAuditor(role?: string | null) {
  return role === "platform_auditor";
}

export function canManageCompanyData(role?: string | null) {
  return role === "platform_admin" || role === "platform_analyst" || role === "company_admin" || role === "company_hr";
}

export function canCreateRequests(role?: string | null) {
  return role === "platform_admin" || role === "company_admin" || role === "company_hr";
}

export function canManageRequestWorkflow(role?: string | null) {
  return role === "platform_admin" || role === "platform_analyst";
}

export function canCreateTickets(role?: string | null) {
  return role === "platform_admin" || role === "company_admin" || role === "company_hr" || role === "company_manager";
}

export function canManagePlatformSettings(role?: string | null) {
  return role === "platform_admin";
}

export function canSeeAdminManagement(role?: string | null) {
  return role === "platform_admin";
}

export function canSeeCompanySettings(role?: string | null) {
  return role === "platform_admin" || role === "company_admin" || role === "company_hr";
}
