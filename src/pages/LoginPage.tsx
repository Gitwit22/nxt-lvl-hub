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

  useEffect(() => {
    // If already authenticated, redirect to home
    if (isAuthenticated) {
      navigate("/home", { replace: true });
      return;
    }

    // For platform_only auth, redirect to Suite login
    // This is the only auth method supported for nxt-lvl-suites
    const suiteLoginUrl = getSuiteLoginUrl(returnTo);
    window.location.href = suiteLoginUrl;
  }, [isAuthenticated, navigate, returnTo]);

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
