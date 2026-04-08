import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/response.js";

export function notFoundMiddleware(_request: Request, response: Response, _next: NextFunction) {
  return sendError(response, "Route not found.", 404, "Not Found");
}