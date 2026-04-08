export const orgUserRoles = ["super_admin", "org_admin", "manager", "staff"] as const;

export type OrgUserRole = (typeof orgUserRoles)[number];

export const orgUserRoleLabels: Record<OrgUserRole, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  manager: "Manager",
  staff: "Staff",
};

export interface OrgUserRecord {
  id: string;
  orgId: string;
  authUserId: string | null;
  name: string;
  email: string;
  role: OrgUserRole;
  active: boolean;
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
  email: string;
  role: OrgUserRole;
  active?: boolean;
  assignedProgramIds?: string[];
}
