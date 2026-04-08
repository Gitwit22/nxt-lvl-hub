import { Router } from "express";
import { uploadLogo } from "../controllers/upload.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { uploadLogoMiddleware } from "../config/upload.js";
import { authMiddleware } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";

export const uploadRouter = Router();

uploadRouter.post("/uploads/logo", rateLimitMiddleware, authMiddleware, uploadLogoMiddleware, asyncHandler(uploadLogo));