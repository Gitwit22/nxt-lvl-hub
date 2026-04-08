export const orgUserRoles = ["Super Admin", "Org Admin", "Manager", "Staff"] as const;

export type OrgUserRole = (typeof orgUserRoles)[number];

export interface OrgUserRecord {
  id: string;
  orgId: string;
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
  name: string;
  email: string;
  role: OrgUserRole;
  active?: boolean;
  assignedProgramIds?: string[];
}
