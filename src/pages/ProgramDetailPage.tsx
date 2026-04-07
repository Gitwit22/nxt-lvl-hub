import { useParams, useNavigate } from "react-router-dom";
import { usePrograms } from "@/context/ProgramContext";
import { STATUS_CONFIG } from "@/types/program";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, ArrowRight } from "lucide-react";

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getProgram } = usePrograms();
  const navigate = useNavigate();
  const program = getProgram(id || "");

  if (!program) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">Program not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/applications")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Applications
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[program.status];
  const isLaunchable = program.status === "live" || program.status === "beta" || program.status === "internal";

  const handleLaunch = () => {
    if (!isLaunchable) return;
    if (program.type === "external" && program.externalUrl) {
      window.open(program.externalUrl, program.openInNewTab ? "_blank" : "_self");
    } else if (program.internalRoute) {
      navigate(program.internalRoute);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      <Button variant="ghost" size="sm" onClick={() => navigate("/applications")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="glass-card rounded-xl p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-2xl font-bold shrink-0"
            style={program.accentColor ? { color: `hsl(${program.accentColor})` } : {}}
          >
            {program.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{program.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className={statusCfg.className}>{statusCfg.label}</Badge>
              <span className="text-sm text-muted-foreground">{program.category}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{program.origin === "suite-native" ? "Suite Native" : "External Partner"}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Description</h3>
          <p className="text-foreground leading-relaxed">{program.longDescription}</p>
        </div>

        {/* Tags */}
        {program.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Tags</h3>
            <div className="flex gap-2 flex-wrap">
              {program.tags.map((tag) => (
                <span key={tag} className="text-xs px-3 py-1 rounded-full bg-secondary text-muted-foreground">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Type:</span>
            <span className="ml-2 text-foreground capitalize">{program.type}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Requires Login:</span>
            <span className="ml-2 text-foreground">{program.requiresLogin ? "Yes" : "No"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Requires Approval:</span>
            <span className="ml-2 text-foreground">{program.requiresApproval ? "Yes" : "No"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Visibility:</span>
            <span className="ml-2 text-foreground">{program.isPublic ? "Public" : "Private"}</span>
          </div>
        </div>

        {/* Notes */}
        {program.notes && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Notes</h3>
            <p className="text-sm text-muted-foreground">{program.notes}</p>
          </div>
        )}

        {/* Launch */}
        <div className="pt-4 border-t border-border/30">
          {isLaunchable ? (
            <Button size="lg" onClick={handleLaunch} className="gap-2">
              {program.launchLabel}
              {program.type === "external" ? <ExternalLink className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          ) : (
            <Button size="lg" disabled>{program.launchLabel}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
