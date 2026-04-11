import { FormEvent, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { canManageUsers, useOrgPortal } from "@/context/OrgPortalContext";
import { OrgRole, Organization } from "@/types/orgPortal";
import { OrgUserTable } from "@/components/OrgUserTable";
import { TempPasswordModal } from "@/components/TempPasswordModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";

const defaultInviteRole: OrgRole = "staff";

type OrganizationBrandingForm = {
  logo: string;
  logoUrl: string;
  bannerUrl: string;
  supportEmail: string;
  primaryColor: string;
  accentColor: string;
};

type OrganizationSettingsForm = {
  name: string;
  contactEmail: string;
  ownerEmail: string;
  phoneNumber: string;
  seatLimit: number;
};

function UsersTab({ org }: { org: Organization }) {
  const {
    getUsersForOrganization,
    getOrganizationPrograms,
    getOrgCurrentUser,
    inviteUser,
    removeUser,
    resetUserPassword,
    updateUser,
  } = useOrgPortal();

  const users = useMemo(() => getUsersForOrganization(org.id), [getUsersForOrganization, org.id]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>(defaultInviteRole);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [tempPasswordData, setTempPasswordData] = useState<{ password: string; email: string } | null>(null);

  const orgPrograms = getOrganizationPrograms(org);
  const currentUser = getOrgCurrentUser(org.id);
  const canManage = currentUser ? canManageUsers(currentUser.role) : false;

  const submitInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || !name.trim() || !email.trim()) return;

    const normalizedEmail = email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!isValidEmail) {
      toast.error("Enter a valid email address.");
      return;
    }

    const duplicateUser = users.some((user) => user.email.toLowerCase() === normalizedEmail);
    if (duplicateUser) {
      toast.error("A user with that email already exists in this organization.");
      return;
    }

    try {
      const result = await inviteUser({
        orgId: org.id,
        name,
        email: normalizedEmail,
        role,
        assignedProgramIds: selectedProgramIds,
      });

      setName("");
      setEmail("");
      setRole(defaultInviteRole);
      setSelectedProgramIds([]);

      if (result.passwordWasGenerated && result.tempPassword) {
        setTempPasswordData({ password: result.tempPassword, email: normalizedEmail });
      } else {
        toast.success("Existing account added to the organization. Password was not changed.");
      }

      setIsAddUserOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleResetPassword = async (userId: string) => {
    const result = await resetUserPassword(userId);
    setTempPasswordData({
      password: result.tempPassword,
      email: result.email,
    });
  };

  const handleRemoveUser = async (userId: string) => {
    await removeUser(userId);
    toast.success("User removed from organization.");
  };

  const toggleSelectedProgram = (programId: string, checked: boolean) => {
    setSelectedProgramIds((prev) => {
      if (checked) return [...prev, programId];
      return prev.filter((id) => id !== programId);
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Users</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add members, assign role/access, reset passwords, or remove membership.</p>
          </div>
          <Button onClick={() => setIsAddUserOpen(true)} disabled={!canManage}>Add User</Button>
        </div>

        {!canManage && (
          <p className="mt-3 text-xs text-amber-400">
            You are viewing as {currentUser?.role}. Switch to an Org Admin or Super Admin account to invite and manage users.
          </p>
        )}
      </section>

      <section>
        <OrgUserTable
          users={users}
          programs={orgPrograms}
          canManage={canManage}
          onUpdateUser={updateUser}
          onRemoveUser={handleRemoveUser}
          onResetUserPassword={handleResetPassword}
        />
      </section>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitInvite}>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" disabled={!canManage} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="alex@organization.com" disabled={!canManage} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select value={role} onValueChange={(value) => setRole(value as OrgRole)} disabled={!canManage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org_admin">Admin</SelectItem>
                  <SelectItem value="staff">Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Initial Program Access</label>
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

            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!canManage}>Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {tempPasswordData && (
        <TempPasswordModal
          open={true}
          onClose={() => setTempPasswordData(null)}
          tempPassword={tempPasswordData.password}
          userEmail={tempPasswordData.email}
          context="user"
        />
      )}
    </div>
  );
}

function BrandingTab({ org }: { org: Organization }) {
  const { getOrgCurrentUser, updateOrganization } = useOrgPortal();
  const currentUser = getOrgCurrentUser(org.id);
  const canManage = currentUser ? canManageUsers(currentUser.role) : false;

  const [form, setForm] = useState<OrganizationBrandingForm>({
    logo: org.logo,
    logoUrl: org.logoUrl || "",
    bannerUrl: org.bannerUrl || "",
    supportEmail: org.supportEmail,
    primaryColor: org.branding.primaryColor || "",
    accentColor: org.branding.accentColor || "",
  });

  const setField = <K extends keyof OrganizationBrandingForm>(key: K, value: OrganizationBrandingForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!canManage) return;

    try {
      await updateOrganization(org.id, {
        logo: form.logo,
        logoUrl: form.logoUrl,
        bannerUrl: form.bannerUrl,
        supportEmail: form.supportEmail,
        branding: {
          primaryColor: form.primaryColor,
          accentColor: form.accentColor,
        },
      });
      toast.success("Branding saved.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Branding</h2>
        <p className="mt-1 text-sm text-muted-foreground">Update logo, banner, support contact, and brand colors for your portal.</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Logo Initials</Label>
            <Input value={form.logo} onChange={(event) => setField("logo", event.target.value)} disabled={!canManage} />
          </div>
          <div className="space-y-2">
            <Label>Support Email</Label>
            <Input value={form.supportEmail} onChange={(event) => setField("supportEmail", event.target.value)} disabled={!canManage} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Logo URL</Label>
            <Input value={form.logoUrl} onChange={(event) => setField("logoUrl", event.target.value)} placeholder="https://cdn.../logo.png" disabled={!canManage} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Banner URL</Label>
            <Input value={form.bannerUrl} onChange={(event) => setField("bannerUrl", event.target.value)} placeholder="https://cdn.../banner.jpg" disabled={!canManage} />
          </div>
          <div className="space-y-2">
            <Label>Primary Brand Color</Label>
            <Input value={form.primaryColor} onChange={(event) => setField("primaryColor", event.target.value)} placeholder="#2563eb or hsl(...)" disabled={!canManage} />
          </div>
          <div className="space-y-2">
            <Label>Accent Brand Color</Label>
            <Input value={form.accentColor} onChange={(event) => setField("accentColor", event.target.value)} placeholder="#0ea5e9 or hsl(...)" disabled={!canManage} />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={() => void save()} disabled={!canManage}>Save Branding</Button>
        </div>
      </section>
    </div>
  );
}

function SettingsTab({ org }: { org: Organization }) {
  const { getOrgCurrentUser, updateOrganization } = useOrgPortal();
  const currentUser = getOrgCurrentUser(org.id);
  const canManage = currentUser ? canManageUsers(currentUser.role) : false;

  const [form, setForm] = useState<OrganizationSettingsForm>({
    name: org.name,
    contactEmail: org.contactEmail,
    ownerEmail: org.ownerEmail,
    phoneNumber: org.phoneNumber || "",
    seatLimit: org.seatLimit,
  });
  const setField = <K extends keyof OrganizationSettingsForm>(key: K, value: OrganizationSettingsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!canManage) return;

    try {
      await updateOrganization(org.id, {
        name: form.name,
        contactEmail: form.contactEmail,
        ownerEmail: form.ownerEmail,
        phoneNumber: form.phoneNumber,
        seatLimit: Number(form.seatLimit) || 0,
      });
      toast.success("Settings saved.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Organization Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Maintain organization profile and operational details.</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input value={form.name} onChange={(event) => setField("name", event.target.value)} disabled={!canManage} />
          </div>
          <div className="space-y-2">
            <Label>Seat Limit</Label>
            <Input type="number" value={form.seatLimit} onChange={(event) => setField("seatLimit", Number(event.target.value) || 0)} disabled={!canManage} />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input value={form.contactEmail} onChange={(event) => setField("contactEmail", event.target.value)} disabled={!canManage} />
          </div>
          <div className="space-y-2">
            <Label>Owner Email</Label>
            <Input value={form.ownerEmail} onChange={(event) => setField("ownerEmail", event.target.value)} disabled={!canManage} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Phone Number</Label>
            <Input value={form.phoneNumber} onChange={(event) => setField("phoneNumber", event.target.value)} disabled={!canManage} />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={() => void save()} disabled={!canManage}>Save Settings</Button>
        </div>

        {!canManage && (
          <p className="mt-3 text-xs text-amber-400">
            You are viewing as {currentUser?.role}. Only Super Admin and Org Admin can update organization details.
          </p>
        )}
      </section>
    </div>
  );
}

export default function OrgOrganizationPage() {
  const { orgSlug = "" } = useParams();
  const { getOrganizationBySlug } = useOrgPortal();

  const org = getOrganizationBySlug(orgSlug);

  if (!org) {
    return <p className="text-sm text-muted-foreground">Unknown organization.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Organization Portal</p>
        <h1 className="text-2xl font-semibold">Organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage users, branding, and settings for this portal.</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="profile" className="bg-secondary/40 data-[state=active]:bg-secondary">Profile</TabsTrigger>
          <TabsTrigger value="users" className="bg-secondary/40 data-[state=active]:bg-secondary">Users</TabsTrigger>
          <TabsTrigger value="roles" className="bg-secondary/40 data-[state=active]:bg-secondary">Roles</TabsTrigger>
          <TabsTrigger value="program-access" className="bg-secondary/40 data-[state=active]:bg-secondary">Program Access</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <SettingsTab org={org} />
          <BrandingTab org={org} />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersTab org={org} />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Roles</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use the Users table to promote or demote members between admin and member roles.</p>
          </section>
        </TabsContent>

        <TabsContent value="program-access" className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-base font-semibold">Program Access</h2>
            <p className="text-sm text-muted-foreground">
              Assign or remove program access per user from the Users table using the Assign Access action.
            </p>
            <div className="rounded-lg border border-border bg-background/40 p-3 text-sm text-muted-foreground">
              Organization programs currently available: {org.assignedProgramIds.length}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
