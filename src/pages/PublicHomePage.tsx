import { useState } from "react";
import { SiteShell } from "@/components/public/SiteShell";
import { usePrograms } from "@/context/ProgramContext";
import { ProgramLogo } from "@/components/ProgramLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Rocket, ArrowRight, Layers, Shield, Zap } from "lucide-react";

// ─── Public program card ───────────────────────────────────────────────────────

function PublicProgramCard({ program }: { program: ReturnType<typeof usePrograms>["programs"][number] }) {
  const isComingSoon = program.status === "coming-soon";
  const isLive = program.status === "live" || program.status === "beta";

  function resolveColor(color?: string) {
    if (!color) return undefined;
    if (color.startsWith("#") || color.startsWith("rgb") || color.startsWith("hsl")) return color;
    return `hsl(${color})`;
  }

  function handleLaunch() {
    if (!isLive) return;

    if (program.type === "external" && program.externalUrl) {
      window.open(program.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (program.internalRoute) {
      const route = program.internalRoute;
      const isExternal =
        route.startsWith("http://") ||
        route.startsWith("https://") ||
        (!route.startsWith("/") && route.includes("."));
      if (isExternal) {
        window.open(`https://${route.replace(/^https?:\/\//, "")}`, "_blank", "noopener,noreferrer");
      }
    }
  }

  return (
    <article
      className="group flex h-full flex-col rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-[0_16px_50px_rgba(8,15,30,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/30 hover:bg-slate-950/80"
      style={program.accentColor ? { borderColor: resolveColor(program.accentColor) + "22" } : undefined}
    >
      <div className="flex items-start gap-4">
        <ProgramLogo
          name={program.name}
          logoUrl={program.logoUrl}
          accentColor={program.accentColor}
          className="h-14 w-14 shrink-0 rounded-xl"
          textClassName="text-lg"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white leading-tight">{program.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{program.category}</p>
        </div>
        {isComingSoon ? (
          <Badge variant="outline" className="shrink-0 border-amber-400/30 text-amber-300 bg-amber-400/10 text-[10px]">
            Coming Soon
          </Badge>
        ) : program.status === "beta" ? (
          <Badge variant="outline" className="shrink-0 border-sky-400/30 text-sky-300 bg-sky-400/10 text-[10px]">
            Beta
          </Badge>
        ) : null}
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-300">{program.shortDescription}</p>

      {program.longDescription && program.longDescription !== program.shortDescription && (
        <p className="mt-2 text-xs leading-relaxed text-slate-400 line-clamp-2">{program.longDescription}</p>
      )}

      {program.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {program.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 border-t border-white/10 pt-4">
        {isLive ? (
          <Button onClick={handleLaunch} className="w-full gap-2" variant="outline">
            {program.launchLabel || "Visit"}
            <ExternalLink className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Rocket className="h-4 w-4" />
            <span>Coming soon — stay tuned</span>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicHomePage() {
  const { programs, isLoading, catalogError } = usePrograms();
  const [filter, setFilter] = useState<"all" | "live" | "coming-soon">("all");

  const publicPrograms = programs.filter((p) => p.isPublic && !p.adminOnly);

  const filteredPrograms = publicPrograms.filter((p) => {
    if (filter === "live") return p.status === "live" || p.status === "beta";
    if (filter === "coming-soon") return p.status === "coming-soon";
    return true;
  });

  const featuredPrograms = publicPrograms
    .filter((p) => p.isFeatured && (p.status === "live" || p.status === "beta"))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 3);

  return (
    <SiteShell>
      {/* ── Home section ─────────────────────────────────────────────── */}
      <section id="home" className="space-y-16 scroll-mt-24">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 md:p-14 shadow-[0_18px_60px_rgba(8,15,30,0.4)] backdrop-blur-xl">
          <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

          <img
            src="/3_banner.png"
            alt="Nxt Lvl Suites banner"
            className="relative mb-8 h-[180px] w-full rounded-2xl border border-white/10 object-cover sm:h-[220px] lg:h-[260px]"
          />

          <div className="relative space-y-4 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-sky-100/85">
              Nxt Lvl Technology Solutions
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              Nxt Lvl Suites
            </h1>
            <p className="text-base leading-relaxed text-slate-300 md:text-lg">
              A showcase of the tools, apps, and systems built by Nxt Lvl Technology Solutions.
              Each program is purpose-built for specific operational needs — browse what's available
              and launch directly to the program that fits your work.
            </p>
            <a
              href="#programs"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-colors hover:bg-sky-400"
            >
              Browse Programs <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              icon: Layers,
              title: "Suite of Tools",
              body: "Multiple purpose-built applications under one roof — each focused on a specific domain.",
            },
            {
              icon: Zap,
              title: "Direct Launch",
              body: "Click a program and go. No suite account needed. Each app handles its own access.",
            },
            {
              icon: Shield,
              title: "Built for Operations",
              body: "Designed for real nonprofit, business, and operations workflows — not generic software.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10">
                <Icon className="h-5 w-5 text-sky-300" />
              </div>
              <h3 className="mb-2 font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{body}</p>
            </div>
          ))}
        </div>

        {/* Featured programs */}
        {featuredPrograms.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Featured Programs</h2>
              <a href="#programs" className="flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPrograms.map((p) => (
                <PublicProgramCard key={p.id} program={p} />
              ))}
            </div>
          </div>
        )}

        {/* About */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
          <h2 className="mb-4 text-xl font-semibold text-white">About Nxt Lvl Technology Solutions</h2>
          <p className="max-w-3xl text-sm leading-8 text-slate-300">
            Nxt Lvl Technology Solutions builds focused, operational software for organizations that need
            purpose-built tools — not generic platforms. Each program in this suite addresses a distinct need:
            from time tracking and billing to mission management and community documentation. Browse the
            programs below and launch directly to the one that fits your workflow.
          </p>
        </div>
      </section>

      {/* ── Programs section ──────────────────────────────────────────── */}
      <section id="programs" className="mt-20 scroll-mt-24 space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">All Programs</h2>
          <p className="mt-1 text-sm text-slate-400">
            Browse available tools. Click "Visit" to go directly to any program's site.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {(["all", "live", "coming-soon"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                filter === f
                  ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                  : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200",
              ].join(" ")}
            >
              {f === "all" ? "All" : f === "live" ? "Live" : "Coming Soon"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            Loading programs…
          </div>
        ) : catalogError ? (
          <div className="rounded-2xl border border-dashed border-red-400/20 bg-red-400/5 py-16 text-center">
            <p className="text-base font-medium text-red-300">Unable to load programs</p>
            <p className="mt-2 text-sm text-slate-400">The programs catalog could not be reached. Please try again later.</p>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-slate-400">
            No programs match the current filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...filteredPrograms]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((p) => (
                <PublicProgramCard key={p.id} program={p} />
              ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}
