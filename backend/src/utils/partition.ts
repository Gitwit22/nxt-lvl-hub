import type { Request } from "express";
import { env } from "../config/env.js";

const PARTITION_HEADER = "x-app-partition";

export function normalizePartitionKey(input?: string | null) {
  const value = (input || "").trim().toLowerCase();
  const normalized = value.replace(/[^a-z0-9._:-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return normalized || env.appPartitionDefault;
}

export function getRequestPartition(request: Request) {
  // For authenticated requests derive partition from the trusted JWT claims,
  // ignoring any client-supplied header.
  if (request.authUser?.partition) {
    return normalizePartitionKey(request.authUser.partition);
  }

  // Unauthenticated requests (health, auth endpoints) fall back to header/query.
  const fromHeader = request.header(PARTITION_HEADER);
  const fromQuery = typeof request.query.partition === "string" ? request.query.partition : undefined;
  return normalizePartitionKey(fromHeader || fromQuery);
}

export function getPartitionHeaderName() {
  return PARTITION_HEADER;
}
