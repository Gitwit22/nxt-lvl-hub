import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  requirePlatformAdmin?: boolean;
}

export function ProtectedRoute({ requirePlatformAdmin = false }: ProtectedRouteProps) {
  const { isInitializing, isAuthenticated, isPlatformAdmin } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requirePlatformAdmin && !isPlatformAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Platform admin access is required to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
