import { Router } from "express";
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  listOrganizations,
  updateOrganization,
} from "../controllers/organization.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { orgAccessMiddleware } from "../middleware/org-access.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";
import { roleCheckMiddleware } from "../middleware/role-check.js";
import { validateRequest } from "../middleware/validate-request.js";
import {
  createOrganizationSchema,
  listOrganizationsSchema,
  updateOrganizationSchema,
} from "../validators/organization.validators.js";
import { asyncHandler } from "../utils/async-handler.js";

export const organizationRouter = Router();

organizationRouter.use(rateLimitMiddleware);
organizationRouter.use(authMiddleware);

organizationRouter.get("/orgs", validateRequest(listOrganizationsSchema), asyncHandler(listOrganizations));
organizationRouter.get("/orgs/:id", orgAccessMiddleware, asyncHandler(getOrganization));
organizationRouter.post("/orgs", roleCheckMiddleware(["owner", "admin"]), validateRequest(createOrganizationSchema), asyncHandler(createOrganization));
organizationRouter.put("/orgs/:id", orgAccessMiddleware, validateRequest(updateOrganizationSchema), asyncHandler(updateOrganization));
organizationRouter.delete("/orgs/:id", orgAccessMiddleware, asyncHandler(deleteOrganization));