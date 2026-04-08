import type { Response } from "express";
import type { ApiResponse } from "../models/api.model.js";

export function sendSuccess<T>(response: Response, data: T, message: string, statusCode = 200) {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    message,
    error: null,
  };

  return response.status(statusCode).json(payload);
}

export function sendError(response: Response, message: string, statusCode = 400, error: string | null = null) {
  const payload: ApiResponse<null> = {
    success: false,
    data: null,
    message,
    error: error || message,
  };

  return response.status(statusCode).json(payload);
}