import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { OrgProvider } from "@/context/OrgContext";
import { ProgramProvider } from "@/context/ProgramContext";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OrgAccessGuard } from "@/components/OrgAccessGuard";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import PublicHomePage from "@/pages/PublicHomePage";
import PublicAppsPage from "@/pages/PublicAppsPage";
import PublicAppDetailPage from "@/pages/PublicAppDetailPage";
import HomePage from "@/pages/HomePage";
import ApplicationsPage from "@/pages/ApplicationsPage";
import ProgramDetailPage from "@/pages/ProgramDetailPage";
import AboutPage from "@/pages/AboutPage";
import AdminPage from "@/pages/AdminPage";
import OrgLandingPage from "@/pages/OrgLandingPage";
import OrgProgramsPage from "@/pages/OrgProgramsPage";
import OrgAccountPage from "@/pages/OrgAccountPage";
import OrgOrganizationPage from "@/pages/OrgOrganizationPage";
import AppWorkspacePage from "@/pages/AppWorkspacePage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function RootResolver() {
  const { isLoading, organizations } = useOrg();
  const { isAuthenticated, isInitializing, isPlatformAdmin, me } = useAuth();

  if (isInitializing || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading workspace...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/site/login" replace />;
  }

  if (isPlatformAdmin) {
    return <Navigate to="/admin/organizations" replace />;
  }

  // Route org members directly to their workspace
  const memberships = me?.orgMemberships ?? [];
  const activeOrg = memberships.find((m) => m.active);
  if (activeOrg) {
    const org = organizations.find((o) => o.id === activeOrg.orgId);
    if (org) {
      return <Navigate to={`/orgs/${org.slug}`} replace />;
    }
  }

  return <Navigate to="/home" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ProgramProvider>
          <OrgProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<PublicHomePage />} />
                <Route path="/site/login" element={<PublicHomePage />} />
                <Route path="/site/create-account" element={<PublicHomePage />} />
                <Route path="/apps" element={<PublicAppsPage />} />
                <Route path="/apps/:appSlug" element={<PublicAppDetailPage />} />
                <Route path="/site/register" element={<Navigate to="/site/create-account" replace />} />
                <Route path="/login" element={<Navigate to="/site/login" replace />} />
                <Route path="/signin" element={<Navigate to="/site/login" replace />} />
                <Route path="/auth/login" element={<Navigate to="/site/login" replace />} />
                <Route path="/auth/register" element={<Navigate to="/site/create-account" replace />} />
                <Route path="/dashboard" element={<RootResolver />} />
                <Route path="/app" element={<RootResolver />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/applications" element={<ApplicationsPage />} />
                    <Route path="/applications/:id" element={<ProgramDetailPage />} />
                    <Route path="/workspace/:appSlug" element={<AppWorkspacePage />} />
                    <Route path="/about" element={<AboutPage />} />

                    {/* Org workspace routes — membership enforced by OrgAccessGuard */}
                    <Route element={<OrgAccessGuard />}>
                      <Route path="/orgs/:orgSlug" element={<OrgLandingPage />} />
                      <Route path="/orgs/:orgSlug/programs" element={<OrgProgramsPage />} />
                      <Route path="/orgs/:orgSlug/account" element={<OrgAccountPage />} />
                      <Route path="/orgs/:orgSlug/organization" element={<OrgOrganizationPage />} />
                    </Route>

                    <Route element={<ProtectedRoute requirePlatformAdmin />}>
                      <Route path="/admin" element={<Navigate to="/admin/organizations" replace />} />
                      <Route path="/admin/organizations" element={<AdminPage section="organizations" />} />
                      <Route path="/admin/programs" element={<AdminPage section="programs" />} />
                      <Route path="/admin/subscriptions" element={<AdminPage section="subscriptions" />} />
                    </Route>
                  </Route>
                </Route>

                {/* Legacy org portal URL redirects */}
                <Route path="/org/:orgSlug" element={<OrgSlugRedirect />} />
                <Route path="/org/:orgSlug/*" element={<OrgSlugRedirect />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </OrgProvider>
        </ProgramProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

function OrgSlugRedirect() {
  // Redirect old /org/:orgSlug paths to new /orgs/:orgSlug
  const path = window.location.pathname.replace(/^\/org\//, "/orgs/");
  return <Navigate to={path} replace />;
}

export default App;
