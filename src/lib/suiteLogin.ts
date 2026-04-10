/**
 * Suite authentication utilities for nxt-lvl-hub.
 * Handles redirects to centralized Suite login for platform_only auth mode.
 */

const SUITE_URL = (import.meta.env.VITE_SUITE_URL as string | undefined) ?? "";
const SUITE_LOGIN_PATH = (import.meta.env.VITE_SUITE_LOGIN_PATH as string | undefined) ?? "/site/login";
const SUITE_SIGNUP_PATH = (import.meta.env.VITE_SUITE_SIGNUP_PATH as string | undefined) ?? "/site/register";
const APP_LOGIN_ENTRY_PATH = "/site/login";

const SUITE_HOST_PRIMARY = "nltops.com";
const SUITE_HOST_FALLBACK = "ntlops.com";

function isLocalhost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function resolveSuiteBaseUrl(): string {
  if (SUITE_URL) return SUITE_URL;

  const host = window.location.hostname.toLowerCase();

  if (isLocalhost(host)) {
    return "http://localhost:3000";
  }

  if (host === SUITE_HOST_PRIMARY || host.endsWith(`.${SUITE_HOST_PRIMARY}`)) {
    return `https://${SUITE_HOST_PRIMARY}`;
  }

  if (host === SUITE_HOST_FALLBACK || host.endsWith(`.${SUITE_HOST_FALLBACK}`)) {
    return `https://${SUITE_HOST_FALLBACK}`;
  }

  return `https://${SUITE_HOST_PRIMARY}`;
}

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
 * 
 * If VITE_SUITE_URL is not configured, returns a placeholder that indicates
 * Suite login is required (for development/testing).
 */
export function getSuiteLoginUrl(returnTo?: string): string {
  const normalizedReturnPath = normalizeReturnPath(returnTo);
  const suiteBaseUrl = resolveSuiteBaseUrl();

  if (!SUITE_URL) {
    console.warn("[Suite Auth] VITE_SUITE_URL missing. Using fallback base URL:", suiteBaseUrl);
  }

  try {
    const url = new URL(SUITE_LOGIN_PATH, suiteBaseUrl);
    url.searchParams.set("next", "nxt-lvl-suites");
    if (normalizedReturnPath) {
      url.searchParams.set("returnTo", normalizedReturnPath);
    }
    const resolved = url.toString();

    // Avoid a same-page no-op navigation loop.
    if (resolved === window.location.href) {
      const alternateBase = suiteBaseUrl.includes(SUITE_HOST_PRIMARY)
        ? `https://${SUITE_HOST_FALLBACK}`
        : `https://${SUITE_HOST_PRIMARY}`;
      const alternate = new URL(SUITE_LOGIN_PATH, alternateBase);
      alternate.search = url.search;
      const alternateResolved = alternate.toString();
      if (alternateResolved === window.location.href) {
        return `${APP_LOGIN_ENTRY_PATH}?suiteAuthMisconfigured=1`;
      }
      return alternateResolved;
    }

    // Prevent path-level loop (/site/login -> /site/login with tiny query differences).
    const currentUrl = new URL(window.location.href);
    const targetUrl = new URL(resolved);
    if (
      currentUrl.origin === targetUrl.origin &&
      currentUrl.pathname === targetUrl.pathname &&
      ["/login", "/site/login", "/signin", "/auth/login"].includes(currentUrl.pathname)
    ) {
      return `${APP_LOGIN_ENTRY_PATH}?suiteAuthMisconfigured=1`;
    }

    return resolved;
  } catch (err) {
    console.error("[Suite Auth] Failed to construct Suite login URL", err);
    return `${APP_LOGIN_ENTRY_PATH}?suiteAuthError=1`;
  }
}

/**
 * Builds the Suite signup/register URL.
 */
export function getSuiteSignupUrl(returnTo?: string): string {
  const normalizedReturnPath = normalizeReturnPath(returnTo);
  const suiteBaseUrl = resolveSuiteBaseUrl();

  if (!SUITE_URL) {
    console.warn("[Suite Auth] VITE_SUITE_URL missing. Using fallback base URL:", suiteBaseUrl);
  }

  try {
    const url = new URL(SUITE_SIGNUP_PATH, suiteBaseUrl);
    url.searchParams.set("next", "nxt-lvl-suites");
    if (normalizedReturnPath) {
      url.searchParams.set("returnTo", normalizedReturnPath);
    }
    return url.toString();
  } catch (err) {
    console.error("[Suite Auth] Failed to construct Suite signup URL", err);
    return `${APP_LOGIN_ENTRY_PATH}?suiteAuthError=1`;
  }
}

/**
 * Constructs a Suite URL for navigation.
 */
export function getSuiteUrl(path: string = ""): string {
  const suiteBaseUrl = resolveSuiteBaseUrl();
  try {
    const url = new URL(path, suiteBaseUrl);
    return url.toString();
  } catch {
    return "";
  }
}

/**
 * Check whether to use Suite auth based on environment.
 */
export function isSuiteAuthConfigured(): boolean {
  return Boolean(resolveSuiteBaseUrl());
}

/**
 * Get the Suite domain for redirect purposes.
 */
export function getLoginRedirectUrl(returnTo?: string): string {
  return getSuiteLoginUrl(returnTo);
}
