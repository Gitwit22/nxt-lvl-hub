import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { getHealth } from "../controllers/health.controller.js";

export const healthRouter = Router();

healthRouter.get("/health", asyncHandler(getHealth));