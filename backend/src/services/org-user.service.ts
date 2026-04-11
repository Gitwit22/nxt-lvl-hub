import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { authUserRepository, organizationRepository, orgUserRepository } from "../database/repositories.js";
import type { AuthUserRecord } from "../models/auth.model.js";
import type { OrgUserInput, OrgUserRecord } from "../models/org-user.model.js";
import {
  createOrgUserInputSchema,
  updateOrgUserInputSchema,
} from "../validators/org-user.validators.js";
import { AppError } from "../utils/app-error.js";

const BCRYPT_ROUNDS = 12;

interface CreateOrgUserActor {
  id: string;
  email: string;
}

function generateTemporaryPassword() {
  const value = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${value.slice(0, 4)}-${value.slice(4)}`;
}

export class OrgUserService {
  async list(partitionKey: string, orgId: string) {
    const users = await orgUserRepository.list(partitionKey, orgId);

    return users
      .filter((user) => !user.deletedAt)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private async ensureOrganizationExists(partitionKey: string, orgId: string) {
    const org = await organizationRepository.findById(partitionKey, orgId);
    if (!org || org.deletedAt) {
      throw new AppError("Organization not found.", 404);
    }
  }

  private async createAuthUserWithTemporaryPassword(partitionKey: string, email: string) {
    const now = new Date().toISOString();
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const authUser: AuthUserRecord = {
      id: `auth-${crypto.randomUUID()}`,
      email,
      passwordHash,
      mustChangePassword: true,
      isPlatformAdmin: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const created = await authUserRepository.create(partitionKey, authUser);
    return { authUser: created, tempPassword, passwordWasGenerated: true };
  }

  async create(
    partitionKey: string,
    orgId: string,
    payload: OrgUserInput,
    actor: CreateOrgUserActor,
  ) {
    await this.ensureOrganizationExists(partitionKey, orgId);

    const data = createOrgUserInputSchema.parse(payload);
    const email = data.email.trim().toLowerCase();
    const actorEmail = actor.email.trim().toLowerCase();

    if (email === actorEmail) {
      throw new AppError("Use Account settings to manage your own password.", 400);
    }

    const users = await orgUserRepository.list(partitionKey, orgId);
    const duplicateByEmail = users.find((user) => !user.deletedAt && user.email.toLowerCase() === email);
    if (duplicateByEmail) {
      throw new AppError("User already exists in this organization.", 409);
    }

    let existingAuthUser = await authUserRepository.findByEmail(partitionKey, email);
    if (existingAuthUser?.deletedAt) {
      existingAuthUser = null;
    }

    let authUserId = existingAuthUser?.id ?? null;
    let tempPassword: string | undefined;
    let passwordWasGenerated = false;

    if (!existingAuthUser) {
      const created = await this.createAuthUserWithTemporaryPassword(partitionKey, email);
      authUserId = created.authUser.id;
      tempPassword = created.tempPassword;
      passwordWasGenerated = created.passwordWasGenerated;
    }

    const now = new Date().toISOString();
    const user: OrgUserRecord = {
      id: `usr-${crypto.randomUUID()}`,
      orgId,
      name: data.name.trim(),
      email,
      role: data.role,
      active: data.active ?? true,
      assignedProgramIds: data.assignedProgramIds || [],
      authUserId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const createdUser = await orgUserRepository.create(partitionKey, user);

    return {
      user: createdUser,
      tempPassword,
      passwordWasGenerated,
      existingUser: !passwordWasGenerated,
    };
  }

  async update(partitionKey: string, orgId: string, userId: string, payload: Partial<OrgUserInput>) {
    const current = await orgUserRepository.findById(partitionKey, userId);
    if (!current || current.deletedAt || current.orgId !== orgId) {
      throw new AppError("User not found.", 404);
    }

    const validated = updateOrgUserInputSchema.parse(payload);
    const nextEmail = (validated.email ?? current.email).trim().toLowerCase();
    const users = await orgUserRepository.list(partitionKey, orgId);
    const duplicate = users.find(
      (user) => !user.deletedAt && user.id !== userId && user.email.toLowerCase() === nextEmail,
    );

    if (duplicate) {
      throw new AppError("A user with that email already exists in this organization.", 409);
    }

    const updated = await orgUserRepository.update(partitionKey, userId, (user) => ({
      ...user,
      name: (validated.name ?? user.name).trim(),
      email: nextEmail,
      role: validated.role ?? user.role,
      active: validated.active ?? user.active,
      assignedProgramIds: validated.assignedProgramIds ?? user.assignedProgramIds,
      updatedAt: new Date().toISOString(),
    }));

    if (!updated) {
      throw new AppError("Unable to update user.", 500);
    }

    return updated;
  }

  async remove(partitionKey: string, orgId: string, userId: string) {
    const current = await orgUserRepository.findById(partitionKey, userId);
    if (!current || current.deletedAt || current.orgId !== orgId) {
      throw new AppError("User not found.", 404);
    }

    const deletedAt = new Date().toISOString();
    const removed = await orgUserRepository.update(partitionKey, userId, (user) => ({
      ...user,
      active: false,
      deletedAt,
      updatedAt: deletedAt,
    }));

    if (!removed) {
      throw new AppError("Unable to remove user.", 500);
    }

    return removed;
  }

  async resetPassword(
    partitionKey: string,
    orgId: string,
    userId: string,
    actor: CreateOrgUserActor,
  ) {
    const current = await orgUserRepository.findById(partitionKey, userId);
    if (!current || current.deletedAt || current.orgId !== orgId) {
      throw new AppError("User not found.", 404);
    }

    let authUser = current.authUserId
      ? await authUserRepository.findById(partitionKey, current.authUserId)
      : await authUserRepository.findByEmail(partitionKey, current.email);

    if (authUser?.deletedAt) {
      authUser = null;
    }

    if (authUser && authUser.id === actor.id) {
      throw new AppError("Use Account settings to manage your own password.", 400);
    }

    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    if (!authUser) {
      const now = new Date().toISOString();
      authUser = await authUserRepository.create(partitionKey, {
        id: `auth-${crypto.randomUUID()}`,
        email: current.email.toLowerCase(),
        passwordHash,
        mustChangePassword: true,
        isPlatformAdmin: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    } else {
      const updatedAuthUser = await authUserRepository.update(partitionKey, authUser.id, (user) => ({
        ...user,
        passwordHash,
        mustChangePassword: true,
        updatedAt: new Date().toISOString(),
      }));

      if (!updatedAuthUser) {
        throw new AppError("Target account not found.", 404);
      }

      authUser = updatedAuthUser;
    }

    if (current.authUserId !== authUser.id) {
      await orgUserRepository.update(partitionKey, userId, (user) => ({
        ...user,
        authUserId: authUser.id,
        updatedAt: new Date().toISOString(),
      }));
    }

    return {
      userId: current.id,
      email: current.email,
      tempPassword,
      mustChangePassword: true,
    };
  }
}

export const orgUserService = new OrgUserService();
