import { useMemo, useState } from "react";
import { SiteShell } from "@/components/public/SiteShell";
import { AppFilters } from "@/components/public/AppFilters";
import { AppGrid } from "@/components/public/AppGrid";
import { usePrograms } from "@/context/ProgramContext";
import { getPublicAppCatalog } from "@/lib/appCatalog";

export default function PublicAppsPage() {
  const { programs } = usePrograms();
  const apps = useMemo(() => getPublicAppCatalog(programs), [programs]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => [...new Set(apps.map((app) => app.category))].sort((left, right) => left.localeCompare(right)),
    [apps],
  );

  const filteredApps = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return apps.filter((app) => {
      const matchesSearch = !searchValue || app.name.toLowerCase().includes(searchValue);
      const matchesCategory = category === "all" || app.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [apps, category, search]);

  return (
    <SiteShell>
      <div className="space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_50px_rgba(8,15,30,0.28)] backdrop-blur-xl sm:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-sky-100/70">Apps Directory</p>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Browse available apps and programs</h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-300">
            Public and active apps appear here. Internal apps can still require Suite sign-in before launch, while external apps go directly to their own destinations.
          </p>
        </section>

        <AppFilters
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          categories={categories}
        />

        {filteredApps.length > 0 ? (
          <AppGrid apps={filteredApps} />
        ) : (
          <section className="rounded-[2rem] border border-dashed border-white/15 bg-slate-950/50 p-10 text-center">
            <p className="text-lg font-medium text-white">No apps match the current filters.</p>
            <p className="mt-2 text-sm text-slate-400">Adjust the search or category and try again.</p>
          </section>
        )}
      </div>
    </SiteShell>
  );
}