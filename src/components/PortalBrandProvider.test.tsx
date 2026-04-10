import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortalBrandProvider } from "@/components/PortalBrandProvider";
import type { Organization } from "@/types/orgPortal";

const organization: Organization = {
  id: "org-1",
  name: "Acme",
  slug: "acme",
  description: "",
  subdomain: "acme",
  contactEmail: "ops@acme.org",
  ownerEmail: "owner@acme.org",
  logo: "AC",
  welcomeMessage: "Welcome",
  supportEmail: "support@acme.org",
  supportContactName: "Support",
  planType: "starter",
  seatLimit: 10,
  status: "active",
  createdAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
  branding: {
    primaryColor: "#112233",
    secondaryColor: "#223344",
    accentColor: "#334455",
    backgroundColor: "#0a0a0a",
    backgroundStartColor: "#101010",
    backgroundEndColor: "#202020",
    gradientAngle: 120,
    fontFamily: "Poppins",
  },
  assignedProgramIds: [],
  enabledModules: [],
  assignedBundleIds: [],
  announcements: [],
};

describe("PortalBrandProvider", () => {
  it("applies branding CSS variables to the provider root", () => {
    render(
      <PortalBrandProvider organization={organization}>
        <div data-testid="portal-child">Portal</div>
      </PortalBrandProvider>,
    );

    const child = screen.getByTestId("portal-child");
    const root = child.parentElement as HTMLDivElement;

    expect(root.style.getPropertyValue("--primary-color")).toBe("#112233");
    expect(root.style.getPropertyValue("--secondary-color")).toBe("#223344");
    expect(root.style.getPropertyValue("--accent-color")).toBe("#334455");
    expect(root.style.getPropertyValue("--background-color")).toBe("#0a0a0a");
    expect(root.style.getPropertyValue("--font-family")).toBe("Poppins");
    expect(root.style.getPropertyValue("--portal-gradient")).toContain("120deg");
  });
});
