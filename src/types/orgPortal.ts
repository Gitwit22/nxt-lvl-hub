export type OrgRole = "super_admin" | "org_admin" | "manager" | "staff";

export const orgRoleLabels: Record<OrgRole, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  manager: "Manager",
  staff: "Staff",
};

export type PortalProgramStatus = "active" | "beta" | "maintenance" | "coming-soon";
export type OrganizationStatus = "active" | "suspended" | "trial";
export type PlanType = "starter" | "growth" | "enterprise";

export interface Branding {
  primaryColor: string;
  accentColor: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  subdomain: string;
  contactEmail: string;
  ownerEmail: string;
  ownerUserId?: string | null;
  logo: string;
  logoUrl?: string;
  bannerUrl?: string;
  welcomeMessage: string;
  supportEmail: string;
  supportContactName: string;
  phoneNumber?: string;
  industryType?: string;
  notes?: string;
  planType: PlanType;
  seatLimit: number;
  status: OrganizationStatus;
  trialEndsAt?: string;
  createdAt: string;
  lastActivityAt: string;
  branding: Branding;
  assignedProgramIds: string[];
  assignedBundleIds: string[];
  announcements: Announcement[];
  tags?: string[];
}

export interface PortalUser {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: OrgRole;
  active: boolean;
  assignedProgramIds: string[];
  authUserId?: string | null;
}

export interface SuiteProgram {
  id: string;
  name: string;
  description: string;
  logo: string;
  launchUrl: string;
  status: PortalProgramStatus;
}

export interface Bundle {
  id: string;
  name: string;
  programIds: string[];
}
