import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/public/SiteShell";
import { SiteHero } from "@/components/public/SiteHero";
import { AboutSection } from "@/components/public/AboutSection";
import { FeaturedApps } from "@/components/public/FeaturedApps";
import { Button } from "@/components/ui/button";
import { usePrograms } from "@/context/ProgramContext";
import { getPublicAppCatalog } from "@/lib/appCatalog";

export default function PublicHomePage() {
  const { programs } = usePrograms();
  const publicApps = useMemo(() => getPublicAppCatalog(programs), [programs]);
  const featuredApps = publicApps.filter((app) => app.featured).slice(0, 3);

  return (
    <SiteShell>
      <div className="space-y-14">
        <SiteHero />
        <AboutSection />
        <FeaturedApps apps={featuredApps} />

        <section className="flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_50px_rgba(8,15,30,0.28)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-sky-100/70">Explore the full directory</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Browse all available Suite apps and launch destinations</h2>
            <p className="mt-2 max-w-2xl text-base leading-8 text-slate-300">
              Search by app name, filter by access type, and inspect each app before launching it.
            </p>
          </div>

          <Button asChild size="lg">
            <Link to="/apps">
              View Full Directory <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>
    </SiteShell>
  );
}