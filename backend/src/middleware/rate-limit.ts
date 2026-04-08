import type { NextFunction, Request, Response } from "express";

export function rateLimitMiddleware(_request: Request, _response: Response, next: NextFunction) {
  next();
}