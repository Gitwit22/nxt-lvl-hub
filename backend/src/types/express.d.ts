import type { OrgUserRole } from "../models/org-user.model.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        email: string;
        partition: string;
        isPlatformAdmin: boolean;
      };
      orgMembership?: {
        orgId: string;
        role: OrgUserRole;
        userId: string;
      };
      resolvedOrganization?: {
        id: string;
        slug: string;
        subdomain: string;
        name: string;
        status: string;
        enabledPrograms: string[];
        enabledModules: string[];
      };
    }
  }
}

export {};
