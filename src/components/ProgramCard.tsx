import { Program } from "@/types/program";
import { Screw } from "@/components/Screw";
import { StatusLED } from "@/components/StatusLED";
import { ProgramLogo } from "@/components/ProgramLogo";
import { ExternalLink, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "@/lib/api";

interface ProgramCardProps {
  program: Program;
  compact?: boolean;
}

const SUITE_LAUNCH_HOST_HINTS = ["community-chronicle", "mission-hub"];

function resolveProgramColor(color?: string) {
  if (!color) return undefined;
  if (color.startsWith("#") || color.startsWith("rgb") || color.startsWith("hsl") || color.startsWith("var(")) {
    return color;
  }
  return `hsl(${color})`;
}

function hexToRgba(hex: string, opacityPercent: number) {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((segment) => `${segment}${segment}`).join("")
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return undefined;
  }

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  const alpha = Math.max(0, Math.min(opacityPercent, 100)) / 100;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function ProgramCard({ program, compact }: ProgramCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const isLaunchable = program.status === "live" || program.status === "beta" || program.status === "internal";
  const baseCardOpacity = program.cardBackgroundOpacity ?? 0;
  const hoverTintOpacity = program.cardHoverTintOpacity ?? 0;
  const resolvedCardBackground = program.cardBackgroundColor
    ? hexToRgba(program.cardBackgroundColor, isHovered ? Math.min(100, baseCardOpacity + hoverTintOpacity) : baseCardOpacity) || resolveProgramColor(program.cardBackgroundColor)
    : undefined;
  const resolvedGlowColor = program.cardGlowColor || program.accentColor || program.cardBackgroundColor;
  const glowOpacity = program.cardGlowOpacity ?? 0;
  const resolvedBorderColor = resolvedGlowColor && resolvedGlowColor.startsWith("#")
    ? hexToRgba(resolvedGlowColor, glowOpacity)
    : resolveProgramColor(resolvedGlowColor);
  const resolvedGlowShadow = resolvedGlowColor && resolvedGlowColor.startsWith("#")
    ? `${isHovered ? "0 0 0 1px" : "0 0 0 1px"} ${hexToRgba(resolvedGlowColor, Math.max(glowOpacity, 6))}, ${isHovered ? "0 0 36px" : "0 0 18px"} ${hexToRgba(resolvedGlowColor, Math.max(glowOpacity * 0.7, 8))}`
    : undefined;

  const resolveExternalLaunchUrl = (url: string) => {
    const token = getAccessToken();
    if (!token) return url;

    try {
      const target = new URL(url, window.location.origin);
      const host = target.hostname.toLowerCase();
      const supportsSuiteLaunch = SUITE_LAUNCH_HOST_HINTS.some((hint) => host.includes(hint));
      if (!supportsSuiteLaunch) {
        return url;
      }

      target.pathname = "/launch";
      if (!target.searchParams.get("token")) {
        target.searchParams.set("token", token);
      }
      return target.toString();
    } catch {
      return url;
    }
  };

  const handleLaunch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLaunchable) return;
    if (program.type === "external" && program.externalUrl) {
      window.open(resolveExternalLaunchUrl(program.externalUrl), program.openInNewTab ? "_blank" : "_self");
    } else if (program.internalRoute) {
      const route = program.internalRoute;
      const isExternal = route.startsWith("http://") || route.startsWith("https://") || (!route.startsWith("/") && route.includes("."));
      if (isExternal) {
        window.open(`https://${route.replace(/^https?:\/\//, "")}`, program.openInNewTab ? "_blank" : "_self");
      } else {
        navigate(route);
      }
    }
  };

  return (
    <div
      onClick={() => navigate(`/applications/${program.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="metal-panel rounded-lg p-5 cursor-pointer transition-all duration-200 hover:border-metal-edge group relative"
      style={resolvedCardBackground || resolvedBorderColor || resolvedGlowShadow ? {
        backgroundColor: resolvedCardBackground,
        borderColor: resolvedBorderColor,
        boxShadow: resolvedGlowShadow,
      } : undefined}
    >
      {/* Corner screws */}
      <Screw className="absolute top-2.5 left-2.5" />
      <Screw className="absolute top-2.5 right-2.5" />
      <Screw className="absolute bottom-2.5 left-2.5" />
      <Screw className="absolute bottom-2.5 right-2.5" />

      <div className="px-2">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3 mt-1">
          <ProgramLogo name={program.name} logoUrl={program.logoUrl} accentColor={program.accentColor} className="w-14 h-14" textClassName="text-lg" />
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
