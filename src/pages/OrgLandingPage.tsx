import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { MessageSquareText, PhoneCall, Sparkles } from "lucide-react";
import { useOrgPortal } from "@/context/OrgPortalContext";
import { OrgPortalHeader } from "@/components/OrgPortalHeader";
import { OrgProgramCard } from "@/components/OrgProgramCard";

export default function OrgLandingPage() {
  const { orgSlug = "" } = useParams();
  const {
    getOrganizationBySlug,
    getUsersForOrganization,
    getOrganizationPrograms,
    getProgramsForUser,
    getOrgCurrentUser,
  } = useOrgPortal();

  const org = getOrganizationBySlug(orgSlug);
  const users = useMemo(() => (org ? getUsersForOrganization(org.id) : []), [getUsersForOrganization, org]);

  if (!org) {
    return <p className="text-sm text-muted-foreground">Unknown organization.</p>;
  }

  const orgPrograms = getOrganizationPrograms(org);
  const activeUsers = users.filter((user) => user.active);
  const currentUser = getOrgCurrentUser(org.id) ?? users.find((user) => user.active) ?? users[0];
  const visiblePrograms = currentUser ? getProgramsForUser(org, currentUser.id) : orgPrograms;

  return (
    <div className="space-y-6">
      <OrgPortalHeader
        organization={org}
        currentUser={currentUser}
        activeProgramsCount={orgPrograms.length}
        activeUsersCount={activeUsers.length}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Quick Stats</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Assigned Programs</span>
              <span className="font-semibold">{orgPrograms.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total Users</span>
              <span className="font-semibold">{users.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Current User Access</span>
              <span className="font-semibold">{visiblePrograms.length}</span>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" />
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Announcements</p>
          </div>
          <div className="space-y-3">
            {org.announcements.map((announcement) => (
              <div key={announcement.id} className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-sm font-medium">{announcement.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{announcement.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{announcement.createdAt}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assigned Programs</p>
            <h3 className="text-lg font-semibold">Your Program Launcher</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {currentUser?.role ?? "No Role"} view
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visiblePrograms.map((program) => (
            <OrgProgramCard key={program.id} program={program} />
          ))}
          {visiblePrograms.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No programs are assigned to this user yet.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <PhoneCall className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Support</p>
            <p className="text-sm">Need access adjustments or launch support? Contact {org.supportContactName} at {org.supportEmail}.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
