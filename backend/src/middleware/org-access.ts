import type { NextFunction, Request, Response } from "express";

export function orgAccessMiddleware(_request: Request, _response: Response, next: NextFunction) {
  next();
}