import type { NextFunction, Request, Response } from "express";
import { orgUserRepository } from "../database/repositories.js";
import { AppError } from "../utils/app-error.js";

export function orgAccessMiddleware(request: Request, response: Response, next: NextFunction) {
  checkOrgAccess(request, next).catch(next);
}

async function checkOrgAccess(request: Request, next: NextFunction) {
  const authUser = request.authUser;

  if (!authUser) {
    return next(new AppError("Authentication required.", 401));
  }

  // Platform admins bypass org membership checks.
  if (authUser.isPlatformAdmin) {
    return next();
  }

  const rawOrgId = request.params.orgId ?? request.params.id ?? "";
  const orgId = (Array.isArray(rawOrgId) ? rawOrgId[0] : rawOrgId).trim();
  if (!orgId) {
    return next(new AppError("Organization ID is required.", 400));
  }

  const membership = await orgUserRepository.findByAuthUserId(authUser.partition, authUser.id, orgId);

  if (!membership || membership.deletedAt || !membership.active) {
    return next(new AppError("Access denied.", 403));
  }

  request.orgMembership = {
    orgId: membership.orgId,
    role: membership.role,
    userId: membership.id,
  };

  next();
}