import { ProgramStatus } from "@/types/program";
import { cn } from "@/lib/utils";

const ledClassMap: Record<ProgramStatus, string> = {
  live: "led-live animate-led-pulse",
  beta: "led-beta",
  "coming-soon": "led-coming",
  internal: "led-internal",
  archived: "led-archived",
};

const labelMap: Record<ProgramStatus, string> = {
  live: "LIVE",
  beta: "BETA",
  "coming-soon": "SOON",
  internal: "INT",
  archived: "OFF",
};

interface StatusLEDProps {
  status: ProgramStatus;
  showLabel?: boolean;
  className?: string;
}

export function StatusLED({ status, showLabel = true, className }: StatusLEDProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("led", ledClassMap[status])} />
      {showLabel && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {labelMap[status]}
        </span>
      )}
    </div>
  );
}
