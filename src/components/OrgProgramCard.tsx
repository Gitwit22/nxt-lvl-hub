import { useState } from "react";
import { SuiteProgram } from "@/types/orgPortal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowUpRight, Clock3, Loader2, Wrench } from "lucide-react";
import { generateLaunchTokenApi, getErrorMessage } from "@/lib/api";

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

export function OrgProgramCard({ program, orgId }: OrgProgramCardProps) {
  const isLaunchable = program.status === "active" || program.status === "beta";
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const launchProgram = async () => {
    if (!isLaunchable || isLaunching) return;
    setLaunchError(null);

    const isExternal = program.launchUrl.startsWith("http");

    // For external programs, get a launch token so the target app can auto-login
    if (isExternal && program.programDomain) {
      setIsLaunching(true);
      try {
        const launchToken = await generateLaunchTokenApi(orgId, program.programDomain);
        const url = new URL(program.launchUrl);
        url.pathname = "/launch";
        url.searchParams.set("token", launchToken);
        window.open(url.toString(), "_blank", "noopener,noreferrer");
      } catch (error) {
        setLaunchError(getErrorMessage(error));
      } finally {
        setIsLaunching(false);
      }
      return;
    }

    if (isExternal) {
      window.open(program.launchUrl, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.assign(program.launchUrl);
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
        {(program.status === "active" || program.status === "beta") && !launchError && (
          <span className="text-xs text-muted-foreground">Ready to launch</span>
        )}
        {launchError && (
          <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {launchError}
          </span>
        )}

        <Button size="sm" disabled={!isLaunchable || isLaunching} onClick={() => void launchProgram()}>
          {isLaunching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Launch</span><ArrowUpRight className="h-4 w-4" /></>}
        </Button>
      </div>
    </article>
  );
}
