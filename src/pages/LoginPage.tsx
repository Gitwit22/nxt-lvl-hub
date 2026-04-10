import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getSuiteLoginUrl } from "@/lib/suiteLogin";

/**
 * LoginPage
 *
 * For nxt-lvl-suites (platform_only auth mode):
 * - Immediately redirects to Suite login
 * - No local login form is shown
 *
 * If the app is ever changed to hybrid/local_only mode,
 * the form logic below can be uncommented,but redirecting to Suite
 * is the correct behavior for platform_only apps.
 */
export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";
  const hasSuiteAuthError = searchParams.get("suiteAuthError") === "1";
  const isMisconfigured = searchParams.get("suiteAuthMisconfigured") === "1";

  useEffect(() => {
    // If already authenticated, redirect to home
    if (isAuthenticated) {
      navigate("/home", { replace: true });
      return;
    }

    if (hasSuiteAuthError || isMisconfigured) {
      return;
    }

    // For platform_only auth, redirect to Suite login
    // This is the only auth method supported for nxt-lvl-suites
    const suiteLoginUrl = getSuiteLoginUrl(returnTo);

    // Guard against same-page redirect loop/no-op blink.
    if (suiteLoginUrl === window.location.href) {
      navigate("/site/login?suiteAuthMisconfigured=1", { replace: true });
      return;
    }

    window.location.href = suiteLoginUrl;
  }, [hasSuiteAuthError, isAuthenticated, isMisconfigured, navigate, returnTo]);

  if (hasSuiteAuthError || isMisconfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">Suite Login Route Needs Configuration</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The app could not resolve a valid external Suite login destination.
            Set VITE_SUITE_URL and optionally VITE_SUITE_LOGIN_PATH.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Current path: /site/login</p>
        </div>
      </div>
    );
  }

  // Show a loading message while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-muted-foreground">Redirecting to Suite login...</p>
      </div>
    </div>
  );
}
