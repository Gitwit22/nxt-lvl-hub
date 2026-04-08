import crypto from "node:crypto";
import type { ProgramFilters, ProgramInput, ProgramRecord } from "../models/program.model.js";
import { programInputSchema } from "../validators/program.validators.js";
import { programRepository } from "../database/repositories.js";
import { uniqueSlug } from "../utils/slug.js";
import { AppError } from "../utils/app-error.js";

export class ProgramService {
  async list(filters: ProgramFilters) {
    const programs = await programRepository.list();

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

        if (filters.featured !== undefined && program.featured !== filters.featured) {
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

  async getById(id: string) {
    const program = await programRepository.findById(id);

    if (!program || program.deletedAt) {
      throw new AppError("Program not found.", 404);
    }

    return program;
  }

  async create(payload: ProgramInput) {
    const data = programInputSchema.parse(payload);
    const existingPrograms = (await programRepository.list()).filter((program) => !program.deletedAt);
    const now = new Date().toISOString();

    const program: ProgramRecord = {
      id: crypto.randomUUID(),
      slug: uniqueSlug(data.name, existingPrograms.map((program) => program.slug)),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...data,
      organizationId: data.organizationId || null,
    };

    return programRepository.create(program);
  }

  async update(id: string, payload: Partial<ProgramInput>) {
    const current = await this.getById(id);
    const merged = {
      ...current,
      ...payload,
      organizationId: payload.organizationId === undefined ? current.organizationId : payload.organizationId,
    };

    const validated = programInputSchema.parse({
      organizationId: merged.organizationId || null,
      name: merged.name,
      shortDescription: merged.shortDescription,
      longDescription: merged.longDescription,
      category: merged.category,
      status: merged.status,
      tags: merged.tags,
      logoUrl: merged.logoUrl,
      internalOrExternal: merged.internalOrExternal,
      internalRoute: merged.internalRoute,
      externalUrl: merged.externalUrl,
      featured: merged.featured,
      displayOrder: merged.displayOrder,
      loginRequired: merged.loginRequired,
      launchButtonLabel: merged.launchButtonLabel,
      notes: merged.notes,
      accentColor: merged.accentColor,
    });

    const allPrograms = await programRepository.list();
    const existingSlugs = allPrograms.filter((program) => program.id !== id && !program.deletedAt).map((program) => program.slug);
    const slug = validated.name === current.name ? current.slug : uniqueSlug(validated.name, existingSlugs);

    const updated = await programRepository.update(id, (program) => ({
      ...program,
      ...validated,
      organizationId: validated.organizationId || null,
      slug,
      updatedAt: new Date().toISOString(),
    }));

    if (!updated) {
      throw new AppError("Program not found.", 404);
    }

    return updated;
  }

  async remove(id: string) {
    const current = await this.getById(id);

    const updated = await programRepository.update(id, (program) => ({
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