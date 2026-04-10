import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import type { AuthTokenClaims } from "../models/auth.model.js";

export function authMiddleware(request: Request, _response: Response, next: NextFunction) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return next(new AppError("Authentication required.", 401));
  }

  const token = authorization.slice(7);

  try {
    const claims = jwt.verify(token, env.jwtSecret) as AuthTokenClaims & { iat: number; exp: number };
    request.authUser = {
      id: claims.sub,
      email: claims.email,
      partition: claims.partition,
      isPlatformAdmin: claims.isPlatformAdmin,
    };
    next();
  } catch {
    next(new AppError("Invalid or expired token.", 401));
  }
}

export function platformAdminMiddleware(request: Request, _response: Response, next: NextFunction) {
  if (!request.authUser?.isPlatformAdmin) {
    return next(new AppError("Platform admin access required.", 403));
  }
  next();
}

export function optionalAuthMiddleware(request: Request, _response: Response, next: NextFunction) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return next();
  }

  const token = authorization.slice(7);

  try {
    const claims = jwt.verify(token, env.jwtSecret) as AuthTokenClaims & { iat: number; exp: number };
    request.authUser = {
      id: claims.sub,
      email: claims.email,
      partition: claims.partition,
      isPlatformAdmin: claims.isPlatformAdmin,
    };
    return next();
  } catch {
    return next();
  }
}