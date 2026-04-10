import { ArrowRight, ExternalLink, LockKeyhole, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { ProgramLogo } from "@/components/ProgramLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppCatalogEntry } from "@/lib/appCatalog";

function accessLabel(accessType: AppCatalogEntry["accessType"]) {
  return accessType === "internal" ? "Internal" : "External";
}

export function AppCard({ app }: { app: AppCatalogEntry }) {
  const statusIcon = app.visibilityStatus === "coming_soon"
    ? <Rocket className="h-3.5 w-3.5" />
    : app.accessType === "internal"
      ? <LockKeyhole className="h-3.5 w-3.5" />
      : <ExternalLink className="h-3.5 w-3.5" />;

  return (
    <article className="group flex h-full flex-col rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5 shadow-[0_16px_50px_rgba(8,15,30,0.3)] transition-transform duration-200 hover:-translate-y-1 hover:border-sky-300/30 hover:bg-slate-950/75">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <ProgramLogo name={app.name} logoUrl={app.logoUrl} accentColor="#7dd3fc" className="h-14 w-14 rounded-2xl border border-white/10 bg-white/5" textClassName="text-lg text-sky-100" />
          <div>
            <h3 className="text-lg font-semibold text-white">{app.name}</h3>
            <p className="text-sm text-slate-400">{app.category}{app.secondaryCategory ? ` / ${app.secondaryCategory}` : ""}</p>
          </div>
        </div>

        <Badge variant="outline" className="border-white/15 bg-white/[0.04] text-slate-200">
          {accessLabel(app.accessType)}
        </Badge>
      </div>

      <p className="mt-5 flex-1 text-sm leading-7 text-slate-300">{app.shortDescription}</p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {statusIcon}
          <span>{app.visibilityStatus === "coming_soon" ? "Coming Soon" : app.requiresSuiteLogin ? "Suite-aware access" : "Direct launch"}</span>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link to={`/apps/${app.slug}`}>
            View Details <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}