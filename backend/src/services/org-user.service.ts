import crypto from "node:crypto";
import { orgUserRepository } from "../database/repositories.js";
import type { OrgUserInput, OrgUserRecord } from "../models/org-user.model.js";
import { orgUserInputSchema } from "../validators/org-user.validators.js";
import { AppError } from "../utils/app-error.js";

export class OrgUserService {
  async list(partitionKey: string, orgId: string) {
    const users = await orgUserRepository.list(partitionKey, orgId);

    return users
      .filter((user) => !user.deletedAt)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async create(partitionKey: string, orgId: string, payload: OrgUserInput) {
    const data = orgUserInputSchema.parse(payload);
    const users = await orgUserRepository.list(partitionKey, orgId);
    const email = data.email.trim().toLowerCase();

    const duplicate = users.find((user) => !user.deletedAt && user.email.toLowerCase() === email);
    if (duplicate) {
      throw new AppError("A user with that email already exists in this organization.", 409);
    }

    const now = new Date().toISOString();
    const user: OrgUserRecord = {
      id: data.id || `usr-${crypto.randomUUID()}`,
      orgId,
      name: data.name.trim(),
      email,
      role: data.role,
      active: data.active ?? true,
      assignedProgramIds: data.assignedProgramIds || [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    return orgUserRepository.create(partitionKey, user);
  }

  async update(partitionKey: string, orgId: string, userId: string, payload: Partial<OrgUserInput>) {
    const current = await orgUserRepository.findById(partitionKey, userId);
    if (!current || current.deletedAt || current.orgId !== orgId) {
      throw new AppError("User not found.", 404);
    }

    const merged: OrgUserInput = {
      id: current.id,
      orgId: current.orgId,
      name: payload.name ?? current.name,
      email: payload.email ?? current.email,
      role: payload.role ?? current.role,
      active: payload.active ?? current.active,
      assignedProgramIds: payload.assignedProgramIds ?? current.assignedProgramIds,
    };

    const validated = orgUserInputSchema.parse(merged);
    const nextEmail = validated.email.trim().toLowerCase();
    const users = await orgUserRepository.list(partitionKey, orgId);
    const duplicate = users.find(
      (user) => !user.deletedAt && user.id !== userId && user.email.toLowerCase() === nextEmail,
    );

    if (duplicate) {
      throw new AppError("A user with that email already exists in this organization.", 409);
    }

    const updated = await orgUserRepository.update(partitionKey, userId, (user) => ({
      ...user,
      name: validated.name.trim(),
      email: nextEmail,
      role: validated.role,
      active: validated.active ?? true,
      assignedProgramIds: validated.assignedProgramIds || [],
      updatedAt: new Date().toISOString(),
    }));

    if (!updated) {
      throw new AppError("Unable to update user.", 500);
    }

    return updated;
  }
}

export const orgUserService = new OrgUserService();
