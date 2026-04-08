import { Router } from "express";
import {
  createProgram,
  deleteProgram,
  getProgram,
  listPrograms,
  updateProgram,
} from "../controllers/program.controller.js";
import { validateRequest } from "../middleware/validate-request.js";
import { createProgramSchema, listProgramsSchema, updateProgramSchema } from "../validators/program.validators.js";
import { asyncHandler } from "../utils/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rate-limit.js";

export const programRouter = Router();

programRouter.use(rateLimitMiddleware);
programRouter.use(authMiddleware);

programRouter.get("/programs", validateRequest(listProgramsSchema), asyncHandler(listPrograms));
programRouter.get("/programs/:id", asyncHandler(getProgram));
programRouter.post("/programs", validateRequest(createProgramSchema), asyncHandler(createProgram));
programRouter.put("/programs/:id", validateRequest(updateProgramSchema), asyncHandler(updateProgram));
programRouter.delete("/programs/:id", asyncHandler(deleteProgram));