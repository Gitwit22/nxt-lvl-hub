import { FormEvent, useState } from "react";
import { ShieldAlert, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeForceResetApi, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

/**
 * Full-screen overlay rendered when mustChangePassword === true.
 * Blocks all other app content until the user sets a new password.
 */
export function ForcePasswordChange() {
  const { refreshMe } = useAuth();
  const [currentTemporaryPassword, setCurrentTemporaryPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const isStrongEnough = hasMinLength && hasUpper && hasLower && hasNumber;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentTemporaryPassword) {
      toast.error("Current temporary password is required.");
      return;
    }
    if (!isStrongEnough) {
      toast.error("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      await completeForceResetApi(currentTemporaryPassword, newPassword);
      toast.success("Password updated. Welcome!");
      await refreshMe();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Set Your Password</h2>
            <p className="text-xs text-muted-foreground">You signed in with a temporary password. Choose a new one to continue.</p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Temporary Password</Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={currentTemporaryPassword}
                onChange={(e) => setCurrentTemporaryPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>New Password <span className="text-muted-foreground/60 font-normal text-xs">(8+ chars, upper/lower/number)</span></Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Password strength: {hasMinLength ? "length ok" : "8+ chars"} • {hasUpper ? "uppercase ok" : "needs uppercase"} • {hasLower ? "lowercase ok" : "needs lowercase"} • {hasNumber ? "number ok" : "needs number"}
          </p>

          <Button
            type="submit"
            className="w-full"
            disabled={isSaving || !currentTemporaryPassword || !newPassword || !confirmPassword}
          >
            {isSaving ? "Saving..." : "Set Password & Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
