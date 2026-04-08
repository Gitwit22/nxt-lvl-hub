import { FormEvent, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { canManageUsers, useOrgPortal } from "@/context/OrgPortalContext";
import { OrgRole } from "@/types/orgPortal";
import { OrgUserTable } from "@/components/OrgUserTable";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const defaultInviteRole: OrgRole = "Staff";

export default function OrgUsersPage() {
  const { orgSlug = "" } = useParams();
  const {
    getOrganizationBySlug,
    getUsersForOrganization,
    getOrganizationPrograms,
    activeUserByOrg,
    inviteUser,
    updateUser,
  } = useOrgPortal();

  const org = getOrganizationBySlug(orgSlug);
  const users = useMemo(() => (org ? getUsersForOrganization(org.id) : []), [getUsersForOrganization, org]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>(defaultInviteRole);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);

  if (!org) {
    return <p className="text-sm text-muted-foreground">Unknown organization.</p>;
  }

  const orgPrograms = getOrganizationPrograms(org);
  const currentUser = users.find((user) => user.id === activeUserByOrg[org.id]) ?? users[0];
  const canManage = currentUser ? canManageUsers(currentUser.role) : false;

  const submitInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || !name.trim() || !email.trim()) return;

    inviteUser({
      orgId: org.id,
      name,
      email,
      role,
      assignedProgramIds: selectedProgramIds,
    });

    setName("");
    setEmail("");
    setRole(defaultInviteRole);
    setSelectedProgramIds([]);
  };

  const toggleSelectedProgram = (programId: string, checked: boolean) => {
    setSelectedProgramIds((prev) => {
      if (checked) return [...prev, programId];
      return prev.filter((id) => id !== programId);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Organization Access</p>
        <h1 className="text-2xl font-semibold">Users & Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage organization users once, then assign program-level access across Nxt Lvl Suite.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Invite User</h2>
        <p className="mt-1 text-sm text-muted-foreground">Org Admin and Super Admin can invite users and assign initial program access.</p>

        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submitInvite}>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Full name</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" disabled={!canManage} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="alex@organization.com" disabled={!canManage} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Org Role</label>
            <Select value={role} onValueChange={(value) => setRole(value as OrgRole)} disabled={!canManage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Super Admin">Super Admin</SelectItem>
                <SelectItem value="Org Admin">Org Admin</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Program Access</label>
            <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
              {orgPrograms.map((program) => {
                const checked = selectedProgramIds.includes(program.id);
                return (
                  <label key={program.id} className="flex items-center gap-2">
                    <Checkbox checked={checked} onCheckedChange={(state) => toggleSelectedProgram(program.id, Boolean(state))} disabled={!canManage} />
                    <span className="text-sm">{program.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={!canManage}>Send Invite</Button>
          </div>
        </form>

        {!canManage && (
          <p className="mt-3 text-xs text-amber-400">
            You are viewing as {currentUser?.role}. Switch to an Org Admin or Super Admin in the Overview page to manage users.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Access Model</h2>
        <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <p>1. The organization is assigned programs and bundles at the suite level.</p>
          <p>2. Users belong to the organization and receive org-level roles.</p>
          <p>3. Users do not automatically get every program.</p>
          <p>4. Org Admin and Super Admin assign program access per user.</p>
        </div>
      </section>

      <section>
        <OrgUserTable users={users} programs={orgPrograms} canManage={canManage} onUpdateUser={updateUser} />
      </section>
    </div>
  );
}
