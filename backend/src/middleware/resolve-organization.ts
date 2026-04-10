import type { NextFunction, Request, Response } from "express";
import { organizationRepository } from "../database/repositories.js";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";
import { getOrganizationSlugFromHost } from "../utils/portal-host.js";

export async function resolveOrganizationFromHost(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const hostname = (request.headers["x-forwarded-host"] as string | undefined)
    || request.hostname
    || "";

  const orgSlug = getOrganizationSlugFromHost(hostname);

  if (!orgSlug) {
    return next();
  }

  const partition = env.appPartitionDefault;
  const organizations = await organizationRepository.list(partition);
  const org = organizations.find(
    (o) =>
      !o.deletedAt
      && (
        o.slug.toLowerCase() === orgSlug
        || o.subdomain.toLowerCase() === orgSlug
      ),
  );

  if (!org) {
    return next(new AppError("Portal not found.", 404));
  }

  request.resolvedOrganization = {
    id: org.id,
    slug: org.slug,
    subdomain: org.subdomain,
    name: org.name,
    status: org.status,
    enabledPrograms: org.assignedProgramIds,
    enabledModules: org.enabledModules,
  };

  next();
}
