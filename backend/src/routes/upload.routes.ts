import { Router } from "express";
import { uploadLogo } from "../controllers/upload.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { uploadLogoMiddleware } from "../config/upload.js";

export const uploadRouter = Router();

uploadRouter.post("/uploads/logo", uploadLogoMiddleware, asyncHandler(uploadLogo));