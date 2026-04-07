import { Program } from "@/types/program";
import { Screw } from "@/components/Screw";
import { StatusLED } from "@/components/StatusLED";
import { ExternalLink, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProgramCardProps {
  program: Program;
  compact?: boolean;
}

export function ProgramCard({ program, compact }: ProgramCardProps) {
  const navigate = useNavigate();
  const isLaunchable = program.status === "live" || program.status === "beta" || program.status === "internal";

  const handleLaunch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLaunchable) return;
    if (program.type === "external" && program.externalUrl) {
      window.open(program.externalUrl, program.openInNewTab ? "_blank" : "_self");
    } else if (program.internalRoute) {
      navigate(program.internalRoute);
    }
  };

  return (
    <div
      onClick={() => navigate(`/applications/${program.id}`)}
      className="metal-panel rounded-lg p-5 cursor-pointer transition-all duration-200 hover:border-metal-edge group relative"
    >
      {/* Corner screws */}
      <Screw className="absolute top-2.5 left-2.5" />
      <Screw className="absolute top-2.5 right-2.5" />
      <Screw className="absolute bottom-2.5 left-2.5" />
      <Screw className="absolute bottom-2.5 right-2.5" />

      <div className="px-2">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3 mt-1">
          <div
            className="w-9 h-9 rounded metal-raised flex items-center justify-center font-mono font-bold text-sm shrink-0"
            style={program.accentColor ? { color: `hsl(${program.accentColor})` } : {}}
          >
            {program.name.charAt(0)}
          </div>
          <StatusLED status={program.status} />
        </div>

        {/* Name */}
        <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors text-sm">
          {program.name}
        </h3>

        {!compact && (
          <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
            {program.shortDescription}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/30">
          <span className="stamped-label text-[9px]">{program.category}</span>
          {isLaunchable ? (
            <button
              onClick={handleLaunch}
              className="metal-button rounded px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              {program.type === "external" ? (
                <>Launch <ExternalLink className="h-2.5 w-2.5" /></>
              ) : (
                <>Launch <ArrowRight className="h-2.5 w-2.5" /></>
              )}
            </button>
          ) : (
            <span className="stamped-label text-[9px] italic">{program.launchLabel}</span>
          )}
        </div>

        {/* Tags */}
        {!compact && program.tags.length > 0 && (
          <div className="flex gap-1 mt-3 flex-wrap">
            {program.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[9px] px-2 py-0.5 rounded font-mono uppercase tracking-wide bg-secondary text-muted-foreground border border-border/50">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
