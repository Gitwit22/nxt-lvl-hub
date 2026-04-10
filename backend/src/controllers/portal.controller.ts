import type { Request, Response } from "express";
import { organizationRepository, orgUserRepository, programRepository } from "../database/repositories.js";
import { AppError } from "../utils/app-error.js";
import { sendSuccess } from "../utils/response.js";
import { env } from "../config/env.js";

export async function getPortalBootstrap(request: Request, response: Response) {
  const resolved = request.resolvedOrganization;

  if (!resolved) {
    throw new AppError("Portal context not found for this hostname.", 404);
  }

  const partition = env.appPartitionDefault;
  const organizations = await organizationRepository.list(partition);
  const org = organizations.find((candidate) => !candidate.deletedAt && candidate.id === resolved.id);

  if (!org) {
    throw new AppError("Organization not found.", 404);
  }

  let membership: {
    orgId: string;
    userId: string;
    role: string;
    active: boolean;
    email: string;
    name: string;
  } | null = null;

  const authUser = request.authUser;
  if (authUser) {
    if (authUser.isPlatformAdmin) {
      membership = {
        orgId: org.id,
        userId: authUser.id,
        role: "super_admin",
        active: true,
        email: authUser.email,
        name: authUser.email,
      };
    } else {
      const found = await orgUserRepository.findByAuthUserId(partition, authUser.id, org.id);
      if (found && !found.deletedAt && found.active) {
        membership = {
          orgId: found.orgId,
          userId: found.id,
          role: found.role,
          active: found.active,
          email: found.email,
          name: found.name,
        };
      }
    }
  }

  const allPrograms = await programRepository.list(partition);
  const enabledProgramIds = new Set(org.assignedProgramIds);
  const enabledPrograms = allPrograms
    .filter((program) => !program.deletedAt && enabledProgramIds.has(program.id))
    .map((program) => ({
      id: program.id,
      slug: program.slug,
      name: program.name,
      status: program.status,
      shortDescription: program.shortDescription,
      type: program.type,
      internalRoute: program.internalRoute,
      externalUrl: program.externalUrl,
      logoUrl: program.logoUrl,
      accentColor: program.accentColor,
    }));

  return sendSuccess(
    response,
    {
      organization: {
        id: org.id,
        slug: org.slug,
        subdomain: org.subdomain,
        name: org.name,
        portalTitle: org.portalTitle,
        contactEmail: org.contactEmail,
        supportEmail: org.supportEmail,
        supportPhone: org.supportPhone,
        customDomain: org.customDomain,
        status: org.status,
        welcomeMessage: org.welcomeMessage,
        logo: org.logo,
        logoUrl: org.logoUrl,
        faviconUrl: org.faviconUrl,
      },
      branding: org.branding,
      membership,
      enabledModules: org.enabledModules,
      enabledPrograms,
      portalStatus: {
        status: org.status,
        isPending: org.status === "pending",
        isActive: org.status === "active" || org.status === "trial",
        isSuspended: org.status === "suspended",
      },
    },
    "Portal bootstrap retrieved.",
  );
}

export async function getPortalStatus(request: Request, response: Response) {
  const slug = typeof request.query.slug === "string" ? request.query.slug.trim() : "";
  const subdomain = typeof request.query.subdomain === "string" ? request.query.subdomain.trim() : "";

  if (!slug && !subdomain) {
    throw new AppError("slug or subdomain query parameter is required.", 400);
  }

  const partition = env.appPartitionDefault;
  const organizations = await organizationRepository.list(partition);

  const org = organizations.find((o) => {
    if (o.deletedAt) return false;
    if (slug) return o.slug.toLowerCase() === slug.toLowerCase();
    return o.subdomain.toLowerCase() === subdomain.toLowerCase();
  });

  if (!org) {
    throw new AppError("Organization not found.", 404);
  }

  return sendSuccess(
    response,
    {
      organizationId: org.id,
      slug: org.slug,
      subdomain: org.subdomain,
      name: org.name,
      status: org.status,
      enabledPrograms: org.assignedProgramIds,
      enabledModules: org.enabledModules,
      portalTitle: org.portalTitle,
      customDomain: org.customDomain,
    },
    "Portal status retrieved.",
  );
}
