import { Router } from "express";
import { getPortalBootstrap, getPortalStatus } from "../controllers/portal.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";
import { optionalAuthMiddleware } from "../middleware/auth.js";

export const portalRouter = Router();

portalRouter.use(rateLimitMiddleware);

portalRouter.get("/portal/bootstrap", optionalAuthMiddleware, asyncHandler(getPortalBootstrap));

// GET /api/organization/portal-status?slug=detroitchurch
// GET /api/organization/portal-status?subdomain=detroitchurch
portalRouter.get("/organization/portal-status", asyncHandler(getPortalStatus));
