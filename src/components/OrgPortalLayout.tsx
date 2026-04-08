import { NavLink, Outlet, useParams } from "react-router-dom";
import { Building2, Grid2X2, LayoutGrid, Settings, Users } from "lucide-react";
import { useOrgPortal, canManageUsers } from "@/context/OrgPortalContext";
import { getOrgBasePath, getOrgProgramsPath, getOrgSettingsPath, getOrgUsersPath } from "@/lib/orgRoutes";
import { cn } from "@/lib/utils";

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
  const { getOrganizationBySlug, getOrgCurrentUser } = useOrgPortal();

  const org = getOrganizationBySlug(orgSlug);
  if (!org) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <h1 className="text-xl font-semibold">Organization not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This portal URL does not match any configured organization.</p>
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-border bg-card/60 p-4">
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Nxt Lvl Suite</p>
              <p className="text-sm font-semibold">Organization Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <LinkItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
            ))}
          </nav>
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
  );
}
