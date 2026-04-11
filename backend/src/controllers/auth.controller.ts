/// <reference path="../types/express.d.ts" />
import type { Request, Response } from "express";
import { authService, REFRESH_COOKIE_MAX_AGE, REFRESH_COOKIE_NAME } from "../services/auth.service.js";
import { sendSuccess } from "../utils/response.js";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";

const isProduction = process.env.NODE_ENV === "production";

function setRefreshCookie(response: Response, token: string) {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: "/api/auth",
  });
}

function clearRefreshCookie(response: Response) {
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/api/auth",
  });
}

export async function login(request: Request, response: Response) {
  const { tokens, refreshToken } = await authService.login(request.body);
  setRefreshCookie(response, refreshToken);
  return sendSuccess(response, tokens, "Login successful.");
}

export async function register(request: Request, response: Response) {
  const { email, password, setupToken } = request.body as {
    email: string;
    password: string;
    setupToken?: string;
  };

  const isPlatformAdmin =
    env.platformSetupToken.length > 0 && setupToken === env.platformSetupToken;

  await authService.register({ email, password, isPlatformAdmin });

  // Auto-login: issue tokens immediately so the client skips a second round trip.
  const { tokens, refreshToken: rt } = await authService.login({ email, password });
  setRefreshCookie(response, rt);
  return sendSuccess(response, tokens, "Account created.", 201);
}

export async function logout(_request: Request, response: Response) {
  clearRefreshCookie(response);
  return sendSuccess(response, null, "Logged out.");
}

export async function refresh(request: Request, response: Response) {
  const cookies = request.cookies as Record<string, string | undefined>;
  const rawToken = cookies[REFRESH_COOKIE_NAME];

  if (!rawToken) {
    throw new AppError("No refresh token provided.", 401);
  }

  const { tokens, refreshToken } = await authService.refreshTokens(rawToken);
  setRefreshCookie(response, refreshToken);
  return sendSuccess(response, tokens, "Token refreshed.");
}

export async function me(request: Request, response: Response) {
  const authUser = request.authUser!;
  const profile = await authService.getMe(authUser.id, authUser.partition);
  return sendSuccess(response, profile, "Profile retrieved.");
}

export async function launchToken(request: Request, response: Response) {
  const authUser = request.authUser!;
  const { organizationId, programDomain } = request.body as {
    organizationId: string;
    programDomain: string;
  };

  if (!organizationId || !programDomain) {
    throw new AppError("organizationId and programDomain are required.", 400);
  }

  const token = await authService.generateLaunchToken(
    authUser.id,
    authUser.email,
    authUser.partition,
    organizationId,
    programDomain,
  );

  return sendSuccess(response, { launchToken: token }, "Launch token issued.");
}

export async function bootstrapAdmin(request: Request, response: Response) {
  const authUser = request.authUser!;
  const { setupToken } = request.body as { setupToken: string };

  const upgraded = await authService.bootstrapPlatformAdmin(
    authUser.id,
    authUser.partition,
    setupToken,
  );

  const { tokens, refreshToken } = authService.issueTokens(upgraded, authUser.partition);
  setRefreshCookie(response, refreshToken);
  return sendSuccess(response, tokens, "Platform admin access granted.");
}

export async function setPassword(request: Request, response: Response) {
  const authUser = request.authUser!;
  const { newPassword } = request.body as { newPassword: string };

  if (!newPassword || newPassword.length < 8) {
    throw new AppError("Password must be at least 8 characters.", 400);
  }

  await authService.setPassword(authUser.id, authUser.partition, newPassword);
  return sendSuccess(response, null, "Password set.");
}

export async function changePassword(request: Request, response: Response) {
  const authUser = request.authUser!;
  const { currentPassword, newPassword } = request.body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!currentPassword || currentPassword.length < 1) {
    throw new AppError("Current password is required.", 400);
  }

  if (!newPassword || newPassword.length < 8) {
    throw new AppError("Password must be at least 8 characters.", 400);
  }

  await authService.changePassword(authUser.id, authUser.partition, currentPassword, newPassword);
  return sendSuccess(response, null, "Password updated.");
}

export async function completeForceReset(request: Request, response: Response) {
  const authUser = request.authUser!;
  const { newPassword } = request.body as { newPassword: string };

  if (!newPassword || newPassword.length < 8) {
    throw new AppError("Password must be at least 8 characters.", 400);
  }

  await authService.completeForceReset(authUser.id, authUser.partition, newPassword);
  return sendSuccess(response, null, "Password reset complete.");
}
