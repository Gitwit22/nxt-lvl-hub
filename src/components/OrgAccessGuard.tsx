import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";

/**
 * OrgAccessGuard
 *
 * Wraps /orgs/:orgSlug/* routes and enforces:
 *   1. The org slug resolves to a known organization.
 *   2. The authenticated user is an active member of that org
 *      (platform admins bypass membership check).
 *   3. The org is not suspended or pending.
 *
 * Renders <Outlet /> on success, otherwise shows an appropriate screen.
 * This replaces the access checks that previously lived in OrgPortalLayout.
 */
export function OrgAccessGuard() {
  const { orgSlug = "" } = useParams();
  const { me, isPlatformAdmin } = useAuth();
  const { getOrganizationBySlug, isLoading } = useOrg();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading workspace…
        </div>
      </div>
    );
  }

  const org = getOrganizationBySlug(orgSlug);

  if (!org) {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-xl font-semibold">Workspace Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No organization matches <code className="font-mono">{orgSlug}</code>.
        </p>
      </div>
    );
  }

  if (org.status === "suspended") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Workspace Suspended</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This organization's workspace has been suspended. Contact support for assistance.
          </p>
        </div>
      </div>
    );
  }

  if (org.status === "pending") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Workspace Setup In Progress</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This workspace is being configured. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  // Platform admins bypass membership check
  const userBelongsToOrg =
    isPlatformAdmin ||
    (me?.orgMemberships ?? []).some((m) => m.orgId === org.id && m.active);

  if (!userBelongsToOrg) {
    // If the user has no org at all, send them home rather than showing a wall
    const hasAnyMembership = (me?.orgMemberships ?? []).some((m) => m.active);
    if (!hasAnyMembership) {
      return <Navigate to="/home" replace />;
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You are not a member of this organization.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
