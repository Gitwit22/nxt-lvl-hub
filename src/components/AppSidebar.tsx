import { Building2, Home, Info, LayoutGrid, Users } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/context/AuthContext";
import {
  Sidebar,
  SidebarContent,
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
  const { isPlatformAdmin } = useAuth();
  const collapsed = state === "collapsed";
  const navItems = [
    { title: "Home", url: "/home", icon: Home },
    { title: "Applications", url: "/applications", icon: LayoutGrid },
    ...(isPlatformAdmin
      ? [
          { title: "Organizations", url: "/admin/organizations", icon: Users },
          { title: "Program Control", url: "/admin/programs", icon: Building2 },
        ]
      : []),
    { title: "About", url: "/about", icon: Info },
  ];

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
      </SidebarContent>
    </Sidebar>
  );
}
