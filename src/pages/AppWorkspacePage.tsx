import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Rocket } from "lucide-react";
import { usePrograms } from "@/context/ProgramContext";
import { Button } from "@/components/ui/button";
import { Screw } from "@/components/Screw";

export default function AppWorkspacePage() {
  const { appSlug = "" } = useParams();
  const navigate = useNavigate();
  const { programs } = usePrograms();

  const program = useMemo(
    () =>
      programs.find((entry) => {
        const internalRoute = entry.internalRoute || "";
        return internalRoute.replace(/^\/+/, "").toLowerCase() === `apps/${appSlug}`.toLowerCase();
      }),
    [appSlug, programs],
  );

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <section className="metal-panel rounded-xl p-8 relative overflow-hidden">
        <Screw className="absolute top-3 left-3" />
        <Screw className="absolute top-3 right-3" />
        <Screw className="absolute bottom-3 left-3" />
        <Screw className="absolute bottom-3 right-3" />

        <div className="max-w-2xl space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary">
            <Rocket className="h-5 w-5 text-primary" />
          </div>

          <div>
            <p className="stamped-label text-[10px]">Workspace Route Active</p>
            <h1 className="font-mono text-2xl font-bold tracking-tight">{program?.name || "Application Workspace"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {program?.longDescription || "This internal application route is now live and no longer drops to a 404 page. Use it as the handoff point for each suite workspace as modules are built out."}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current Route</p>
            <p className="mt-2 font-mono text-sm text-foreground">/apps/{appSlug}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/applications")}>Back To Applications</Button>
            <Button variant="outline" onClick={() => navigate("/admin/programs")}>
              Review Launch Mapping
            </Button>
            {program?.externalUrl && (
              <Button variant="outline" onClick={() => window.open(program.externalUrl, program.openInNewTab ? "_blank" : "_self")}>
                Open External Version <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}