import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error.js";
import { sendError } from "../utils/response.js";

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return sendError(response, "Validation failed.", 400, error.issues.map((issue) => issue.message).join(" "));
  }

  if (error instanceof AppError) {
    return sendError(response, error.message, error.statusCode, error.message);
  }

  if (error instanceof Error) {
    return sendError(response, "Unexpected server error.", 500, error.message);
  }

  return sendError(response, "Unexpected server error.", 500, "Unknown error");
}