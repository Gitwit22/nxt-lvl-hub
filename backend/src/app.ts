import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import { apiRouter } from "./routes/index.js";
import { getAllowedOrigins, env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

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
  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}