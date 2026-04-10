import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function BrandMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-slate-950 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(15,23,42,0.35)]">
      <img src="/logo.png" alt="Nxt Lvl logo" className="h-full w-full object-cover" />
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_34%),linear-gradient(180deg,_#08111f_0%,_#0b1324_42%,_#0f172a_100%)] text-foreground">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:36px_36px] opacity-30" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-40 py-4">
          <div className="rounded-3xl border border-white/10 bg-slate-950/75 px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:px-5">
            <div className="flex items-center justify-between gap-4">
              <Link to="/" className="flex items-center gap-3">
                <BrandMark />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200/70">Nxt Lvl Technology Solutions</p>
                  <p className="text-base font-semibold text-white">Nxt Lvl Suites</p>
                </div>
              </Link>

              <div className="hidden items-center gap-1 md:flex">
                {[
                  { to: "/", label: "Home" },
                  { to: "/apps", label: "Apps" },
                ].map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "rounded-full px-4 py-2 text-sm text-slate-300 transition-colors hover:text-white",
                        isActive && "bg-white/10 text-white",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button asChild>
                  <Link to="/site/login?returnTo=%2F">
                    <LogIn className="h-4 w-4" /> Sign In
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 md:hidden">
              {[
                { to: "/", label: "Home" },
                { to: "/apps", label: "Apps" },
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300 transition-colors hover:text-white",
                      isActive && "bg-white/10 text-white",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 py-8 sm:py-10">{children}</main>

        <footer className="border-t border-white/10 py-8 text-sm text-slate-400">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-200">Nxt Lvl Technology Solutions</p>
              <p>© {new Date().getFullYear()} Nxt Lvl Suites. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-4">
              <a href="mailto:support@ntlops.com" className="hover:text-white">Support / Contact</a>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-sky-100/80">
                <ShieldCheck className="h-3.5 w-3.5" /> Public access with flexible Suite launch controls
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}