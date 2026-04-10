import { describe, expect, it } from "vitest";
import { getOrganizationSlugFromHost, isReservedPortalSubdomain } from "./portal-host.js";

describe("portal-host", () => {
  it("extracts tenant slug for wildcard host", () => {
    expect(getOrganizationSlugFromHost("acme.ntlops.com")).toBe("acme");
  });

  it("returns null for root domain and reserved labels", () => {
    expect(getOrganizationSlugFromHost("ntlops.com")).toBeNull();
    expect(getOrganizationSlugFromHost("admin.ntlops.com")).toBeNull();
  });

  it("detects reserved subdomains", () => {
    expect(isReservedPortalSubdomain("admin")).toBe(true);
    expect(isReservedPortalSubdomain("acme")).toBe(false);
  });
});
