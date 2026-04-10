import { describe, expect, it } from "vitest";
import { getLaunchBehavior, normalizeInternalLaunchUrl, toAppCatalogEntry } from "@/lib/appCatalog";
import type { Program } from "@/types/program";

const baseProgram: Program = {
  id: "program-timeflow",
  slug: "timeflow",
  name: "TimeFlow",
  shortDescription: "Short",
  longDescription: "Long",
  category: "Operations",
  secondaryCategory: "Human Resources",
  tags: [],
  status: "live",
  type: "internal",
  origin: "suite-native",
  internalRoute: "/apps/timeflow",
  externalUrl: undefined,
  openInNewTab: false,
  logoUrl: "",
  screenshotUrl: "",
  accentColor: "#2563eb",
  cardBackgroundColor: "#172554",
  cardBackgroundOpacity: 0,
  cardGlowColor: "#60a5fa",
  cardGlowOpacity: 0,
  cardHoverTintOpacity: 0,
  adminOnly: false,
  isFeatured: true,
  isPublic: true,
  requiresLogin: true,
  requiresApproval: false,
  launchLabel: "Launch",
  displayOrder: 1,
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("appCatalog", () => {
  it("normalizes legacy internal /apps routes to /workspace", () => {
    expect(normalizeInternalLaunchUrl("/apps/timeflow", "timeflow")).toBe("/workspace/timeflow");
  });

  it("requires sign in before launching internal apps", () => {
    const app = toAppCatalogEntry(baseProgram);
    const launch = getLaunchBehavior(app, null);

    expect(launch.buttonText).toBe("Sign In to Launch");
    expect(launch.destination).toBe("/login?returnTo=%2Fworkspace%2Ftimeflow");
    expect(launch.requiresAuth).toBe(true);
  });

  it("launches external apps directly", () => {
    const app = toAppCatalogEntry({
      ...baseProgram,
      type: "external",
      internalRoute: undefined,
      externalUrl: "https://community-chronicle.ntlops.com",
      requiresLogin: false,
    });
    const launch = getLaunchBehavior(app, null);

    expect(launch.buttonText).toBe("Launch Site");
    expect(launch.destination).toBe("https://community-chronicle.ntlops.com");
    expect(launch.requiresAuth).toBe(false);
  });
});