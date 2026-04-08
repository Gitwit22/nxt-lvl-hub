export const organizationStatuses = ["active", "trial", "suspended", "archived"] as const;
export const organizationPlanTypes = ["starter", "growth", "enterprise"] as const;

export type OrganizationStatus = (typeof organizationStatuses)[number];
export type OrganizationPlanType = (typeof organizationPlanTypes)[number];

export interface OrganizationBranding {
  primaryColor: string;
  accentColor: string;
}

export interface OrganizationAnnouncement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

export interface OrganizationSettings {
  defaultWorkspace: string;
  configuration: Record<string, unknown>;
  placeholderRoles: string[];
}

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  description: string;
  contactEmail: string;
  logo: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  welcomeMessage: string;
  supportEmail: string;
  supportContactName: string;
  phoneNumber: string;
  industryType: string;
  notes: string;
  planType: OrganizationPlanType;
  seatLimit: number;
  trialEndsAt: string | null;
  lastActivityAt: string;
  branding: OrganizationBranding;
  assignedProgramIds: string[];
  assignedBundleIds: string[];
  announcements: OrganizationAnnouncement[];
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

export type OrganizationInput = Omit<OrganizationRecord, "id" | "slug" | "settings" | "createdAt" | "updatedAt" | "deletedAt"> & {
  id?: string;
  slug?: string;
};

