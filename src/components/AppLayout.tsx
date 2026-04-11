import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ForcePasswordChange } from "@/components/ForcePasswordChange";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const { isPlatformAdmin, bootstrapAdmin, mustChangePassword } = useAuth();

  if (mustChangePassword) {
    return <ForcePasswordChange />;
  }
  const [isClaimingAdmin, setIsClaimingAdmin] = useState(false);

  const handleClaimAdmin = async () => {
    const setupToken = window.prompt("Enter platform setup token");
    if (!setupToken || !setupToken.trim()) return;

    setIsClaimingAdmin(true);
    try {
      await bootstrapAdmin(setupToken.trim());
      toast.success("Platform admin access granted.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsClaimingAdmin(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4 shrink-0 sticky top-0 z-30 metal-raised rounded-none">
            <SidebarTrigger className="mr-4" />
            <span className="stamped-label text-[10px]">Nxt Lvl Suites — Control Panel</span>
            <div className="ml-auto">
              {!isPlatformAdmin && (
                <Button size="sm" variant="outline" onClick={handleClaimAdmin} disabled={isClaimingAdmin}>
                  {isClaimingAdmin ? "Claiming..." : "Claim Platform Admin"}
                </Button>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children ?? <Outlet />}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
