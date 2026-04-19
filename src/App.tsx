import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProgramProvider } from "@/context/ProgramContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import PublicHomePage from "@/pages/PublicHomePage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminProgramsPage from "@/pages/AdminProgramsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ProgramProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* ── Public showcase ─────────────────────────────────── */}
              <Route path="/" element={<PublicHomePage />} />

              {/* ── Admin auth + protected program management ───────── */}
              <Route path="/admin" element={<AdminLoginPage />} />
              <Route element={<ProtectedRoute requirePlatformAdmin />}>
                <Route path="/admin/programs" element={<AdminProgramsPage />} />
                <Route path="/admin/organizations" element={<Navigate to="/admin/programs" replace />} />
                <Route path="/admin/subscriptions" element={<Navigate to="/admin/programs" replace />} />
              </Route>

              {/* ── Legacy URL redirects ─────────────────────────────── */}
              <Route path="/site/login" element={<Navigate to="/" replace />} />
              <Route path="/site/create-account" element={<Navigate to="/" replace />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/signin" element={<Navigate to="/" replace />} />
              <Route path="/apps" element={<Navigate to="/" replace />} />
              <Route path="/apps/:appSlug" element={<Navigate to="/" replace />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/app" element={<Navigate to="/" replace />} />
              <Route path="/orgs/:orgSlug" element={<Navigate to="/" replace />} />
              <Route path="/orgs/:orgSlug/*" element={<Navigate to="/" replace />} />
              <Route path="/org/:orgSlug" element={<Navigate to="/" replace />} />
              <Route path="/org/:orgSlug/*" element={<Navigate to="/" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ProgramProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
