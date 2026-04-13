import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const { login, isAuthenticated, isPlatformAdmin, isInitializing } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated as admin, send straight to programs
  if (!isInitializing && isAuthenticated && isPlatformAdmin) {
    navigate("/admin/programs", { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const profile = await login(email.trim(), password);
      if (!profile.isPlatformAdmin) {
        setError("Access denied. This area is restricted to platform admins.");
        return;
      }
      navigate("/admin/programs", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#08111f_0%,_#0f172a_100%)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900">
            <ShieldCheck className="h-6 w-6 text-sky-400" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Nxt Lvl Suites</p>
          <h1 className="text-xl font-semibold text-white">Admin Access</h1>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs text-slate-300">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              placeholder="admin@ntlops.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs text-slate-300">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-white/10 bg-white/5 pr-10 text-white placeholder:text-slate-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
