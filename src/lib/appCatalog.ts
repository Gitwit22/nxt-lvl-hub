import type { MeResponse } from "@/lib/api";
import type { Program } from "@/types/program";

export type AppVisibilityStatus = "public" | "hidden" | "coming_soon";
export type AppAccessType = "internal" | "external";

export interface AppCatalogEntry {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  logoUrl?: string;
  category: string;
  visibilityStatus: AppVisibilityStatus;
  accessType: AppAccessType;
  launchUrl: string;
  requiresSuiteLogin: boolean;
  isActive: boolean;
  sortOrder: number;
  featured: boolean;
  screenshots?: string[];
  tags?: string[];
  supportContact?: string;
  ownerTeam?: string;
  secondaryCategory?: string;
  status: Program["status"];
  openInNewTab: boolean;
}

export interface AppLaunchBehavior {
  canLaunch: boolean;
  requiresAuth: boolean;
  destination?: string;
  buttonText: string;
  helperText: string;
  openInNewTab: boolean;
}

export function slugifyAppName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function resolveWorkspacePath(slug: string) {
  return `/workspace/${slug}`;
}

function normalizeRelativePath(path: string) {
  if (path.startsWith("/")) {
    return path;
  }

  return `/${path.replace(/^\/+/, "")}`;
}

function looksAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function looksHostName(value: string) {
  return !value.startsWith("/") && value.includes(".");
}

export function toBrowserDestination(target: string) {
  if (looksAbsoluteUrl(target) || target.startsWith("mailto:")) {
    return target;
  }

  if (looksHostName(target)) {
    return `https://${target.replace(/^https?:\/\//i, "")}`;
  }

  return normalizeRelativePath(target);
}

export function normalizeInternalLaunchUrl(route: string | undefined, slug: string) {
  if (!route || !route.trim()) {
    return resolveWorkspacePath(slug);
  }

  const normalized = normalizeRelativePath(route.trim());

  if (normalized === `/apps/${slug}` || normalized.startsWith("/apps/")) {
    const [, , routeSlug] = normalized.split("/");
    return resolveWorkspacePath(routeSlug || slug);
  }

  return normalized;
}

export function toAppCatalogEntry(program: Program): AppCatalogEntry {
  const slug = program.slug || slugifyAppName(program.name);
  const visibilityStatus: AppVisibilityStatus = !program.isPublic
    ? "hidden"
    : program.status === "coming-soon"
      ? "coming_soon"
      : "public";

  const accessType: AppAccessType = program.type;
  const launchUrl = accessType === "external"
    ? toBrowserDestination(program.externalUrl || program.internalRoute || resolveWorkspacePath(slug))
    : normalizeInternalLaunchUrl(program.internalRoute, slug);

  return {
    id: program.id,
    name: program.name,
    slug,
    shortDescription: program.shortDescription,
    longDescription: program.longDescription || program.shortDescription,
    logoUrl: program.logoUrl,
    category: program.category,
    visibilityStatus,
    accessType,
    launchUrl,
    requiresSuiteLogin: accessType === "internal" || program.requiresLogin,
    isActive: program.status !== "archived",
    sortOrder: program.displayOrder,
    featured: program.isFeatured,
    screenshots: program.screenshotUrl ? [program.screenshotUrl] : undefined,
    tags: program.tags,
    supportContact: "support@ntlops.com",
    ownerTeam: program.secondaryCategory || program.category,
    secondaryCategory: program.secondaryCategory,
    status: program.status,
    openInNewTab: program.openInNewTab,
  };
}

export function getPublicAppCatalog(programs: Program[]) {
  return programs
    .filter((program) => !program.adminOnly)
    .map(toAppCatalogEntry)
    .filter((app) => app.visibilityStatus !== "hidden" && app.isActive)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

export function findPublicAppBySlug(programs: Program[], slug: string) {
  return getPublicAppCatalog(programs).find((app) => app.slug === slug);
}

export function canUserLaunchApp(app: AppCatalogEntry, user: MeResponse | null) {
  if (app.visibilityStatus === "coming_soon") {
    return false;
  }

  if (app.accessType === "external") {
    return true;
  }

  return Boolean(user);
}

function buildLoginUrl(destination: string) {
  return `/login?returnTo=${encodeURIComponent(destination)}`;
}

export function getLaunchBehavior(app: AppCatalogEntry, user: MeResponse | null): AppLaunchBehavior {
  if (app.visibilityStatus === "coming_soon") {
    return {
      canLaunch: false,
      requiresAuth: false,
      destination: undefined,
      buttonText: "Coming Soon",
      helperText: "This app is listed in the Suite but is not available to launch yet.",
      openInNewTab: false,
    };
  }

  if (app.accessType === "external") {
    return {
      canLaunch: true,
      requiresAuth: false,
      destination: app.launchUrl,
      buttonText: "Launch Site",
      helperText: "This app launches directly and follows its own access flow.",
      openInNewTab: app.openInNewTab,
    };
  }

  if (!user) {
    return {
      canLaunch: true,
      requiresAuth: true,
      destination: buildLoginUrl(app.launchUrl),
      buttonText: "Sign In to Launch",
      helperText: "This is an internal Suite app and requires Suite authentication before launch.",
      openInNewTab: false,
    };
  }

  return {
    canLaunch: true,
    requiresAuth: false,
    destination: app.launchUrl,
    buttonText: "Launch App",
    helperText: "You are signed in and can launch this internal Suite app now.",
    openInNewTab: false,
  };
}
