import { Organization, PortalUser } from "@/types/orgPortal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, LayoutGrid, ShieldCheck } from "lucide-react";

interface OrgPortalHeaderProps {
  organization: Organization;
  currentUser?: PortalUser;
  selectableUsers: PortalUser[];
  activeProgramsCount: number;
  activeUsersCount: number;
  onChangeActiveUser: (userId: string) => void;
}

export function OrgPortalHeader({
  organization,
  currentUser,
  selectableUsers,
  activeProgramsCount,
  activeUsersCount,
  onChangeActiveUser,
}: OrgPortalHeaderProps) {
  return (
    <section className="rounded-xl border border-border bg-card/80 p-6 md:p-8 backdrop-blur-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-bold text-white"
            style={{
              background: `linear-gradient(135deg, hsl(${organization.branding.primaryColor}), hsl(${organization.branding.accentColor}))`,
            }}
          >
            {organization.logo}
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Organization Portal</p>
            <h1 className="text-2xl font-semibold text-foreground">{organization.name}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{organization.welcomeMessage}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="secondary" className="gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                {activeProgramsCount} active programs
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {activeUsersCount} active users
              </Badge>
              {currentUser && (
                <Badge variant="outline" className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {currentUser.role}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="w-full max-w-xs rounded-lg border border-border bg-background/70 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Viewing Portal As</p>
          <Select value={currentUser?.id} onValueChange={onChangeActiveUser}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {selectableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
