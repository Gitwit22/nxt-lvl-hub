import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../utils/app-error.js";

export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

// SVG is intentionally excluded: it can carry script and would be served from a trusted origin.
export const ALLOWED_LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

function fileFilter(_request: Express.Request, file: Express.Multer.File, callback: multer.FileFilterCallback) {
  if (!(ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
    callback(new AppError("Only PNG, JPG, GIF, or WEBP images are supported.", 400));
    return;
  }

  callback(null, true);
}

// Files are buffered in memory so the upload service can verify content and
// write them to durable storage (R2) rather than the host's ephemeral disk.
const multerSingle = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_LOGO_BYTES,
    files: 1,
  },
}).single("file");

export function uploadLogoMiddleware(request: Request, response: Response, next: NextFunction) {
  multerSingle(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("Image must be 5MB or smaller.", 413));
      }
      return next(new AppError(error.message, 400));
    }
    return next(error);
  });
}
