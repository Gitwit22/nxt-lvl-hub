import { Organization } from "@/types/orgPortal";

export const SUITE_DOMAIN = "nxtlvlsuite.com";

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
  const host = hostname.toLowerCase();
  const domainSuffix = `.${SUITE_DOMAIN}`;
  if (!host.endsWith(domainSuffix)) return undefined;

  const subdomain = host.slice(0, -domainSuffix.length);
  if (!subdomain || subdomain.includes(".")) return undefined;

  return organizations.find((org) => org.subdomain.toLowerCase() === subdomain)?.slug;
}
