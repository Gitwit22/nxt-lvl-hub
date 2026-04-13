import { Organization } from "@/types/orgPortal";

export const SUITE_DOMAIN = "ntlops.com";
// Both domains resolve to the same Hub deployment.
const SUITE_DOMAINS = [SUITE_DOMAIN, "nltops.com"];

export const RESERVED_SUBDOMAINS = new Set([
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
  if (!host) return null;

  for (const domain of SUITE_DOMAINS) {
    if (host === domain) return null; // root domain — not an org subdomain
    const domainSuffix = `.${domain}`;
    if (host.endsWith(domainSuffix)) {
      const subdomain = host.slice(0, -domainSuffix.length);
      if (!subdomain || subdomain.includes(".")) return null;
      if (RESERVED_SUBDOMAINS.has(subdomain)) return null;
      return subdomain;
    }
  }

  return null;
}

export function getOrgBasePath(orgSlug: string) {
  return `/orgs/${orgSlug}`;
}

export function getOrgProgramsPath(orgSlug: string) {
  return `${getOrgBasePath(orgSlug)}/programs`;
}

export function getOrgUsersPath(orgSlug: string) {
  return `${getOrgBasePath(orgSlug)}/users`;
}

export function getOrgOrganizationPath(orgSlug: string) {
  return `${getOrgBasePath(orgSlug)}/organization`;
}

export function getOrgAccountPath(orgSlug: string) {
  return `${getOrgBasePath(orgSlug)}/account`;
}

export function getOrgSettingsPath(orgSlug: string) {
  return `${getOrgBasePath(orgSlug)}/settings`;
}

export function getOrgPortalUrl(orgSlug: string) {
  return `https://nltops.com${getOrgBasePath(orgSlug)}`;
}

export function resolveOrgSlugFromHost(hostname: string, organizations: Organization[]) {
  const subdomain = getOrganizationSlugFromHost(hostname);
  if (!subdomain) return undefined;

  return organizations.find((org) => org.subdomain.toLowerCase() === subdomain)?.slug;
}
