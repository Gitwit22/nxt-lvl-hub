export const programStatuses = ["live", "beta", "coming-soon", "internal", "archived"] as const;
export const programOrigins = ["internal", "external"] as const;

export type ProgramStatus = (typeof programStatuses)[number];
export type ProgramOrigin = (typeof programOrigins)[number];

export interface ProgramRecord {
  id: string;
  organizationId?: string | null;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  category: string;
  status: ProgramStatus;
  tags: string[];
  logoUrl: string | null;
  internalOrExternal: ProgramOrigin;
  internalRoute: string | null;
  externalUrl: string | null;
  featured: boolean;
  displayOrder: number;
  loginRequired: boolean;
  launchButtonLabel: string;
  notes: string;
  accentColor: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProgramFilters {
  search?: string;
  category?: string;
  status?: ProgramStatus;
  tags?: string[];
  featured?: boolean;
  organizationId?: string;
}

export type ProgramInput = Omit<ProgramRecord, "id" | "slug" | "createdAt" | "updatedAt" | "deletedAt">;