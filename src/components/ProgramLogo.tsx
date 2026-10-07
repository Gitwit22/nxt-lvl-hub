import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgramLogoProps {
  name: string;
  logoUrl?: string;
  accentColor?: string;
  className?: string;
  textClassName?: string;
}

function resolveProgramColor(color?: string) {
  if (!color) return undefined;
  // Full CSS colors pass through (incl. oklch()/lab() used by imported launchpad programs);
  // bare "H S% L%" triples are wrapped in hsl() for the theme tokens.
  if (/^(#|rgb|hsl|hwb|lab|lch|oklab|oklch|color\(|var\()/i.test(color)) {
    return color;
  }
  return `hsl(${color})`;
}

export function ProgramLogo({ name, logoUrl, accentColor, className, textClassName }: ProgramLogoProps) {
  // Stored URLs can go dead (e.g. files lost from a host's ephemeral disk); fall back to the initial instead of a broken image.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (logoUrl && failedUrl !== logoUrl) {
    return (
      <div className={cn("rounded metal-raised overflow-hidden shrink-0", className)}>
        <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-cover" onError={() => setFailedUrl(logoUrl)} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded metal-raised flex items-center justify-center font-mono font-bold shrink-0",
        className,
        textClassName
      )}
      style={resolveProgramColor(accentColor) ? { color: resolveProgramColor(accentColor) } : {}}
      aria-label={`${name} logo placeholder`}
    >
      {name.trim() ? name.charAt(0).toUpperCase() : <ImageIcon className="h-4 w-4" />}
    </div>
  );
}