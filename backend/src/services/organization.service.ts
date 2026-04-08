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
  async list(partitionKey: string, filters: OrganizationFilters) {
    const organizations = await organizationRepository.list(partitionKey);

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
          const haystack = [
            organization.name,
            organization.slug,
            organization.subdomain,
            organization.description,
            organization.contactEmail,
            organization.supportEmail,
            organization.ownerEmail,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(term.toLowerCase());
        }

        return true;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async getById(partitionKey: string, id: string) {
    const organization = await organizationRepository.findById(partitionKey, id);

    if (!organization || organization.deletedAt) {
      throw new AppError("Organization not found.", 404);
    }

    return organization;
  }

  async create(partitionKey: string, payload: OrganizationInput) {
    const data = organizationInputSchema.parse(payload);
    const organizations = (await organizationRepository.list(partitionKey)).filter((organization) => !organization.deletedAt);
    const now = new Date().toISOString();

    const duplicateSubdomain = organizations.find(
      (o) => o.subdomain.toLowerCase() === data.subdomain.toLowerCase(),
    );
    if (duplicateSubdomain) {
      throw new AppError("That subdomain is already in use.", 409);
    }

    const organization: OrganizationRecord = {
      id: data.id || crypto.randomUUID(),
      slug: data.slug || uniqueSlug(data.name, organizations.map((entry) => entry.slug)),
      settings: createDefaultSettings(data.name),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...data,
      contactEmail: data.contactEmail,
      supportEmail: data.supportEmail,
      supportContactName: data.supportContactName,
      phoneNumber: data.phoneNumber,
      industryType: data.industryType,
      notes: data.notes,
      logoUrl: data.logoUrl || null,
      bannerUrl: data.bannerUrl || null,
      trialEndsAt: data.trialEndsAt || null,
      lastActivityAt: data.lastActivityAt || now,
      ownerUserId: data.ownerUserId || null,
    };

    return organizationRepository.create(partitionKey, organization);
  }

  async update(partitionKey: string, id: string, payload: Partial<OrganizationInput>) {
    const current = await this.getById(partitionKey, id);
    const merged = {
      ...current,
      ...payload,
      logoUrl: payload.logoUrl === undefined ? current.logoUrl : payload.logoUrl,
      bannerUrl: payload.bannerUrl === undefined ? current.bannerUrl : payload.bannerUrl,
      trialEndsAt: payload.trialEndsAt === undefined ? current.trialEndsAt : payload.trialEndsAt,
      ownerUserId: payload.ownerUserId === undefined ? current.ownerUserId : payload.ownerUserId,
    };

    const validated = organizationInputSchema.parse({
      id: current.id,
      slug: current.slug,
      name: merged.name,
      description: merged.description,
      subdomain: merged.subdomain,
      contactEmail: merged.contactEmail,
      logo: merged.logo,
      logoUrl: merged.logoUrl,
      bannerUrl: merged.bannerUrl,
      welcomeMessage: merged.welcomeMessage,
      supportEmail: merged.supportEmail,
      supportContactName: merged.supportContactName,
      phoneNumber: merged.phoneNumber,
      industryType: merged.industryType,
      notes: merged.notes,
      planType: merged.planType,
      seatLimit: merged.seatLimit,
      trialEndsAt: merged.trialEndsAt,
      lastActivityAt: merged.lastActivityAt,
      branding: merged.branding,
      assignedProgramIds: merged.assignedProgramIds,
      assignedBundleIds: merged.assignedBundleIds,
      announcements: merged.announcements,
      ownerEmail: merged.ownerEmail,
      ownerUserId: merged.ownerUserId,
      status: merged.status,
      tags: merged.tags,
    });

    const organizations = await organizationRepository.list(partitionKey);
    const existingSlugs = organizations.filter((entry) => entry.id !== id && !entry.deletedAt).map((entry) => entry.slug);
    const slug = validated.name === current.name ? current.slug : uniqueSlug(validated.name, existingSlugs);
    const settings = validated.name === current.name ? current.settings : createDefaultSettings(validated.name);

    const duplicateSubdomain = organizations
      .filter((o) => o.id !== id && !o.deletedAt)
      .find((o) => o.subdomain.toLowerCase() === validated.subdomain.toLowerCase());
    if (duplicateSubdomain) {
      throw new AppError("That subdomain is already in use.", 409);
    }

    const updated = await organizationRepository.update(partitionKey, id, (organization) => ({
      ...organization,
      ...validated,
      logoUrl: validated.logoUrl || null,
      bannerUrl: validated.bannerUrl || null,
      trialEndsAt: validated.trialEndsAt || null,
      ownerUserId: validated.ownerUserId || null,
      slug,
      settings,
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    }));

    if (!updated) {
      throw new AppError("Organization not found.", 404);
    }

    return updated;
  }

  async remove(partitionKey: string, id: string) {
    await this.getById(partitionKey, id);

    const updated = await organizationRepository.update(partitionKey, id, (organization) => ({
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
