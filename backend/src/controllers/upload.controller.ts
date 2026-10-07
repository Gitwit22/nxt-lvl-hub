import type { Request, Response } from "express";
import { AppError } from "../utils/app-error.js";
import { sendSuccess } from "../utils/response.js";
import { uploadService } from "../services/upload.service.js";

export async function uploadLogo(request: Request, response: Response) {
  if (!request.file) {
    throw new AppError("Logo file is required.", 400);
  }

  const stored = await uploadService.storeLogo(request.file, {
    protocol: request.protocol,
    host: request.get("host") || "localhost",
  });

  return sendSuccess(
    response,
    {
      fileName: stored.fileName,
      logoUrl: stored.logoUrl,
    },
    "Logo uploaded.",
    201,
  );
}
