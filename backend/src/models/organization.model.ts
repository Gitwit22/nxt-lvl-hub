export const organizationStatuses = ["active", "pending", "suspended", "archived"] as const;

export type OrganizationStatus = (typeof organizationStatuses)[number];

export interface OrganizationSettings {
  defaultWorkspace: string;
  configuration: Record<string, unknown>;
  placeholderRoles: string[];
}

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  ownerEmail: string;
  ownerUserId: string | null;
  status: OrganizationStatus;
  tags: string[];
  settings: OrganizationSettings;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OrganizationFilters {
  search?: string;
  name?: string;
  status?: OrganizationStatus;
  tags?: string[];
}

export type OrganizationInput = Omit<OrganizationRecord, "id" | "slug" | "settings" | "createdAt" | "updatedAt" | "deletedAt">;