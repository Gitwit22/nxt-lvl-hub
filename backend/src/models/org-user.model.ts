export const orgUserRoles = ["super_admin", "org_admin", "manager", "staff", "viewer"] as const;

export type OrgUserRole = (typeof orgUserRoles)[number];

export const orgUserRoleLabels: Record<OrgUserRole, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  manager: "Manager",
  staff: "Staff",
  viewer: "Viewer",
};

export const orgUserAccountStatuses = ["active", "invited", "password_change_required", "disabled"] as const;
export type OrgUserAccountStatus = (typeof orgUserAccountStatuses)[number];

export interface OrgUserRecord {
  id: string;
  orgId: string;
  authUserId: string | null;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: OrgUserRole;
  active: boolean;
  mustChangePassword?: boolean;
  accountStatus?: OrgUserAccountStatus;
  invitedById?: string | null;
  temporaryPasswordIssuedAt?: string | null;
  passwordSetAt?: string | null;
  assignedProgramIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OrgUserInput {
  id?: string;
  orgId?: string;
  authUserId?: string | null;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: OrgUserRole;
  active?: boolean;
  passwordMode?: "auto" | "manual";
  tempPassword?: string;
  assignedProgramIds?: string[];
}
