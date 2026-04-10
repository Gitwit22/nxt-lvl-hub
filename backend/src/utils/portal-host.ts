const ROOT_DOMAIN = "ntlops.com";

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

export function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().split(":")[0] || "";
}

export function getOrganizationSlugFromHost(hostname: string, rootDomain = ROOT_DOMAIN): string | null {
  const host = normalizeHostname(hostname);
  const domain = rootDomain.trim().toLowerCase();

  if (!host || host === domain) {
    return null;
  }

  const suffix = `.${domain}`;
  if (!host.endsWith(suffix)) {
    return null;
  }

  const label = host.slice(0, -suffix.length);
  if (!label || label.includes(".")) {
    return null;
  }

  if (RESERVED_PORTAL_SUBDOMAINS.has(label)) {
    return null;
  }

  return label;
}

export function isReservedPortalSubdomain(value: string) {
  return RESERVED_PORTAL_SUBDOMAINS.has(value.trim().toLowerCase());
}

export function getPortalUrlForSlug(slug: string, rootDomain = ROOT_DOMAIN) {
  return `https://${slug.trim().toLowerCase()}.${rootDomain.trim().toLowerCase()}`;
}
