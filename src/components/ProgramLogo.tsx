import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgramLogoProps {
  name: string;
  logoUrl?: string;
  accentColor?: string;
  className?: string;
  textClassName?: string;
}

export function ProgramLogo({ name, logoUrl, accentColor, className, textClassName }: ProgramLogoProps) {
  if (logoUrl) {
    return (
      <div className={cn("rounded metal-raised overflow-hidden shrink-0", className)}>
        <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-cover" />
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
      style={accentColor ? { color: `hsl(${accentColor})` } : {}}
      aria-label={`${name} logo placeholder`}
    >
      {name.trim() ? name.charAt(0).toUpperCase() : <ImageIcon className="h-4 w-4" />}
    </div>
  );
}