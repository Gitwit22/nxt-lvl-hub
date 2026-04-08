import { FormEvent, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { canManageUsers, useOrgPortal } from "@/context/OrgPortalContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OrgSettingsPage() {
  const { orgSlug = "" } = useParams();
  const {
    getOrganizationBySlug,
    getUsersForOrganization,
    getOrganizationPrograms,
    bundles,
    activeUserByOrg,
    updateOrganization,
  } = useOrgPortal();

  const org = getOrganizationBySlug(orgSlug);
  const users = useMemo(() => (org ? getUsersForOrganization(org.id) : []), [getUsersForOrganization, org]);

  const [name, setName] = useState(org?.name ?? "");
  const [logo, setLogo] = useState(org?.logo ?? "");
  const [supportEmail, setSupportEmail] = useState(org?.supportEmail ?? "");
  const [primaryColor, setPrimaryColor] = useState(org?.branding.primaryColor ?? "");
  const [accentColor, setAccentColor] = useState(org?.branding.accentColor ?? "");

  if (!org) {
    return <p className="text-sm text-muted-foreground">Unknown organization.</p>;
  }

  const currentUser = users.find((user) => user.id === activeUserByOrg[org.id]) ?? users[0];
  const canManage = currentUser ? canManageUsers(currentUser.role) : false;
  const enabledPrograms = getOrganizationPrograms(org);
  const assignedBundles = bundles.filter((bundle) => org.assignedBundleIds.includes(bundle.id));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;

    updateOrganization(org.id, {
      name,
      logo,
      supportEmail,
      branding: {
        primaryColor,
        accentColor,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Organization Configuration</p>
        <h1 className="text-2xl font-semibold">Portal Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage org identity, branding, support details, and enabled programs.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Organization Profile</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} disabled={!canManage} />
          </div>
          <div className="space-y-2">
            <Label>Logo Initials</Label>
            <Input value={logo} onChange={(event) => setLogo(event.target.value)} disabled={!canManage} />
          </div>
          <div className="space-y-2">
            <Label>Support Email</Label>
            <Input value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} disabled={!canManage} />
          </div>
          <div className="space-y-2">
            <Label>Primary Branding Color (HSL)</Label>
            <Input value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} disabled={!canManage} />
          </div>
          <div className="space-y-2">
            <Label>Accent Branding Color (HSL)</Label>
            <Input value={accentColor} onChange={(event) => setAccentColor(event.target.value)} disabled={!canManage} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={!canManage}>Save Settings</Button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Enabled Program Overview</h3>
          <ul className="mt-3 space-y-2">
            {enabledPrograms.map((program) => (
              <li key={program.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>{program.name}</span>
                <span className="text-xs text-muted-foreground">{program.status}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Assigned Bundles</h3>
          <ul className="mt-3 space-y-2">
            {assignedBundles.map((bundle) => (
              <li key={bundle.id} className="rounded-md border border-border px-3 py-2 text-sm">
                <p className="font-medium">{bundle.name}</p>
                <p className="text-xs text-muted-foreground">Programs: {bundle.programIds.length}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {!canManage && (
        <p className="text-xs text-amber-400">
          You are viewing as {currentUser?.role}. Only Super Admin and Org Admin can update organization settings.
        </p>
      )}
    </div>
  );
}
