import crypto from "node:crypto";
import type { OrganizationFilters, OrganizationInput, OrganizationRecord } from "../models/organization.model.js";
import { organizationInputSchema } from "../validators/organization.validators.js";
import { organizationRepository } from "../database/repositories.js";
import { uniqueSlug } from "../utils/slug.js";
import { AppError } from "../utils/app-error.js";

function createDefaultSettings(name: string) {
  return {
    defaultWorkspace: `${name.trim()} Workspace`,
    configuration: {
      theme: "default",
      onboardingComplete: false,
    },
    placeholderRoles: ["owner"],
  };
}

export class OrganizationService {
  async list(filters: OrganizationFilters) {
    const organizations = await organizationRepository.list();

    return organizations
      .filter((organization) => !organization.deletedAt)
      .filter((organization) => {
        if (filters.status && organization.status !== filters.status) {
          return false;
        }

        if (filters.tags && filters.tags.length > 0) {
          const tagSet = new Set(organization.tags.map((tag) => tag.toLowerCase()));
          const hasAllTags = filters.tags.every((tag) => tagSet.has(tag.toLowerCase()));
          if (!hasAllTags) {
            return false;
          }
        }

        const term = filters.search || filters.name;
        if (term) {
          const haystack = [organization.name, organization.slug, organization.description, organization.ownerEmail]
            .join(" ")
            .toLowerCase();
          return haystack.includes(term.toLowerCase());
        }

        return true;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async getById(id: string) {
    const organization = await organizationRepository.findById(id);

    if (!organization || organization.deletedAt) {
      throw new AppError("Organization not found.", 404);
    }

    return organization;
  }

  async create(payload: OrganizationInput) {
    const data = organizationInputSchema.parse(payload);
    const organizations = (await organizationRepository.list()).filter((organization) => !organization.deletedAt);
    const now = new Date().toISOString();

    const organization: OrganizationRecord = {
      id: crypto.randomUUID(),
      slug: uniqueSlug(data.name, organizations.map((organization) => organization.slug)),
      settings: createDefaultSettings(data.name),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...data,
      logoUrl: data.logoUrl || null,
      ownerUserId: data.ownerUserId || null,
    };

    return organizationRepository.create(organization);
  }

  async update(id: string, payload: Partial<OrganizationInput>) {
    const current = await this.getById(id);
    const merged = {
      ...current,
      ...payload,
      logoUrl: payload.logoUrl === undefined ? current.logoUrl : payload.logoUrl,
      ownerUserId: payload.ownerUserId === undefined ? current.ownerUserId : payload.ownerUserId,
    };

    const validated = organizationInputSchema.parse({
      name: merged.name,
      description: merged.description,
      logoUrl: merged.logoUrl,
      ownerEmail: merged.ownerEmail,
      ownerUserId: merged.ownerUserId,
      status: merged.status,
      tags: merged.tags,
    });

    const organizations = await organizationRepository.list();
    const existingSlugs = organizations.filter((organization) => organization.id !== id && !organization.deletedAt).map((organization) => organization.slug);
    const slug = validated.name === current.name ? current.slug : uniqueSlug(validated.name, existingSlugs);
    const settings = validated.name === current.name ? current.settings : createDefaultSettings(validated.name);

    const updated = await organizationRepository.update(id, (organization) => ({
      ...organization,
      ...validated,
      logoUrl: validated.logoUrl || null,
      ownerUserId: validated.ownerUserId || null,
      slug,
      settings,
      updatedAt: new Date().toISOString(),
    }));

    if (!updated) {
      throw new AppError("Organization not found.", 404);
    }

    return updated;
  }

  async remove(id: string) {
    await this.getById(id);

    const updated = await organizationRepository.update(id, (organization) => ({
      ...organization,
      status: "archived",
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    if (!updated) {
      throw new AppError("Organization not found.", 404);
    }

    return updated;
  }
}

export const organizationService = new OrganizationService();