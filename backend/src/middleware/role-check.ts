import type { NextFunction, Request, Response } from "express";
import type { OrgUserRole } from "../models/org-user.model.js";
import { AppError } from "../utils/app-error.js";

export function roleCheckMiddleware(allowedRoles: OrgUserRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    // Platform admins bypass role checks.
    if (request.authUser?.isPlatformAdmin) {
      return next();
    }

    const membership = request.orgMembership;
    if (!membership) {
      return next(new AppError("Organization membership required.", 403));
    }

    if (!allowedRoles.includes(membership.role)) {
      return next(new AppError("Insufficient permissions.", 403));
    }

    next();
  };
}