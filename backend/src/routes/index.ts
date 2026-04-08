import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { organizationRouter } from "./organization.routes.js";
import { programRouter } from "./program.routes.js";
import { uploadRouter } from "./upload.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(programRouter);
apiRouter.use(organizationRouter);
apiRouter.use(uploadRouter);