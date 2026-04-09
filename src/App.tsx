import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { OrgPortalProvider } from "@/context/OrgPortalContext";
import { ProgramProvider } from "@/context/ProgramContext";
import { OrgPortalLayout } from "@/components/OrgPortalLayout";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { resolveOrgSlugFromHost } from "@/lib/orgRoutes";
import { useAuth } from "@/context/AuthContext";
import { useOrgPortal } from "@/context/OrgPortalContext";
import HomePage from "@/pages/HomePage";
import ApplicationsPage from "@/pages/ApplicationsPage";
import ProgramDetailPage from "@/pages/ProgramDetailPage";
import AboutPage from "@/pages/AboutPage";
import AdminPage from "@/pages/AdminPage";
import LoginPage from "@/pages/LoginPage";
import OrgLandingPage from "@/pages/OrgLandingPage";
import OrgProgramsPage from "@/pages/OrgProgramsPage";
import OrgUsersPage from "@/pages/OrgUsersPage";
import OrgSettingsPage from "@/pages/OrgSettingsPage";
import AppWorkspacePage from "@/pages/AppWorkspacePage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function RootResolver() {
  const { organizations, isLoading } = useOrgPortal();
  const { isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading workspace...
        </div>
      </div>
    );
  }

  const subdomainOrgSlug = resolveOrgSlugFromHost(window.location.hostname, organizations);

  if (subdomainOrgSlug) {
    return <Navigate to={`/org/${subdomainOrgSlug}`} replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/home" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ProgramProvider>
          <OrgPortalProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<RootResolver />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/applications" element={<ApplicationsPage />} />
                    <Route path="/applications/:id" element={<ProgramDetailPage />} />
                    <Route path="/apps/:appSlug" element={<AppWorkspacePage />} />
                    <Route path="/about" element={<AboutPage />} />

                    <Route element={<ProtectedRoute requirePlatformAdmin />}>
                      <Route path="/admin" element={<Navigate to="/admin/organizations" replace />} />
                      <Route path="/admin/organizations" element={<AdminPage section="organizations" />} />
                      <Route path="/admin/programs" element={<AdminPage section="programs" />} />
                    </Route>
                  </Route>
                </Route>

                <Route element={<ProtectedRoute />}>
                  <Route path="/org/:orgSlug" element={<OrgPortalLayout />}>
                    <Route index element={<OrgLandingPage />} />
                    <Route path="programs" element={<OrgProgramsPage />} />
                    <Route path="users" element={<OrgUsersPage />} />
                    <Route path="settings" element={<OrgSettingsPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </OrgPortalProvider>
        </ProgramProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
