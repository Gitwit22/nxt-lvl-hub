import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";
import { organizationRouter } from "./organization.routes.js";
import { programRouter } from "./program.routes.js";
import { uploadRouter } from "./upload.routes.js";
import { portalRouter } from "./portal.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(programRouter);
apiRouter.use(organizationRouter);
apiRouter.use(uploadRouter);
apiRouter.use(portalRouter);