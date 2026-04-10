import type { NextFunction, Request, Response } from "express";
import { orgUserRepository } from "../database/repositories.js";
import { AppError } from "../utils/app-error.js";

export async function portalMembershipMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const authUser = request.authUser;
  const resolvedOrganization = request.resolvedOrganization;

  if (!resolvedOrganization) {
    return next(new AppError("Portal context not resolved.", 400));
  }

  if (!authUser) {
    return next(new AppError("Authentication required.", 401));
  }

  if (authUser.isPlatformAdmin) {
    return next();
  }

  const membership = await orgUserRepository.findByAuthUserId(
    authUser.partition,
    authUser.id,
    resolvedOrganization.id,
  );

  if (!membership || membership.deletedAt || !membership.active) {
    return next(new AppError("Access denied.", 403));
  }

  request.orgMembership = {
    orgId: membership.orgId,
    role: membership.role,
    userId: membership.id,
  };

  return next();
}
