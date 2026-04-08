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
  appPartitionDefault: (process.env.APP_PARTITION_DEFAULT || "nxt-lvl-hub").trim().toLowerCase(),
};

export function getAllowedOrigins() {
  if (env.corsOrigin.trim() === "*") {
    return "*";
  }

  return env.corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
