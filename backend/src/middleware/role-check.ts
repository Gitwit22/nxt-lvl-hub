import type { NextFunction, Request, Response } from "express";

export function roleCheckMiddleware(_roles: string[]) {
  return (_request: Request, _response: Response, next: NextFunction) => {
    next();
  };
}