import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;
const AUTH_MAX_REQUESTS = 10;

// Purge stale entries every five minutes to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60_000).unref();

function getIp(request: Request): string {
  return (
    (request.ip as string) ||
    (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    request.socket.remoteAddress ||
    "unknown"
  );
}

function checkLimit(key: string, max: number): void {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (entry.count >= max) {
    throw new AppError("Too many requests. Please try again later.", 429);
  }

  entry.count += 1;
}

export function rateLimitMiddleware(request: Request, _response: Response, next: NextFunction) {
  try {
    checkLimit(getIp(request), MAX_REQUESTS);
    next();
  } catch (error) {
    next(error);
  }
}

export function authRateLimitMiddleware(request: Request, _response: Response, next: NextFunction) {
  try {
    checkLimit(`auth:${getIp(request)}`, AUTH_MAX_REQUESTS);
    next();
  } catch (error) {
    next(error);
  }
}