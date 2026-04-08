export const programStatuses = ["live", "beta", "coming-soon", "internal", "archived"] as const;
export const programTypes = ["internal", "external"] as const;
export const programOrigins = ["suite-native", "external-partner"] as const;

export type ProgramStatus = (typeof programStatuses)[number];
export type ProgramType = (typeof programTypes)[number];
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
  screenshotUrl: string | null;
  type: ProgramType;
  origin: ProgramOrigin;
  internalRoute: string | null;
  externalUrl: string | null;
  openInNewTab: boolean;
  isFeatured: boolean;
  isPublic: boolean;
  requiresLogin: boolean;
  requiresApproval: boolean;
  displayOrder: number;
  launchLabel: string;
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

export type ProgramInput = Omit<ProgramRecord, "id" | "slug" | "createdAt" | "updatedAt" | "deletedAt"> & {
  id?: string;
  slug?: string;
};

