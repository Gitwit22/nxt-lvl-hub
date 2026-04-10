import { Badge } from "@/components/ui/badge";
import type { AppCatalogEntry } from "@/lib/appCatalog";
import { AppIdentityMark } from "@/components/public/AppIdentityMark";

function accessLabel(accessType: AppCatalogEntry["accessType"]) {
  return accessType === "internal" ? "Internal" : "External";
}

export function AppDetailHeader({ app }: { app: AppCatalogEntry }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_50px_rgba(8,15,30,0.28)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <AppIdentityMark app={app} className="h-16 w-16" />
          <div className="space-y-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-sky-100/70">App Detail</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{app.name}</h1>
            </div>
            <p className="max-w-3xl text-lg leading-8 text-slate-300">{app.shortDescription}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-white/15 bg-white/[0.04] text-slate-100">{accessLabel(app.accessType)}</Badge>
          <Badge variant="outline" className="border-white/15 bg-white/[0.04] text-slate-100">{app.category}</Badge>
          {app.secondaryCategory ? <Badge variant="outline" className="border-white/15 bg-white/[0.04] text-slate-100">{app.secondaryCategory}</Badge> : null}
          {app.visibilityStatus === "coming_soon" ? <Badge className="bg-amber-500/20 text-amber-100">Coming Soon</Badge> : null}
        </div>
      </div>
    </section>
  );
}