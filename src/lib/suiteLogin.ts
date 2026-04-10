/**
 * Suite authentication utilities for nxt-lvl-hub.
 * Handles redirects to centralized Suite login for child/platform_only apps.
 * The Suite host itself should use local /site/login and /site/create-account routes.
 */

const SUITE_EXTERNAL_URL = (import.meta.env.VITE_SUITE_URL as string | undefined) ?? "";
const SUITE_LOGIN_PATH = (import.meta.env.VITE_SUITE_LOGIN_PATH as string | undefined) ?? "/site/login";
const SUITE_SIGNUP_PATH = (import.meta.env.VITE_SUITE_SIGNUP_PATH as string | undefined) ?? "/site/create-account";
const AUTH_APP_MODE = ((import.meta.env.VITE_AUTH_APP_MODE as string | undefined) ?? "auto").toLowerCase();
const APP_LOGIN_ENTRY_PATH = "/site/login";
const APP_SIGNUP_ENTRY_PATH = "/site/create-account";

const SUITE_HOST_PRIMARY = "nltops.com";
const SUITE_HOST_FALLBACK = "ntlops.com";

function isLocalhost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isSuiteOwnedApp(): boolean {
  if (AUTH_APP_MODE === "suite") return true;
  if (AUTH_APP_MODE === "child" || AUTH_APP_MODE === "consumer") return false;

  const host = window.location.hostname.toLowerCase();
  if (
    host === SUITE_HOST_PRIMARY ||
    host.endsWith(`.${SUITE_HOST_PRIMARY}`) ||
    host === SUITE_HOST_FALLBACK ||
    host.endsWith(`.${SUITE_HOST_FALLBACK}`)
  ) {
    return true;
  }

  if (isLocalhost(host)) {
    // In local development, default to suite mode unless a child explicitly points to a Suite URL.
    return !SUITE_EXTERNAL_URL;
  }

  return false;
}

function resolveSuiteBaseUrl(): string {
  if (SUITE_EXTERNAL_URL) return SUITE_EXTERNAL_URL;

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
  if (isSuiteOwnedApp()) {
    return returnTo ? `${APP_LOGIN_ENTRY_PATH}?returnTo=${encodeURIComponent(returnTo)}` : APP_LOGIN_ENTRY_PATH;
  }

  if (!SUITE_EXTERNAL_URL) {
    return `${APP_LOGIN_ENTRY_PATH}?suiteAuthMisconfigured=1`;
  }

  const normalizedReturnPath = normalizeReturnPath(returnTo);
  const suiteBaseUrl = resolveSuiteBaseUrl();

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
  if (isSuiteOwnedApp()) {
    return returnTo ? `${APP_SIGNUP_ENTRY_PATH}?returnTo=${encodeURIComponent(returnTo)}` : APP_SIGNUP_ENTRY_PATH;
  }

  if (!SUITE_EXTERNAL_URL) {
    return `${APP_LOGIN_ENTRY_PATH}?suiteAuthMisconfigured=1`;
  }

  const normalizedReturnPath = normalizeReturnPath(returnTo);
  const suiteBaseUrl = resolveSuiteBaseUrl();

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
  if (isSuiteOwnedApp()) {
    return true;
  }
  return Boolean(SUITE_EXTERNAL_URL);
}

/**
 * Get the Suite domain for redirect purposes.
 */
export function getLoginRedirectUrl(returnTo?: string): string {
  return getSuiteLoginUrl(returnTo);
}
