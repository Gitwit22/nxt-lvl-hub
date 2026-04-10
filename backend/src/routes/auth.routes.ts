import { Router } from "express";
import { bootstrapAdmin, launchToken, login, logout, me, refresh, register } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate-request.js";
import { asyncHandler } from "../utils/async-handler.js";
import { authRateLimitMiddleware } from "../middleware/rate-limit.js";
import { bootstrapAdminSchema, loginSchema, registerSchema } from "../validators/auth.validators.js";

export const authRouter = Router();

authRouter.post("/auth/login", authRateLimitMiddleware, validateRequest(loginSchema), asyncHandler(login));
authRouter.post("/auth/register", authRateLimitMiddleware, validateRequest(registerSchema), asyncHandler(register));
authRouter.post("/auth/logout", asyncHandler(logout));
authRouter.post("/auth/refresh", authRateLimitMiddleware, asyncHandler(refresh));
authRouter.get("/auth/me", authMiddleware, asyncHandler(me));
authRouter.post("/auth/launch-token", authMiddleware, asyncHandler(launchToken));
authRouter.post(
	"/auth/bootstrap-admin",
	authMiddleware,
	validateRequest(bootstrapAdminSchema),
	asyncHandler(bootstrapAdmin),
);
