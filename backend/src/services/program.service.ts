import crypto from "node:crypto";
import type { ProgramFilters, ProgramInput, ProgramRecord } from "../models/program.model.js";
import { programInputSchema } from "../validators/program.validators.js";
import { programRepository } from "../database/repositories.js";
import { uniqueSlug } from "../utils/slug.js";
import { AppError } from "../utils/app-error.js";

export class ProgramService {
  async list(partitionKey: string, filters: ProgramFilters) {
    const programs = await programRepository.list(partitionKey);

    return programs
      .filter((program) => !program.deletedAt)
      .filter((program) => {
        if (filters.organizationId && program.organizationId !== filters.organizationId) {
          return false;
        }

        if (filters.category && program.category.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }

        if (filters.status && program.status !== filters.status) {
          return false;
        }

        if (filters.featured !== undefined && program.isFeatured !== filters.featured) {
          return false;
        }

        if (filters.tags && filters.tags.length > 0) {
          const tagSet = new Set(program.tags.map((tag) => tag.toLowerCase()));
          const hasAllTags = filters.tags.every((tag) => tagSet.has(tag.toLowerCase()));
          if (!hasAllTags) {
            return false;
          }
        }

        if (filters.search) {
          const haystack = [program.name, program.shortDescription, program.longDescription]
            .join(" ")
            .toLowerCase();
          return haystack.includes(filters.search.toLowerCase());
        }

        return true;
      })
      .sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name));
  }

  async getById(partitionKey: string, id: string) {
    const program = await programRepository.findById(partitionKey, id);

    if (!program || program.deletedAt) {
      throw new AppError("Program not found.", 404);
    }

    return program;
  }

  async create(partitionKey: string, payload: ProgramInput) {
    const data = programInputSchema.parse(payload);
    const existingPrograms = (await programRepository.list(partitionKey)).filter((program) => !program.deletedAt);
    const now = new Date().toISOString();

    const program: ProgramRecord = {
      id: data.id || crypto.randomUUID(),
      slug: data.slug || uniqueSlug(data.name, existingPrograms.map((entry) => entry.slug)),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...data,
      organizationId: data.organizationId || null,
      secondaryCategory: data.secondaryCategory || null,
      logoUrl: data.logoUrl || null,
      screenshotUrl: data.screenshotUrl || null,
      internalRoute: data.internalRoute || null,
      externalUrl: data.externalUrl || null,
      accentColor: data.accentColor || null,
      cardBackgroundColor: data.cardBackgroundColor || null,
      cardBackgroundOpacity: data.cardBackgroundOpacity ?? null,
      cardGlowColor: data.cardGlowColor || null,
      cardGlowOpacity: data.cardGlowOpacity ?? null,
      cardHoverTintOpacity: data.cardHoverTintOpacity ?? null,
      adminOnly: data.adminOnly,
    };

    return programRepository.create(partitionKey, program);
  }

  async update(partitionKey: string, id: string, payload: Partial<ProgramInput>) {
    const current = await this.getById(partitionKey, id);
    const merged = {
      ...current,
      ...payload,
      organizationId: payload.organizationId === undefined ? current.organizationId : payload.organizationId,
    };

    const validated = programInputSchema.parse({
      id: current.id,
      slug: current.slug,
      organizationId: merged.organizationId || null,
      name: merged.name,
      shortDescription: merged.shortDescription,
      longDescription: merged.longDescription,
      category: merged.category,
      secondaryCategory: merged.secondaryCategory,
      status: merged.status,
      tags: merged.tags,
      logoUrl: merged.logoUrl,
      screenshotUrl: merged.screenshotUrl,
      type: merged.type,
      origin: merged.origin,
      internalRoute: merged.internalRoute,
      externalUrl: merged.externalUrl,
      openInNewTab: merged.openInNewTab,
      cardBackgroundColor: merged.cardBackgroundColor,
      cardBackgroundOpacity: merged.cardBackgroundOpacity,
      cardGlowColor: merged.cardGlowColor,
      cardGlowOpacity: merged.cardGlowOpacity,
      cardHoverTintOpacity: merged.cardHoverTintOpacity,
      adminOnly: merged.adminOnly,
      isFeatured: merged.isFeatured,
      isPublic: merged.isPublic,
      requiresLogin: merged.requiresLogin,
      requiresApproval: merged.requiresApproval,
      displayOrder: merged.displayOrder,
      launchLabel: merged.launchLabel,
      notes: merged.notes,
      accentColor: merged.accentColor,
    });

    const allPrograms = await programRepository.list(partitionKey);
    const existingSlugs = allPrograms.filter((entry) => entry.id !== id && !entry.deletedAt).map((entry) => entry.slug);
    const slug = validated.name === current.name ? current.slug : uniqueSlug(validated.name, existingSlugs);

    const updated = await programRepository.update(partitionKey, id, (program) => ({
      ...program,
      ...validated,
      organizationId: validated.organizationId || null,
      secondaryCategory: validated.secondaryCategory || null,
      logoUrl: validated.logoUrl || null,
      screenshotUrl: validated.screenshotUrl || null,
      internalRoute: validated.internalRoute || null,
      externalUrl: validated.externalUrl || null,
      accentColor: validated.accentColor || null,
      cardBackgroundColor: validated.cardBackgroundColor || null,
      cardBackgroundOpacity: validated.cardBackgroundOpacity ?? null,
      cardGlowColor: validated.cardGlowColor || null,
      cardGlowOpacity: validated.cardGlowOpacity ?? null,
      cardHoverTintOpacity: validated.cardHoverTintOpacity ?? null,
      adminOnly: validated.adminOnly,
      slug,
      updatedAt: new Date().toISOString(),
    }));

    if (!updated) {
      throw new AppError("Program not found.", 404);
    }

    return updated;
  }

  async remove(partitionKey: string, id: string) {
    const current = await this.getById(partitionKey, id);

    const updated = await programRepository.update(partitionKey, id, (program) => ({
      ...program,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: current.status === "archived" ? current.status : "archived",
    }));

    if (!updated) {
      throw new AppError("Program not found.", 404);
    }

    return updated;
  }
}

export const programService = new ProgramService();
