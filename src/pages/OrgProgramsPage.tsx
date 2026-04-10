import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useOrgPortal } from "@/context/OrgPortalContext";
import { OrgProgramCard } from "@/components/OrgProgramCard";

export default function OrgProgramsPage() {
  const { orgSlug = "" } = useParams();
  const { getOrganizationBySlug, getUsersForOrganization, getOrganizationPrograms, getOrgCurrentUser, getProgramsForUser } = useOrgPortal();

  const org = getOrganizationBySlug(orgSlug);
  const users = useMemo(() => (org ? getUsersForOrganization(org.id) : []), [getUsersForOrganization, org]);

  if (!org) {
    return <p className="text-sm text-muted-foreground">Unknown organization.</p>;
  }

  const currentUser = getOrgCurrentUser(org.id) ?? users.find((user) => user.active) ?? users[0];
  const orgPrograms = getOrganizationPrograms(org);
  const visiblePrograms = currentUser ? getProgramsForUser(org, currentUser.id) : orgPrograms;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Program Launcher</p>
        <h1 className="text-2xl font-semibold">Assigned Platforms</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Showing programs assigned to {currentUser?.name ?? "this organization"}. Staff only sees their assigned apps.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visiblePrograms.map((program) => (
          <OrgProgramCard key={program.id} program={program} orgId={org.id} />
        ))}
      </div>

      {visiblePrograms.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">
          This user currently has no program access. Org admins can assign access in the Users section.
        </div>
      )}
    </div>
  );
}
