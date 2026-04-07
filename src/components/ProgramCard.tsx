import { Program, STATUS_CONFIG } from "@/types/program";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProgramCardProps {
  program: Program;
  compact?: boolean;
}

export function ProgramCard({ program, compact }: ProgramCardProps) {
  const navigate = useNavigate();
  const statusCfg = STATUS_CONFIG[program.status];
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
      className="glass-card rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-primary/30 hover:shadow-lg group"
      style={program.accentColor ? { borderTopColor: `hsl(${program.accentColor})`, borderTopWidth: "2px" } : {}}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary font-bold text-lg shrink-0">
          {program.name.charAt(0)}
        </div>
        <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>
          {statusCfg.label}
        </Badge>
      </div>
      <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
        {program.name}
      </h3>
      {!compact && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{program.shortDescription}</p>
      )}
      <div className="flex items-center justify-between mt-auto pt-2">
        <span className="text-xs text-muted-foreground">{program.category}</span>
        {isLaunchable ? (
          <Button size="sm" variant="ghost" className="text-primary text-xs h-7 px-2" onClick={handleLaunch}>
            {program.launchLabel}
            {program.type === "external" ? <ExternalLink className="ml-1 h-3 w-3" /> : <ArrowRight className="ml-1 h-3 w-3" />}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground italic">{program.launchLabel}</span>
        )}
      </div>
      {!compact && program.tags.length > 0 && (
        <div className="flex gap-1 mt-3 flex-wrap">
          {program.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
