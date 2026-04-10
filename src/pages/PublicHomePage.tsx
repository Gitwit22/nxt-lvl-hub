import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/public/SiteShell";
import { SiteHero } from "@/components/public/SiteHero";
import { AboutSection } from "@/components/public/AboutSection";
import { FeaturedApps } from "@/components/public/FeaturedApps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useOrgPortal } from "@/context/OrgPortalContext";
import { usePrograms } from "@/context/ProgramContext";
import { getErrorMessage } from "@/lib/api";
import { getPublicAppCatalog } from "@/lib/appCatalog";

type AuthMode = "signin" | "signup";

function resolveRedirectPath(
  profile: { isPlatformAdmin: boolean; orgMemberships: Array<{ orgId: string; active: boolean }> },
  getOrganizationById: (orgId: string) => { slug: string } | undefined,
) {
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

function MainPageAuthPanel() {
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

  const authParam = searchParams.get("auth");
  const pathTab: AuthMode | null = location.pathname === "/site/create-account"
    ? "signup"
    : location.pathname === "/site/login"
      ? "signin"
      : null;
  const tab: AuthMode = pathTab ?? (authParam === "signup" ? "signup" : "signin");

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
    const isAuthEntryRoute = Boolean(authParam) || pathTab !== null;
    if (isInitializing || !isAuthenticated || !me || !isAuthEntryRoute) return;
    const destination = returnTo || resolveRedirectPath(me, getOrganizationById);
    navigate(destination, { replace: true });
  }, [authParam, getOrganizationById, isAuthenticated, isInitializing, me, navigate, pathTab, returnTo]);

  const setTab = (nextTab: string) => {
    const params = new URLSearchParams(searchParams);
    const returnToParam = params.get("returnTo");
    const nextPath = nextTab === "signup" ? "/site/create-account" : "/site/login";
    if (returnToParam) {
      navigate(`${nextPath}?returnTo=${encodeURIComponent(returnToParam)}`, { replace: true });
      return;
    }
    navigate(nextPath, { replace: true });
  };

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
    if (tab === "signup") {
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
      const profile = tab === "signin" ? await login(normalizedEmail, password) : await register(normalizedEmail, password);
      const destination = returnTo || resolveRedirectPath(profile, getOrganizationById);
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl rounded-[1.5rem] border border-white/15 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(8,15,30,0.45)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.22em] text-sky-100/80">Nxt Lvl Suites</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{tab === "signin" ? "Sign in" : "Create your account"}</h2>
      <p className="mt-2 text-sm text-slate-300">
        {tab === "signin"
          ? "Authenticate directly with the Suite to access your organization and applications."
          : "Create a Suite account to get access to your organization workspace and assigned programs."}
      </p>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-2 bg-slate-900/80">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Create Account</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
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
                autoComplete={tab === "signin" ? "current-password" : "new-password"}
                className="bg-slate-900/70 text-slate-100"
              />
            </div>
            {tab === "signup" && (
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
            )}
            {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting
                ? tab === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : tab === "signin"
                  ? "Sign In"
                  : "Create Account"}
            </Button>
            {tab === "signup" && (
              <p className="rounded-lg border border-sky-300/20 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-100">
                After your account is created, you can create an organization, launch your organization portal,
                and invite users from your in-suite dashboard.
              </p>
            )}
          </form>
        </TabsContent>
      </Tabs>
    </section>
  );
}

export default function PublicHomePage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { programs } = usePrograms();
  const publicApps = useMemo(() => getPublicAppCatalog(programs), [programs]);
  const featuredApps = publicApps.filter((app) => app.featured).slice(0, 3);
  const showAuthPanel =
    location.pathname === "/site/login" ||
    location.pathname === "/site/create-account" ||
    Boolean(searchParams.get("auth"));

  return (
    <SiteShell>
      <div className="space-y-14">
        {showAuthPanel && <MainPageAuthPanel />}
        <SiteHero />
        <AboutSection />
        <FeaturedApps apps={featuredApps} />

        <section className="flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_50px_rgba(8,15,30,0.28)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-sky-100/70">Explore the full directory</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Browse all available Suite apps and launch destinations</h2>
            <p className="mt-2 max-w-2xl text-base leading-8 text-slate-300">
              Search by app name, filter by access type, and inspect each app before launching it.
            </p>
          </div>

          <Button asChild size="lg">
            <Link to="/apps">
              View Full Directory <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>
    </SiteShell>
  );
}