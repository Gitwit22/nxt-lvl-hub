import { Router } from "express";
import {
  createOrgUser,
  listOrgUsers,
  removeOrgUser,
  resetOrgUserPassword,
  updateOrgUser,
} from "../controllers/org-user.controller.js";
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  listOrganizations,
  updateOrganization,
} from "../controllers/organization.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { platformAdminMiddleware } from "../middleware/auth.js";
import { orgAccessMiddleware } from "../middleware/org-access.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";
import { roleCheckMiddleware } from "../middleware/role-check.js";
import { validateRequest } from "../middleware/validate-request.js";
import {
  createOrganizationSchema,
  listOrganizationsSchema,
  updateOrganizationSchema,
} from "../validators/organization.validators.js";
import {
  createOrgUserSchema,
  listOrgUsersSchema,
  removeOrgUserSchema,
  resetOrgUserPasswordSchema,
  updateOrgUserSchema,
} from "../validators/org-user.validators.js";
import { asyncHandler } from "../utils/async-handler.js";

export const organizationRouter = Router();

organizationRouter.use(rateLimitMiddleware);
organizationRouter.use(authMiddleware);

// List orgs: platform admin sees all; org users see their own (handled by service filtering later).
organizationRouter.get("/orgs", validateRequest(listOrganizationsSchema), asyncHandler(listOrganizations));
organizationRouter.get("/orgs/:orgId", orgAccessMiddleware, asyncHandler(getOrganization));
organizationRouter.post("/orgs", platformAdminMiddleware, validateRequest(createOrganizationSchema), asyncHandler(createOrganization));
organizationRouter.put("/orgs/:orgId", orgAccessMiddleware, roleCheckMiddleware(["super_admin", "org_admin"]), validateRequest(updateOrganizationSchema), asyncHandler(updateOrganization));
organizationRouter.delete("/orgs/:orgId", platformAdminMiddleware, asyncHandler(deleteOrganization));

organizationRouter.get(
  "/orgs/:orgId/users",
  orgAccessMiddleware,
  roleCheckMiddleware(["super_admin", "org_admin"]),
  validateRequest(listOrgUsersSchema),
  asyncHandler(listOrgUsers),
);
organizationRouter.post(
  "/orgs/:orgId/users",
  orgAccessMiddleware,
  roleCheckMiddleware(["super_admin", "org_admin"]),
  validateRequest(createOrgUserSchema),
  asyncHandler(createOrgUser),
);
organizationRouter.put(
  "/orgs/:orgId/users/:userId",
  orgAccessMiddleware,
  roleCheckMiddleware(["super_admin", "org_admin"]),
  validateRequest(updateOrgUserSchema),
  asyncHandler(updateOrgUser),
);
organizationRouter.delete(
  "/orgs/:orgId/users/:userId",
  orgAccessMiddleware,
  roleCheckMiddleware(["super_admin", "org_admin"]),
  validateRequest(removeOrgUserSchema),
  asyncHandler(removeOrgUser),
);
organizationRouter.post(
  "/orgs/:orgId/users/:userId/reset-password",
  orgAccessMiddleware,
  roleCheckMiddleware(["super_admin", "org_admin"]),
  validateRequest(resetOrgUserPasswordSchema),
  asyncHandler(resetOrgUserPassword),
);