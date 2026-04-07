import { usePrograms } from "@/context/ProgramContext";
import { ProgramCard } from "@/components/ProgramCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Layers, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const { programs } = usePrograms();
  const navigate = useNavigate();

  const featured = programs.filter((p) => p.isFeatured && p.isPublic).sort((a, b) => a.displayOrder - b.displayOrder);
  const recentlyAdded = [...programs].filter((p) => p.isPublic).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);
  const comingSoon = programs.filter((p) => p.status === "coming-soon" && p.isPublic);

  return (
    <div className="p-6 md:p-10 space-y-16 max-w-6xl mx-auto">
      {/* Hero */}
      <section className="text-center py-16 md:py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl -z-10" />
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
          Welcome to <span className="gradient-text">Nxt Lvl Suites</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Your central access point for every Nxt Lvl application. Launch, manage, and scale your tools from one polished home base.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg" onClick={() => navigate("/applications")} className="gap-2">
            Explore Applications <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/about")}>
            Learn More
          </Button>
        </div>
      </section>

      {/* Value Props */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Layers, title: "Unified Suite", desc: "All your applications in one place, organized and accessible." },
          { icon: Zap, title: "Launch Instantly", desc: "One-click access to any tool in the ecosystem." },
          { icon: Shield, title: "Enterprise Ready", desc: "Built for scale with security, roles, and analytics in mind." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="glass-card rounded-xl p-6 text-center">
            <Icon className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Featured Applications</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/applications")} className="text-primary">
              View All <ArrowRight className="ml-1 h-4 w-4" />
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
          <h2 className="text-2xl font-bold mb-6">Recently Added</h2>
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
          <h2 className="text-2xl font-bold mb-6">Coming Soon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {comingSoon.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="text-center text-sm text-muted-foreground pt-8 border-t border-border/30">
        © {new Date().getFullYear()} Nxt Lvl Technology Solutions. All rights reserved.
      </footer>
    </div>
  );
}
