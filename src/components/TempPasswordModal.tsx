import { useState } from "react";
import { Check, Copy, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TempPasswordModalProps {
  open: boolean;
  onClose: () => void;
  tempPassword: string;
  userEmail: string;
  context?: "user" | "org"; // "user" = added to org, "org" = org created with owner
}

export function TempPasswordModal({ open, onClose, tempPassword, userEmail, context = "user" }: TempPasswordModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            {context === "org" ? "Organization Created" : "User Added"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A temporary password has been generated for <span className="font-medium text-foreground">{userEmail}</span>.
            Share it securely — it will not be shown again.
          </p>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-amber-400 font-medium">Temporary Password</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-secondary px-3 py-2 text-sm font-mono tracking-widest select-all">
                {tempPassword}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <ul className="space-y-1 text-xs text-muted-foreground">
            <li className="flex items-start gap-1.5"><span className="mt-0.5 text-amber-400">•</span> Share this password through a secure channel (not email if possible).</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 text-amber-400">•</span> The user will be required to set a new password on first login.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 text-amber-400">•</span> This password will not be stored or recoverable after you close this dialog.</li>
          </ul>

          <div className="flex justify-end">
            <Button onClick={onClose}>
              <X className="h-3.5 w-3.5 mr-1" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
