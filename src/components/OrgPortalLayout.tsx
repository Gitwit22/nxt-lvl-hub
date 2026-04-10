import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { Building2, Grid2X2, LayoutGrid, LogOut, Settings, Users } from "lucide-react";
import { useOrgPortal, canManageUsers } from "@/context/OrgPortalContext";
import { getOrgBasePath, getOrgProgramsPath, getOrgSettingsPath, getOrgUsersPath } from "@/lib/orgRoutes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { PortalBrandProvider } from "@/components/PortalBrandProvider";

function LinkItem({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <NavLink
      to={to}
      end={to.includes("/programs") ? false : true}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          isActive && "bg-secondary text-foreground",
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

export function OrgPortalLayout() {
  const { orgSlug = "" } = useParams();
  const navigate = useNavigate();
  const { logout, me } = useAuth();
  const { getOrganizationBySlug, getOrgCurrentUser } = useOrgPortal();

  const org = getOrganizationBySlug(orgSlug);

  if (!org) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <h1 className="text-xl font-semibold">Portal Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This portal URL does not match any configured organization.</p>
      </div>
    );
  }

  // Phase 10 — Portal status screens
  if (org.status === "suspended") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive text-2xl font-bold">!</div>
          <h1 className="text-xl font-semibold">Portal Temporarily Disabled</h1>
          <p className="mt-2 text-sm text-muted-foreground">This organization's portal has been suspended. Please contact support for assistance.</p>
        </div>
      </div>
    );
  }

  if (org.status === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500 text-2xl">⏳</div>
          <h1 className="text-xl font-semibold">Portal Setup In Progress</h1>
          <p className="mt-2 text-sm text-muted-foreground">This portal is being configured. Check back soon.</p>
        </div>
      </div>
    );
  }

  // Phase 16 — Org isolation: user must belong to this org (platform admins bypass)
  const isPlatformAdmin = me?.isPlatformAdmin ?? false;
  const userBelongsToOrg =
    isPlatformAdmin ||
    (me?.orgMemberships ?? []).some((m) => m.orgId === org.id && m.active);

  if (!userBelongsToOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">You do not have access to this organization's portal.</p>
        </div>
      </div>
    );
  }

  const currentUser = getOrgCurrentUser(org.id);
  const adminView = currentUser ? canManageUsers(currentUser.role) : false;

  const navItems = [
    { to: getOrgBasePath(org.slug), icon: Grid2X2, label: "Overview", show: true },
    { to: getOrgProgramsPath(org.slug), icon: LayoutGrid, label: "Programs", show: true },
    { to: getOrgUsersPath(org.slug), icon: Users, label: "Users", show: adminView },
    { to: getOrgSettingsPath(org.slug), icon: Settings, label: "Settings", show: adminView },
  ].filter((item) => item.show);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
      toast.success("Logged out successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const portalTitle = org.portalTitle || org.name;

  return (
    <PortalBrandProvider organization={org}>
      <div className="min-h-screen bg-background">
        <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 lg:grid-cols-[260px_1fr]">
          <aside className="border-r border-border bg-card/60 p-4 flex flex-col">
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3">
              {org.logoUrl ? (
                <img src={org.logoUrl} alt={org.name} className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary font-semibold text-sm">
                  {org.logo || <Building2 className="h-4 w-4" />}
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Organization Portal</p>
                <p className="text-sm font-semibold truncate max-w-[160px]">{portalTitle}</p>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => (
                <LinkItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
              ))}
            </nav>

            <Button variant="outline" className="mt-auto justify-start" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </aside>

          <section className="flex min-w-0 flex-col">
            <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-5 py-3 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Client Workspace</p>
                  <h2 className="text-sm font-medium text-foreground">{org.name}</h2>
                </div>
                <p className="text-xs text-muted-foreground">Support: {org.supportEmail}</p>
              </div>
            </header>
            <main className="flex-1 p-5 md:p-7">
              <Outlet />
            </main>
          </section>
        </div>
      </div>
    </PortalBrandProvider>
  );
}
