/**
 * Suite authentication utilities for nxt-lvl-hub.
 * Handles redirects to centralized Suite login for platform_only auth mode.
 */

const SUITE_URL = (import.meta.env.VITE_SUITE_URL as string | undefined) ?? "";
const SUITE_DOMAIN = "ntlops.com";

/**
 * Validates that a return path is safe (same origin).
 */
function normalizeReturnPath(value?: string): string | undefined {
  if (!value) return undefined;

  try {
    const currentOrigin = window.location.origin;
    const asUrl = new URL(value, currentOrigin);
    if (asUrl.origin !== currentOrigin) {
      return undefined;
    }
    return `${asUrl.pathname}${asUrl.search}${asUrl.hash}`;
  } catch {
    return undefined;
  }
}

/**
 * Builds the Suite login URL with app and return path context.
 * Used to redirect unauthenticated users to centralized Suite for platform_only apps.
 */
export function getSuiteLoginUrl(returnTo?: string): string {
  const normalizedReturnPath = normalizeReturnPath(returnTo);

  if (!SUITE_URL) {
    // Fallback: if Suite URL is not configured, stay within app
    return "/";
  }

  try {
    const url = new URL("/login", SUITE_URL);
    url.searchParams.set("next", "nxt-lvl-suites");
    if (normalizedReturnPath) {
      url.searchParams.set("returnTo", normalizedReturnPath);
    }
    return url.toString();
  } catch {
    return "/";
  }
}

/**
 * Builds the Suite signup/register URL.
 */
export function getSuiteSignupUrl(returnTo?: string): string {
  const normalizedReturnPath = normalizeReturnPath(returnTo);

  if (!SUITE_URL) {
    return "/";
  }

  try {
    const url = new URL("/signup", SUITE_URL);
    url.searchParams.set("next", "nxt-lvl-suites");
    if (normalizedReturnPath) {
      url.searchParams.set("returnTo", normalizedReturnPath);
    }
    return url.toString();
  } catch {
    return "/";
  }
}

/**
 * Constructs a Suite URL for navigation.
 */
export function getSuiteUrl(path: string = ""): string {
  if (!SUITE_URL) return "";
  try {
    const url = new URL(path, SUITE_URL);
    return url.toString();
  } catch {
    return "";
  }
}

/**
 * Check whether to use Suite auth based on environment.
 */
export function isSuiteAuthConfigured(): boolean {
  return Boolean(SUITE_URL && SUITE_URL.length > 0);
}

/**
 * Get the Suite domain for redirect purposes.
 */
export function getLoginRedirectUrl(returnTo?: string): string {
  return getSuiteLoginUrl(returnTo);
}
