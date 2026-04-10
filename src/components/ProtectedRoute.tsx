import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useOrgPortal } from "@/context/OrgPortalContext";
import { getOrganizationSlugFromHost, SUITE_DOMAIN } from "@/lib/orgRoutes";

interface ProtectedRouteProps {
  requirePlatformAdmin?: boolean;
}

export function ProtectedRoute({ requirePlatformAdmin = false }: ProtectedRouteProps) {
  const { isInitializing, isAuthenticated, isPlatformAdmin, me } = useAuth();
  const { organizations } = useOrgPortal();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const portalSlug = getOrganizationSlugFromHost(window.location.hostname);
    if (portalSlug) {
      const returnTo = encodeURIComponent(window.location.href);
      window.location.assign(`https://${SUITE_DOMAIN}/login?returnTo=${returnTo}`);
      return null;
    }

    return <Navigate to="/site/login" state={{ from: location }} replace />;
  }

  if (requirePlatformAdmin && !isPlatformAdmin) {
    const primaryOrgId = me?.orgMemberships[0]?.orgId;
    const organization = organizations.find((candidate) => candidate.id === primaryOrgId);

    if (organization?.slug) {
      return <Navigate to={`/org/${organization.slug}`} replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
