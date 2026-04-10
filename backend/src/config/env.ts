import path from "node:path";

function normalizePath(value: string) {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

export const env = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || "",
  uploadPath: normalizePath(process.env.UPLOAD_PATH || "backend/uploads"),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:8080",
  dataFilePath: path.resolve(process.cwd(), "backend/database/app-data.json"),
  appPartitionDefault: (process.env.APP_PARTITION_DEFAULT || "nxt-lvl-suites").trim().toLowerCase(),
  jwtSecret: process.env.JWT_SECRET || "dev-jwt-secret-change-in-production",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-jwt-refresh-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  platformSetupToken: process.env.PLATFORM_SETUP_TOKEN || "",
  platformLaunchSecret: process.env.PLATFORM_LAUNCH_TOKEN_SECRET || "dev-platform-launch-secret",
};

export function getAllowedOrigins() {
  if (env.corsOrigin.trim() === "*") {
    return "*";
  }

  return env.corsOrigin
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}
