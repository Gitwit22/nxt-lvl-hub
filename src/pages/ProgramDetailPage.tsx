import { useParams, useNavigate } from "react-router-dom";
import { usePrograms } from "@/context/ProgramContext";
import { StatusLED } from "@/components/StatusLED";
import { Screw } from "@/components/Screw";
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
        <p className="stamped-label text-xs">Program not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/applications")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

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
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/applications")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="metal-panel rounded-xl p-8 space-y-6 relative">
        <Screw className="absolute top-4 left-4" />
        <Screw className="absolute top-4 right-4" />
        <Screw className="absolute bottom-4 left-4" />
        <Screw className="absolute bottom-4 right-4" />

        {/* Header */}
        <div className="flex items-start gap-4 px-2">
          <div
            className="w-12 h-12 rounded metal-raised flex items-center justify-center text-xl font-mono font-bold shrink-0"
            style={program.accentColor ? { color: `hsl(${program.accentColor})` } : {}}
          >
            {program.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-mono font-bold">{program.name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StatusLED status={program.status} />
              <span className="stamped-label text-[9px]">{program.category}</span>
              <span className="stamped-label text-[9px]">{program.origin === "suite-native" ? "Suite Native" : "External Partner"}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="metal-raised rounded-lg p-5 relative">
          <Screw className="absolute top-2 left-2" />
          <Screw className="absolute top-2 right-2" />
          <h3 className="stamped-label text-[9px] mb-2">Description</h3>
          <p className="text-sm text-foreground leading-relaxed">{program.longDescription}</p>
        </div>

        {/* Tags */}
        {program.tags.length > 0 && (
          <div>
            <h3 className="stamped-label text-[9px] mb-2">Tags</h3>
            <div className="flex gap-2 flex-wrap">
              {program.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-3 py-1 rounded font-mono uppercase tracking-wide bg-secondary text-muted-foreground border border-border/50">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Specs grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Type", program.type],
            ["Login Required", program.requiresLogin ? "Yes" : "No"],
            ["Approval Required", program.requiresApproval ? "Yes" : "No"],
            ["Visibility", program.isPublic ? "Public" : "Private"],
          ].map(([label, value]) => (
            <div key={label} className="metal-panel rounded p-3 relative">
              <Screw className="absolute top-1.5 right-1.5" />
              <span className="stamped-label text-[8px] block mb-1">{label}</span>
              <span className="text-xs font-mono text-foreground uppercase">{value}</span>
            </div>
          ))}
        </div>

        {/* Notes */}
        {program.notes && (
          <div>
            <h3 className="stamped-label text-[9px] mb-2">Notes</h3>
            <p className="text-xs text-muted-foreground font-mono">{program.notes}</p>
          </div>
        )}

        {/* Launch */}
        <div className="pt-4 border-t border-border/30">
          {isLaunchable ? (
            <Button size="lg" onClick={handleLaunch}>
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
