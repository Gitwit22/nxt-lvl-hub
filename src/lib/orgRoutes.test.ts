import { describe, expect, it } from "vitest";
import { getOrganizationSlugFromHost, resolveOrgSlugFromHost } from "@/lib/orgRoutes";
import type { Organization } from "@/types/orgPortal";

const organizations: Organization[] = [
  {
    id: "org-1",
    name: "Acme",
    slug: "acme",
    description: "",
    subdomain: "acme",
    contactEmail: "ops@acme.org",
    ownerEmail: "owner@acme.org",
    logo: "AC",
    welcomeMessage: "Hello",
    supportEmail: "support@acme.org",
    supportContactName: "Support",
    planType: "starter",
    seatLimit: 10,
    status: "active",
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    branding: {
      primaryColor: "#2563eb",
      accentColor: "#0ea5e9",
    },
    assignedProgramIds: [],
    enabledModules: [],
    assignedBundleIds: [],
    announcements: [],
  },
];

describe("resolveOrgSlugFromHost", () => {
  it("resolves slug from matching ntlops subdomain", () => {
    expect(resolveOrgSlugFromHost("acme.ntlops.com", organizations)).toBe("acme");
  });

  it("resolves the route slug even when it differs from the hostname subdomain", () => {
    expect(
      resolveOrgSlugFromHost("miroundtable.ntlops.com", [
        {
          ...organizations[0],
          slug: "mi-roundtable",
          subdomain: "miroundtable",
        },
      ]),
    ).toBe("mi-roundtable");
  });

  it("returns undefined for unknown hosts", () => {
    expect(resolveOrgSlugFromHost("example.com", organizations)).toBeUndefined();
  });

  it("returns undefined for nested subdomains", () => {
    expect(resolveOrgSlugFromHost("west.acme.ntlops.com", organizations)).toBeUndefined();
  });

  it("ignores reserved subdomains", () => {
    expect(getOrganizationSlugFromHost("admin.ntlops.com")).toBeNull();
    expect(resolveOrgSlugFromHost("admin.ntlops.com", organizations)).toBeUndefined();
  });

  it("returns host slug for valid tenant hosts", () => {
    expect(getOrganizationSlugFromHost("acme.ntlops.com")).toBe("acme");
  });
});
