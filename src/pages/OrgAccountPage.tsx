import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { LogOut, Mail, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useOrgPortal } from "@/context/OrgPortalContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordApi, setPasswordApi, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  manager: "Manager",
  staff: "Staff",
  member: "Member",
};

export default function OrgAccountPage() {
  const { orgSlug = "" } = useParams();
  const { me, logout } = useAuth();
  const { getOrganizationBySlug, getOrgCurrentUser } = useOrgPortal();

  const org = getOrganizationBySlug(orgSlug);
  const currentUser = org ? getOrgCurrentUser(org.id) : undefined;

  const displayName = currentUser?.name || me?.email?.split("@")[0] || "User";
  const email = currentUser?.email || me?.email || "";
  const roleLabel = currentUser?.role ? (ROLE_LABELS[currentUser.role] ?? currentUser.role) : "Member";

  const hasPassword = me?.hasPassword ?? true; // default true so existing accounts stay on change flow

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newPassword) return;

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      await setPasswordApi(newPassword);
      toast.success("Password set successfully. You can now sign in with it.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentPassword || !newPassword) return;

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      await changePasswordApi(currentPassword, newPassword);
      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    logout();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">My Account</p>
        <h1 className="text-2xl font-semibold">Account & Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your personal profile and password settings. These apply to your Suite login — not just this portal.
        </p>
      </div>

      {/* Profile */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Profile</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Display Name</Label>
            <p className="text-sm font-medium">{displayName}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Role in this Organization</Label>
            <p className="text-sm font-medium">{roleLabel}</p>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-muted-foreground text-xs flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <p className="text-sm font-medium">{email || "—"}</p>
          </div>
        </div>
      </section>

      {/* Set / Change Password */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">{hasPassword ? "Change Password" : "Set Password"}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {hasPassword
            ? "Update the password you use to sign in to Nxt Lvl Suite."
            : "Your account was created without a local password. Set one here to enable direct sign-in."}
        </p>

        {hasPassword ? (
          <form onSubmit={(e) => void handleChangePassword(e)} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your current password"
              />
            </div>
            <div className="space-y-2">
              <Label>New Password <span className="text-muted-foreground/60 font-normal text-xs">(8+ characters)</span></Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
              >
                {isSaving ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={(e) => void handleSetPassword(e)} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>New Password <span className="text-muted-foreground/60 font-normal text-xs">(8+ characters)</span></Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={isSaving || !newPassword || !confirmPassword}
              >
                {isSaving ? "Setting..." : "Set Password"}
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* Sign Out */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Sign Out</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              End your current session on this device.
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </section>
    </div>
  );
}
