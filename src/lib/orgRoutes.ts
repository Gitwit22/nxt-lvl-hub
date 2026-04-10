import { Organization } from "@/types/orgPortal";

export const SUITE_DOMAIN = "ntlops.com";
export const RESERVED_PORTAL_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "login",
  "auth",
  "docs",
  "help",
  "support",
  "status",
  "cdn",
  "mail",
  "smtp",
  "pop",
  "imap",
  "ftp",
  "m",
  "blog",
  "portal",
  "dashboard",
]);

export function getOrganizationSlugFromHost(hostname: string) {
  const host = hostname.trim().toLowerCase().split(":")[0] || "";
  if (!host || host === SUITE_DOMAIN) return null;

  const domainSuffix = `.${SUITE_DOMAIN}`;
  if (!host.endsWith(domainSuffix)) return null;

  const subdomain = host.slice(0, -domainSuffix.length);
  if (!subdomain || subdomain.includes(".")) return null;
  if (RESERVED_PORTAL_SUBDOMAINS.has(subdomain)) return null;

  return subdomain;
}

export function getOrgBasePath(orgSlug: string) {
  return `/org/${orgSlug}`;
}

export function getOrgProgramsPath(orgSlug: string) {
  return `${getOrgBasePath(orgSlug)}/programs`;
}

export function getOrgUsersPath(orgSlug: string) {
  return `${getOrgBasePath(orgSlug)}/users`;
}

export function getOrgSettingsPath(orgSlug: string) {
  return `${getOrgBasePath(orgSlug)}/settings`;
}

export function getOrgPortalUrl(subdomain: string) {
  const normalized = subdomain.trim().toLowerCase();
  return `https://${normalized}.${SUITE_DOMAIN}`;
}

export function getOrgPortalFallbackUrl(orgSlug: string) {
  return `https://${SUITE_DOMAIN}${getOrgBasePath(orgSlug)}`;
}

export function resolveOrgSlugFromHost(hostname: string, organizations: Organization[]) {
  const subdomain = getOrganizationSlugFromHost(hostname);
  if (!subdomain) return undefined;

  return organizations.find((org) => org.subdomain.toLowerCase() === subdomain)?.slug;
}
