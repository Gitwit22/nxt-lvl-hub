import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SiteShell } from "@/components/public/SiteShell";
import { AppDetailHeader } from "@/components/public/AppDetailHeader";
import { AppLaunchPanel } from "@/components/public/AppLaunchPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePrograms } from "@/context/ProgramContext";
import { findPublicAppBySlug } from "@/lib/appCatalog";

export default function PublicAppDetailPage() {
  const { appSlug = "" } = useParams();
  const { programs } = usePrograms();
  const app = useMemo(() => findPublicAppBySlug(programs, appSlug), [appSlug, programs]);

  if (!app) {
    return <Navigate to="/apps" replace />;
  }

  return (
    <SiteShell>
      <div className="space-y-8">
        <div>
          <Button asChild variant="ghost">
            <Link to="/apps">Back to Apps</Link>
          </Button>
        </div>

        <AppDetailHeader app={app} />

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_50px_rgba(8,15,30,0.28)] backdrop-blur-xl sm:p-8">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-sky-100/70">Overview</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">What this app does</h2>
              <p className="mt-4 text-base leading-8 text-slate-300">{app.longDescription}</p>
            </div>

            {app.tags && app.tags.length > 0 ? (
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-sky-100/70">Tags</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {app.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-white/15 bg-white/[0.04] text-slate-100">{tag}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_50px_rgba(8,15,30,0.28)] backdrop-blur-xl sm:p-8">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-sky-100/70">App Facts</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-slate-500">Access Type</p>
                  <p className="mt-1 font-medium text-white">{app.accessType === "internal" ? "Internal app requiring Suite-aware access" : "External app launching directly"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-slate-500">Category</p>
                  <p className="mt-1 font-medium text-white">{app.category}{app.secondaryCategory ? ` / ${app.secondaryCategory}` : ""}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-slate-500">Support</p>
                  <p className="mt-1 font-medium text-white">{app.supportContact || "support@ntlops.com"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <AppLaunchPanel app={app} />
      </div>
    </SiteShell>
  );
}