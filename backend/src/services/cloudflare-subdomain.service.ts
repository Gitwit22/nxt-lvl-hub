/**
 * Cloudflare Subdomain Service
 *
 * Stub implementation for Phase 15.
 * Future: call the Cloudflare API to create DNS CNAME records for each new
 * organization subdomain under ntlops.com.
 *
 * Required env vars (future):
 *   CLOUDFLARE_API_TOKEN
 *   CLOUDFLARE_ZONE_ID
 */

export interface SubdomainResult {
  slug: string;
  subdomain: string;
  portalUrl: string;
  provisioned: boolean;
  message: string;
}

const SUITE_DOMAIN = "ntlops.com";

/**
 * Provision a wildcard subdomain for an organization.
 *
 * Stub: logs the intended operation and returns a success result.
 * Replace the body of this function with a real Cloudflare API call when ready.
 */
export async function createSubdomain(slug: string): Promise<SubdomainResult> {
  const subdomain = slug.trim().toLowerCase();
  const portalUrl = `https://${subdomain}.${SUITE_DOMAIN}`;

  // TODO: Call Cloudflare API
  // POST https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records
  // {
  //   type: "CNAME",
  //   name: subdomain,
  //   content: "app.ntlops.com",
  //   ttl: 1,
  //   proxied: true,
  // }

  console.log(`[cloudflare] STUB: would create CNAME ${subdomain}.${SUITE_DOMAIN} → app.${SUITE_DOMAIN}`);

  return {
    slug,
    subdomain,
    portalUrl,
    provisioned: false, // flip to true once real API is wired
    message: "Subdomain provisioning is pending Cloudflare integration.",
  };
}

/**
 * Remove a subdomain DNS record for an organization.
 * Stub only — no-op until Cloudflare API is wired.
 */
export async function deleteSubdomain(slug: string): Promise<void> {
  const subdomain = slug.trim().toLowerCase();
  console.log(`[cloudflare] STUB: would delete CNAME ${subdomain}.${SUITE_DOMAIN}`);
}
