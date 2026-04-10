import type { AppCatalogEntry } from "@/lib/appCatalog";
import { AppGrid } from "@/components/public/AppGrid";

export function FeaturedApps({ apps }: { apps: AppCatalogEntry[] }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-sky-100/70">Featured Apps</p>
          <h2 className="text-2xl font-semibold text-white">Highlighted apps from the Suite catalog</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-slate-400">
          A focused set of featured apps gives visitors a quick view of the kinds of platforms available across the Suite.
        </p>
      </div>

      <AppGrid apps={apps} />
    </section>
  );
}