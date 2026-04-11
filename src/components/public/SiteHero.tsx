import { LayoutGrid, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function SiteHero() {
  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-3 shadow-[0_18px_60px_rgba(8,15,30,0.4)] backdrop-blur-xl">
        <div className="absolute -right-20 top-0 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-44 w-44 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative space-y-3">
          <img
            src="/3_banner.png"
            alt="Nxt Lvl Suites banner"
            className="h-[180px] w-full rounded-2xl border border-white/10 object-cover sm:h-[220px] lg:h-[260px]"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 px-2">
            <p className="text-xs uppercase tracking-[0.22em] text-sky-100/70">Public app directory and launch hub</p>
            <Button asChild size="sm">
              <Link to="/apps">
                <LayoutGrid className="h-4 w-4" /> View Apps
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-sky-100/85">
        <Sparkles className="h-3.5 w-3.5" /> Suite access layer
      </div>
    </section>
  );
}