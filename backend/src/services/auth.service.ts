import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authUserRepository, organizationRepository, orgUserRepository } from "../database/repositories.js";
import type {
  AuthTokenClaims,
  AuthTokens,
  AuthUserInput,
  AuthUserRecord,
  MeResponse,
  RefreshTokenClaims,
} from "../models/auth.model.js";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";

const BCRYPT_ROUNDS = 12;

export const REFRESH_COOKIE_NAME = "refresh_token";
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Stable invalid hash for constant-time comparisons when no user is found.
// Pre-hashed so bcrypt.compare still runs its full work factor.
const DUMMY_HASH = "$2b$12$invalidhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

export class AuthService {
  async hasPlatformAdmin(partition: string): Promise<boolean> {
    const users = await authUserRepository.list(partition);
    return users.some((u) => u.isPlatformAdmin && !u.deletedAt);
  }

  async register(input: AuthUserInput): Promise<AuthUserRecord> {
    const partition = env.appPartitionDefault;
    const email = input.email.trim().toLowerCase();

    const existing = await authUserRepository.findByEmail(partition, email);
    if (existing && !existing.deletedAt) {
      throw new AppError("An account with that email already exists.", 409);
    }

    if (input.isPlatformAdmin) {
      const adminAlreadyExists = await this.hasPlatformAdmin(partition);
      if (adminAlreadyExists) {
        throw new AppError("Platform admin has already been initialized.", 403);
      }
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const now = new Date().toISOString();

    const user: AuthUserRecord = {
      id: `auth-${crypto.randomUUID()}`,
      email,
      passwordHash,
      isPlatformAdmin: input.isPlatformAdmin === true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const created = await authUserRepository.create(partition, user);

    // Auto-link any existing OrgUser records with matching email.
    await orgUserRepository.linkAuthUser(partition, email, created.id);

    return created;
  }

  async login(input: AuthUserInput): Promise<{ tokens: AuthTokens; refreshToken: string }> {
    const partition = env.appPartitionDefault;
    const email = input.email.trim().toLowerCase();

    const user = await authUserRepository.findByEmail(partition, email);

    // Always run bcrypt to prevent timing oracle attacks.
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const valid = await bcrypt.compare(input.password, hash);

    if (!user || user.deletedAt || !valid) {
      throw new AppError("Invalid email or password.", 401);
    }

    return this.issueTokens(user, partition);
  }

  async refreshTokens(rawRefreshToken: string): Promise<{ tokens: AuthTokens; refreshToken: string }> {
    let claims: RefreshTokenClaims & { iat: number; exp: number };

    try {
      claims = jwt.verify(rawRefreshToken, env.jwtRefreshSecret) as typeof claims;
    } catch {
      throw new AppError("Invalid or expired refresh token.", 401);
    }

    if (claims.type !== "refresh") {
      throw new AppError("Invalid token type.", 401);
    }

    const user = await authUserRepository.findById(claims.partition, claims.sub);
    if (!user || user.deletedAt) {
      throw new AppError("Account not found.", 401);
    }

    return this.issueTokens(user, claims.partition);
  }

  async getMe(authUserId: string, partition: string): Promise<MeResponse> {
    const user = await authUserRepository.findById(partition, authUserId);
    if (!user || user.deletedAt) {
      throw new AppError("Account not found.", 401);
    }

    const orgUsers = await orgUserRepository.listByAuthUserId(partition, authUserId);
    const orgs = await organizationRepository.list(partition);
    const orgMap = new Map(orgs.map((o) => [o.id, o]));

    const orgMemberships = orgUsers
      .filter((u) => u.active)
      .map((u) => ({
        orgId: u.orgId,
        orgName: orgMap.get(u.orgId)?.name ?? "Unknown",
        role: u.role,
        active: u.active,
      }));

    return {
      id: user.id,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
      orgMemberships,
    };
  }

  async bootstrapPlatformAdmin(authUserId: string, partition: string, setupToken: string) {
    if (!env.platformSetupToken || env.platformSetupToken.length === 0) {
      throw new AppError("Platform setup token is not configured.", 403);
    }

    if (setupToken !== env.platformSetupToken) {
      throw new AppError("Invalid platform setup token.", 403);
    }

    const requester = await authUserRepository.findById(partition, authUserId);
    if (!requester || requester.deletedAt) {
      throw new AppError("Account not found.", 401);
    }

    if (requester.isPlatformAdmin) {
      return requester;
    }

    const adminAlreadyExists = await this.hasPlatformAdmin(partition);
    if (adminAlreadyExists) {
      throw new AppError("Platform admin has already been initialized.", 403);
    }

    const updated = await authUserRepository.update(partition, authUserId, (u) => ({
      ...u,
      isPlatformAdmin: true,
      updatedAt: new Date().toISOString(),
    }));

    if (!updated) {
      throw new AppError("Account not found.", 401);
    }

    return updated;
  }

  issueTokens(user: AuthUserRecord, partition: string): { tokens: AuthTokens; refreshToken: string } {
    const accessClaims: AuthTokenClaims = {
      sub: user.id,
      email: user.email,
      partition,
      isPlatformAdmin: user.isPlatformAdmin,
    };

    const accessToken = jwt.sign(accessClaims, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    } as Parameters<typeof jwt.sign>[2]);

    const refreshClaims: RefreshTokenClaims = {
      sub: user.id,
      partition,
      type: "refresh",
    };

    const refreshToken = jwt.sign(refreshClaims, env.jwtRefreshSecret, {
      expiresIn: env.jwtRefreshExpiresIn,
    } as Parameters<typeof jwt.sign>[2]);

    const decoded = jwt.decode(accessToken) as { exp: number };

    return {
      tokens: { accessToken, expiresIn: decoded.exp },
      refreshToken,
    };
  }
}

export const authService = new AuthService();
