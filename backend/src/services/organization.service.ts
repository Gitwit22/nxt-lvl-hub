import crypto from "node:crypto";
import type { OrganizationFilters, OrganizationInput, OrganizationRecord } from "../models/organization.model.js";
import { organizationInputSchema } from "../validators/organization.validators.js";
import { organizationRepository } from "../database/repositories.js";
import { uniqueSlug } from "../utils/slug.js";
import { AppError } from "../utils/app-error.js";
import { isReservedPortalSubdomain } from "../utils/portal-host.js";

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
    const generatedSlug = data.slug || uniqueSlug(data.name, organizations.map((entry) => entry.slug));
    const portalSlug = generatedSlug.trim().toLowerCase();

    if (isReservedPortalSubdomain(portalSlug) || isReservedPortalSubdomain(data.subdomain)) {
      throw new AppError("That subdomain is reserved and cannot be used.", 409);
    }

    const duplicateSubdomain = organizations.find(
      (o) => o.subdomain.toLowerCase() === portalSlug,
    );
    if (duplicateSubdomain) {
      throw new AppError("That subdomain is already in use.", 409);
    }

    const organization: OrganizationRecord = {
      id: data.id || crypto.randomUUID(),
      slug: generatedSlug,
      settings: createDefaultSettings(data.name),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...data,
      subdomain: portalSlug,
      contactEmail: data.contactEmail,
      supportEmail: data.supportEmail,
      supportContactName: data.supportContactName,
      phoneNumber: data.phoneNumber,
      industryType: data.industryType,
      notes: data.notes,
      logoUrl: data.logoUrl || null,
      faviconUrl: data.faviconUrl || null,
      bannerUrl: data.bannerUrl || null,
      backgroundUrl: data.backgroundUrl || null,
      trialEndsAt: data.trialEndsAt || null,
      lastActivityAt: data.lastActivityAt || now,
      ownerUserId: data.ownerUserId || null,
      billingPlan: data.billingPlan || null,
      customDomain: data.customDomain || null,
      enabledModules: data.enabledModules || [],
      supportPhone: data.supportPhone || "",
      portalTitle: data.portalTitle || "",
    };

    return organizationRepository.create(partitionKey, organization);
  }

  async update(partitionKey: string, id: string, payload: Partial<OrganizationInput>) {
    const current = await this.getById(partitionKey, id);
    const merged = {
      ...current,
      ...payload,
      logoUrl: payload.logoUrl === undefined ? current.logoUrl : payload.logoUrl,
      faviconUrl: payload.faviconUrl === undefined ? current.faviconUrl : payload.faviconUrl,
      bannerUrl: payload.bannerUrl === undefined ? current.bannerUrl : payload.bannerUrl,
      backgroundUrl: payload.backgroundUrl === undefined ? current.backgroundUrl : payload.backgroundUrl,
      trialEndsAt: payload.trialEndsAt === undefined ? current.trialEndsAt : payload.trialEndsAt,
      ownerUserId: payload.ownerUserId === undefined ? current.ownerUserId : payload.ownerUserId,
      billingPlan: payload.billingPlan === undefined ? current.billingPlan : payload.billingPlan,
      customDomain: payload.customDomain === undefined ? current.customDomain : payload.customDomain,
      enabledModules: payload.enabledModules === undefined ? current.enabledModules : payload.enabledModules,
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
      backgroundUrl: merged.backgroundUrl,
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
      enabledModules: merged.enabledModules || [],
      assignedBundleIds: merged.assignedBundleIds,
      announcements: merged.announcements,
      ownerEmail: merged.ownerEmail,
      ownerUserId: merged.ownerUserId,
      customDomain: merged.customDomain,
      billingPlan: merged.billingPlan,
      supportPhone: merged.supportPhone || "",
      portalTitle: merged.portalTitle || "",
      faviconUrl: merged.faviconUrl,
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

    if (isReservedPortalSubdomain(validated.slug) || isReservedPortalSubdomain(validated.subdomain)) {
      throw new AppError("That subdomain is reserved and cannot be used.", 409);
    }

    const updated = await organizationRepository.update(partitionKey, id, (organization) => ({
      ...organization,
      ...validated,
      logoUrl: validated.logoUrl || null,
      faviconUrl: validated.faviconUrl || null,
      bannerUrl: validated.bannerUrl || null,
      backgroundUrl: validated.backgroundUrl || null,
      trialEndsAt: validated.trialEndsAt || null,
      ownerUserId: validated.ownerUserId || null,
      billingPlan: validated.billingPlan || null,
      customDomain: validated.customDomain || null,
      enabledModules: validated.enabledModules || [],
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
