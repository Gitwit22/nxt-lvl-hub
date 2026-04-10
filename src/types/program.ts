export type ProgramStatus = "live" | "beta" | "coming-soon" | "internal" | "archived";
export type ProgramType = "internal" | "external";
export type ProgramOrigin = "suite-native" | "external-partner";

export interface Program {
  id: string;
  slug?: string;
  organizationId?: string | null;
  name: string;
  shortDescription: string;
  longDescription: string;
  category: string;
  secondaryCategory?: string;
  tags: string[];
  status: ProgramStatus;
  type: ProgramType;
  origin: ProgramOrigin;
  internalRoute?: string;
  externalUrl?: string;
  openInNewTab: boolean;
  logoUrl?: string;
  screenshotUrl?: string;
  accentColor?: string;
  cardBackgroundColor?: string;
  cardBackgroundOpacity?: number;
  cardGlowColor?: string;
  cardGlowOpacity?: number;
  cardHoverTintOpacity?: number;
  adminOnly?: boolean;
  isFeatured: boolean;
  isPublic: boolean;
  requiresLogin: boolean;
  requiresApproval: boolean;
  launchLabel: string;
  displayOrder: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORIES = [
  "Operations",
  "Media",
  "Education",
  "Nonprofit",
  "Logistics",
  "Finance",
  "Communication",
  "Analytics",
  "Development",
  "Human Resources",
] as const;

export const STATUS_CONFIG: Record<ProgramStatus, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-success/20 text-success border-success/30" },
  beta: { label: "Beta", className: "bg-info/20 text-info border-info/30" },
  "coming-soon": { label: "Coming Soon", className: "bg-warning/20 text-warning border-warning/30" },
  internal: { label: "Internal", className: "bg-muted text-muted-foreground border-border" },
  archived: { label: "Archived", className: "bg-muted/50 text-muted-foreground/60 border-border/50" },
};
