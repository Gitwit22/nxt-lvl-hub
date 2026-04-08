import express from "express";
import cors from "cors";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";
import { apiRouter } from "./routes/index.js";
import { getAllowedOrigins, env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();
  const distPath = path.resolve(process.cwd(), "dist");
  const distIndexPath = path.join(distPath, "index.html");
  const hasBuiltFrontend = fs.existsSync(distIndexPath);

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: allowedOrigins === "*" ? true : allowedOrigins,
      credentials: true,
    }),
  );
  app.use(morgan("dev"));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(path.resolve(env.uploadPath)));
  app.use("/api", apiRouter);

  if (hasBuiltFrontend) {
    app.use(express.static(distPath));

    app.get(/^(?!\/api\/|\/uploads\/).*/, (_request, response) => {
      response.sendFile(distIndexPath);
    });
  }

  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}