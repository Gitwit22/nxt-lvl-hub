import { Building2, Home, Info, LayoutGrid, LogOut, Users, CreditCard, Briefcase, ChevronRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { getOrgBasePath } from "@/lib/orgRoutes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const { isPlatformAdmin, logout, me } = useAuth();
  const { organizations } = useOrg();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  const navItems = [
    { title: "Home", url: "/home", icon: Home },
    { title: "Applications", url: "/applications", icon: LayoutGrid },
    ...(isPlatformAdmin
      ? [
          { title: "Organizations", url: "/admin/organizations", icon: Users },
          { title: "Program Control", url: "/admin/programs", icon: Building2 },
          { title: "Subscriptions", url: "/admin/subscriptions", icon: CreditCard },
        ]
      : []),
    { title: "About", url: "/about", icon: Info },
  ];

  // Build list of orgs the current user is an active member of
  const memberships = me?.orgMemberships ?? [];
  const myOrgs = organizations.filter((org) =>
    isPlatformAdmin || memberships.some((m) => m.orgId === org.id && m.active),
  );

  const handleLogout = async () => {
    navigate("/", { replace: true });

    try {
      await logout();
      toast.success("Logged out successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="knurled">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded metal-raised flex items-center justify-center text-primary font-mono font-bold text-sm shrink-0">
            N
          </div>
          {!collapsed && (
            <span className="font-mono font-semibold text-foreground text-xs tracking-wider uppercase">
              NXT LVL
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="stamped-label text-[9px]">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={false}
                      className="hover:bg-sidebar-accent/50 font-mono text-xs tracking-wide"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {myOrgs.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="stamped-label text-[9px]">
              {collapsed ? "" : "My Organizations"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {myOrgs.map((org) => (
                  <SidebarMenuItem key={org.id}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={getOrgBasePath(org.slug)}
                        end={false}
                        className="hover:bg-sidebar-accent/50 font-mono text-xs tracking-wide"
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                      >
                        {org.logoUrl ? (
                          <img src={org.logoUrl} alt={org.name} className="mr-2 h-4 w-4 rounded object-cover shrink-0" />
                        ) : (
                          <Briefcase className="mr-2 h-4 w-4 shrink-0" />
                        )}
                        {!collapsed && (
                          <span className="truncate flex-1">{org.portalTitle || org.name}</span>
                        )}
                        {!collapsed && <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground/50" />}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/70 knurled mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => void handleLogout()} className="hover:bg-sidebar-accent/50 font-mono text-xs tracking-wide text-destructive hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
