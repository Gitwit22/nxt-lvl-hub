import type { Request, Response } from "express";
import { organizationService } from "../services/organization.service.js";
import { sendSuccess } from "../utils/response.js";

function getRouteId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

export async function listOrganizations(request: Request, response: Response) {
  const organizations = await organizationService.list({
    search: typeof request.query.search === "string" ? request.query.search : undefined,
    name: typeof request.query.name === "string" ? request.query.name : undefined,
    status: typeof request.query.status === "string" ? (request.query.status as never) : undefined,
    tags: Array.isArray(request.query.tags) ? (request.query.tags as string[]) : undefined,
  });

  return sendSuccess(response, organizations, "Organizations retrieved.");
}

export async function getOrganization(request: Request, response: Response) {
  const organization = await organizationService.getById(getRouteId(request.params.id));
  return sendSuccess(response, organization, "Organization retrieved.");
}

export async function createOrganization(request: Request, response: Response) {
  const organization = await organizationService.create(request.body);
  return sendSuccess(response, organization, "Organization created.", 201);
}

export async function updateOrganization(request: Request, response: Response) {
  const organization = await organizationService.update(getRouteId(request.params.id), request.body);
  return sendSuccess(response, organization, "Organization updated.");
}

export async function deleteOrganization(request: Request, response: Response) {
  const organization = await organizationService.remove(getRouteId(request.params.id));
  return sendSuccess(response, organization, "Organization deleted.");
}