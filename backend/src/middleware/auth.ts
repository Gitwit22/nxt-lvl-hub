import type { NextFunction, Request, Response } from "express";

export function authMiddleware(_request: Request, _response: Response, next: NextFunction) {
  next();
}