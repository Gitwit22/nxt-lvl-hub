import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { SiteShell } from "@/components/public/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useOrgPortal } from "@/context/OrgPortalContext";
import { getErrorMessage } from "@/lib/api";

type AuthMode = "signin" | "signup";

function resolveRedirectPath(
  profile: { isPlatformAdmin: boolean; orgMemberships: Array<{ orgId: string; active: boolean }> },
  getOrganizationById: (orgId: string) => { slug: string } | undefined,
): string {
  if (profile.isPlatformAdmin) {
    return "/admin/organizations";
  }

  const primaryMembership = profile.orgMemberships.find((membership) => membership.active);
  if (primaryMembership) {
    const org = getOrganizationById(primaryMembership.orgId);
    if (org?.slug) {
      return `/org/${org.slug}`;
    }
  }

  return "/home";
}

function SuiteAuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isInitializing, me, login, register } = useAuth();
  const { getOrganizationById } = useOrgPortal();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const returnTo = useMemo(() => {
    const explicitReturnTo = searchParams.get("returnTo");
    if (explicitReturnTo?.startsWith("/") && explicitReturnTo !== "/") {
      return explicitReturnTo;
    }

    const stateFrom = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
    if (stateFrom?.pathname && stateFrom.pathname !== "/") {
      return `${stateFrom.pathname}${stateFrom.search || ""}${stateFrom.hash || ""}`;
    }

    return "";
  }, [location.state, searchParams]);

  useEffect(() => {
    if (isInitializing || !isAuthenticated || !me) return;
    const destination = returnTo || resolveRedirectPath(me, getOrganizationById);
    navigate(destination, { replace: true });
  }, [getOrganizationById, isAuthenticated, isInitializing, me, navigate, returnTo]);

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage("Email is required.");
      return;
    }

    if (!password) {
      setErrorMessage("Password is required.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 8) {
        setErrorMessage("Password must be at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const profile =
        mode === "signin"
          ? await login(normalizedEmail, password)
          : await register(normalizedEmail, password);

      const destination = returnTo || resolveRedirectPath(profile, getOrganizationById);
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTab = mode;

  if (isInitializing || isAuthenticated) {
    return null;
  }

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-[1.75rem] border border-white/15 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(8,15,30,0.45)] backdrop-blur-xl sm:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-sky-100/80">Nxt Lvl Suites</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {mode === "signin"
              ? "Authenticate directly with the Suite to access your organization and applications."
              : "Create a Suite account to get access to your organization workspace and assigned programs."}
          </p>

          <Tabs value={activeTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-2 bg-slate-900/80">
              <TabsTrigger value="signin" asChild>
                <Link to="/site/login">Sign In</Link>
              </TabsTrigger>
              <TabsTrigger value="signup" asChild>
                <Link to="/site/create-account">Create Account</Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <form onSubmit={submitAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@organization.com"
                    autoComplete="email"
                    className="bg-slate-900/70 text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="bg-slate-900/70 text-slate-100"
                  />
                </div>

                {mode === "signup" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-slate-200">Confirm Password</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        className="bg-slate-900/70 text-slate-100"
                      />
                    </div>
                  </>
                )}

                {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting
                    ? mode === "signin"
                      ? "Signing in..."
                      : "Creating account..."
                    : mode === "signin"
                      ? "Sign In"
                      : "Create Account"}
                </Button>

                {mode === "signup" && (
                  <p className="rounded-lg border border-sky-300/20 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-100">
                    After your account is created, you can create an organization, launch your organization portal,
                    and invite users from your in-suite dashboard.
                  </p>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SiteShell>
  );
}

export default function LoginPage() {
  return <SuiteAuthPage mode="signin" />;
}

export function CreateAccountPage() {
  return <SuiteAuthPage mode="signup" />;
}
