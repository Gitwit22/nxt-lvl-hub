export type OrgRole = "super_admin" | "org_admin" | "manager" | "staff" | "viewer";

export const orgRoleLabels: Record<OrgRole, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  manager: "Manager",
  staff: "Staff",
  viewer: "Viewer",
};

// LEGACY COMPAT NAME: kept while existing imports still reference orgPortal types.
// TODO(compat-removal): rename to OrgUserAccountStatus once orgPortal naming is fully retired.
export type PortalUserAccountStatus = "active" | "invited" | "password_change_required" | "disabled";

export type PortalProgramStatus = "active" | "beta" | "maintenance" | "coming-soon";
export type OrganizationStatus = "active" | "suspended" | "trial" | "pending";
export type PlanType = "starter" | "growth" | "enterprise";

export interface Branding {
  primaryColor: string;
  secondaryColor?: string;
  accentColor: string;
  backgroundColor?: string;
  backgroundStartColor?: string;
  backgroundEndColor?: string;
  bannerStartColor?: string;
  bannerEndColor?: string;
  gradientAngle?: number;
  fontFamily?: string;
}

export const DEFAULT_BRANDING: Required<Branding> = {
  primaryColor: "217 80% 56%",
  secondaryColor: "220 70% 40%",
  accentColor: "191 85% 47%",
  backgroundColor: "#0f172a",
  backgroundStartColor: "#0f172a",
  backgroundEndColor: "#1d4ed8",
  bannerStartColor: "#1e293b",
  bannerEndColor: "#0ea5e9",
  gradientAngle: 135,
  fontFamily: "inter",
};

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
  faviconUrl?: string;
  bannerUrl?: string;
  backgroundUrl?: string;
  // LEGACY COMPAT FIELD NAME: "portalTitle" maps to workspace header title text.
  // TODO(compat-removal): replace with workspaceTitle after API/schema alignment.
  portalTitle?: string;
  // LEGACY COMPAT FIELD NAME: currently maps to workspace landing intro copy.
  // TODO(compat-removal): replace with workspaceWelcomeMessage after API/schema alignment.
  welcomeMessage: string;
  supportEmail: string;
  supportContactName: string;
  supportPhone?: string;
  phoneNumber?: string;
  industryType?: string;
  notes?: string;
  planType: PlanType;
  billingPlan?: string | null;
  seatLimit: number;
  status: OrganizationStatus;
  trialEndsAt?: string;
  customDomain?: string | null;
  createdAt: string;
  lastActivityAt: string;
  branding: Branding;
  assignedProgramIds: string[];
  enabledModules: string[];
  assignedBundleIds: string[];
  announcements: Announcement[];
  tags?: string[];
}

export interface PortalUser {
  id: string;
  orgId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: OrgRole;
  active: boolean;
  mustChangePassword?: boolean;
  accountStatus?: PortalUserAccountStatus;
  invitedById?: string;
  temporaryPasswordIssuedAt?: string;
  passwordSetAt?: string;
  assignedProgramIds: string[];
  authUserId?: string | null;
}

export interface SuiteProgram {
  id: string;
  name: string;
  description: string;
  logo: string;
  logoUrl?: string;
  launchUrl: string;
  status: PortalProgramStatus;
  programDomain?: string;
}

export interface Bundle {
  id: string;
  name: string;
  programIds: string[];
}

