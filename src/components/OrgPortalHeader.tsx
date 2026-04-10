import { Organization, PortalUser, orgRoleLabels } from "@/types/orgPortal";
import { Badge } from "@/components/ui/badge";
import { Users, LayoutGrid, ShieldCheck } from "lucide-react";

function toCssColor(color?: string, fallback = "#2563eb") {
  if (!color) return fallback;
  if (color.startsWith("#") || color.startsWith("rgb") || color.startsWith("hsl") || color.startsWith("var(")) {
    return color;
  }
  if (/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/.test(color)) {
    return `hsl(${color})`;
  }
  return fallback;
}

function gradientCss(start?: string, end?: string, angle = 135) {
  return `linear-gradient(${Math.max(0, Math.min(angle, 360))}deg, ${toCssColor(start, "#1e293b")}, ${toCssColor(end, "#0ea5e9")})`;
}

interface OrgPortalHeaderProps {
  organization: Organization;
  currentUser?: PortalUser;
  activeProgramsCount: number;
  activeUsersCount: number;
}

export function OrgPortalHeader({
  organization,
  currentUser,
  activeProgramsCount,
  activeUsersCount,
}: OrgPortalHeaderProps) {
  const bannerFallback = gradientCss(
    organization.branding.bannerStartColor || organization.branding.primaryColor,
    organization.branding.bannerEndColor || organization.branding.accentColor,
    organization.branding.gradientAngle ?? 135,
  );
  const backgroundFallback = gradientCss(
    organization.branding.backgroundStartColor || organization.branding.primaryColor,
    organization.branding.backgroundEndColor || organization.branding.accentColor,
    organization.branding.gradientAngle ?? 135,
  );

  return (
    <section
      className="rounded-xl border border-border p-6 md:p-8 backdrop-blur-sm"
      style={{
        backgroundImage: organization.bannerUrl
          ? `linear-gradient(rgba(15, 23, 42, 0.52), rgba(15, 23, 42, 0.52)), url(${organization.bannerUrl})`
          : organization.backgroundUrl
            ? `linear-gradient(rgba(15, 23, 42, 0.32), rgba(15, 23, 42, 0.32)), url(${organization.backgroundUrl})`
            : `${bannerFallback}, ${backgroundFallback}`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-bold text-white"
            style={{
              background: gradientCss(organization.branding.primaryColor, organization.branding.accentColor, organization.branding.gradientAngle ?? 135),
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
                  {orgRoleLabels[currentUser.role] ?? currentUser.role}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {currentUser && (
          <div className="w-full max-w-xs rounded-lg border border-border bg-background/70 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Signed in as</p>
            <p className="text-sm font-semibold text-foreground">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground">{currentUser.email}</p>
          </div>
        )}
      </div>
    </section>
  );
}
