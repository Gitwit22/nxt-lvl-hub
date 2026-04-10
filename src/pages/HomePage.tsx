import { usePrograms } from "@/context/ProgramContext";
import { ProgramCard } from "@/components/ProgramCard";
import { Screw } from "@/components/Screw";
import { Button } from "@/components/ui/button";
import { ArrowRight, Cpu, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { programs } = usePrograms();
  const { isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const visiblePrograms = programs.filter((program) => isPlatformAdmin || !program.adminOnly);

  const featured = visiblePrograms.filter((p) => p.isFeatured && p.isPublic).sort((a, b) => a.displayOrder - b.displayOrder);
  const recentlyAdded = [...visiblePrograms].filter((p) => p.isPublic).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);
  const comingSoon = visiblePrograms.filter((p) => p.status === "coming-soon" && p.isPublic);

  return (
    <div className="p-6 md:p-10 space-y-14 max-w-6xl mx-auto">
      {/* Hero — recessed panel */}
      <section className="metal-panel rounded-xl p-10 md:p-16 text-center relative">
        <Screw className="absolute top-4 left-4" />
        <Screw className="absolute top-4 right-4" />
        <Screw className="absolute bottom-4 left-4" />
        <Screw className="absolute bottom-4 right-4" />

        <div className="stamped-label text-[10px] mb-4">System Dashboard v1.0</div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 font-mono">
          <span className="gradient-text">NXT LVL SUITES</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
          Central command for every Nxt Lvl application. Launch, manage, and scale your tools from one industrial-grade home base.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg" onClick={() => navigate("/applications")}>
            Explore Apps <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/about")}>
            About
          </Button>
        </div>
      </section>

      {/* Value Props — raised panels */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { icon: Cpu, title: "UNIFIED SUITE", desc: "All applications under one control panel." },
          { icon: Zap, title: "INSTANT LAUNCH", desc: "One-click access to any tool in the ecosystem." },
          { icon: Shield, title: "BUILT TO SCALE", desc: "Engineered for security, roles, and enterprise use." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="metal-raised rounded-lg p-6 text-center relative">
            <Screw className="absolute top-2.5 left-2.5" />
            <Screw className="absolute top-2.5 right-2.5" />
            <Icon className="h-7 w-7 text-primary mx-auto mb-3" />
            <h3 className="font-mono font-semibold text-foreground text-xs uppercase tracking-widest mb-2">{title}</h3>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="stamped-label text-xs">Featured Applications</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/applications")} className="text-primary">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <section>
          <h2 className="stamped-label text-xs mb-5">Recently Added</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentlyAdded.map((p) => (
              <ProgramCard key={p.id} program={p} compact />
            ))}
          </div>
        </section>
      )}

      {/* Coming Soon */}
      {comingSoon.length > 0 && (
        <section>
          <h2 className="stamped-label text-xs mb-5">Coming Soon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {comingSoon.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        </section>
      )}

      <footer className="text-center stamped-label text-[9px] pt-6 border-t border-border/30">
        © {new Date().getFullYear()} Nxt Lvl Technology Solutions
      </footer>
    </div>
  );
}
