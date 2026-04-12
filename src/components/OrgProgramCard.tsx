import { useState } from "react";
import { SuiteProgram } from "@/types/orgPortal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Clock3, Wrench } from "lucide-react";
import { generateProgramTokenApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface OrgProgramCardProps {
  program: SuiteProgram;
  orgId: string;
}

const statusClass: Record<SuiteProgram["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  beta: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  maintenance: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "coming-soon": "bg-muted text-muted-foreground border-border",
};

export function OrgProgramCard({ program }: OrgProgramCardProps) {
  const { isAuthenticated } = useAuth();
  const [launching, setLaunching] = useState(false);
  const isLaunchable = program.status === "active" || program.status === "beta";

  const launchProgram = async () => {
    if (!isLaunchable || launching) return;
    const isExternal = program.launchUrl.startsWith("http");

    if (isExternal && isAuthenticated && program.programDomain) {
      setLaunching(true);
      try {
        const { token } = await generateProgramTokenApi(program.programDomain);
        const url = new URL(program.launchUrl);
        url.pathname = "/launch";
        url.searchParams.set("token", token);
        window.open(url.toString(), "_blank", "noopener,noreferrer");
      } catch {
        // Token generation failed — fall back to opening without a token (demo mode)
        window.open(program.launchUrl, "_blank", "noopener,noreferrer");
      } finally {
        setLaunching(false);
      }
      return;
    }

    if (isExternal) {
      window.open(program.launchUrl, "_blank", "noopener,noreferrer");
    } else {
      window.location.assign(program.launchUrl);
    }
  };

  return (
    <article className="group rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {program.logoUrl ? (
            <img
              src={program.logoUrl}
              alt={program.name}
              className="h-11 w-11 rounded-xl border border-border bg-secondary object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary text-sm font-semibold text-foreground">
              {program.logo}
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-foreground">{program.name}</h3>
            <p className="text-xs text-muted-foreground">Program Workspace</p>
          </div>
        </div>
        <Badge className={statusClass[program.status]}>{program.status.replace("-", " ")}</Badge>
      </div>

      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{program.description}</p>

      <div className="flex items-center justify-between border-t border-border pt-4">
        {program.status === "maintenance" && (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400">
            <Wrench className="h-3.5 w-3.5" />
            Limited availability
          </span>
        )}
        {program.status === "coming-soon" && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Coming soon
          </span>
        )}
        {(program.status === "active" || program.status === "beta") && (
          <span className="text-xs text-muted-foreground">Ready to launch</span>
        )}

        <Button size="sm" disabled={!isLaunchable || launching} onClick={() => void launchProgram()}>
          <span>{launching ? "Launching…" : "Launch"}</span>
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
