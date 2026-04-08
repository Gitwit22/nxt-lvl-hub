import type { Request, Response } from "express";
import { organizationService } from "../services/organization.service.js";
import { sendSuccess } from "../utils/response.js";
import { getRequestPartition } from "../utils/partition.js";

function getRouteId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

export async function listOrganizations(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);

  const organizations = await organizationService.list(partitionKey, {
    search: typeof request.query.search === "string" ? request.query.search : undefined,
    name: typeof request.query.name === "string" ? request.query.name : undefined,
    status: typeof request.query.status === "string" ? (request.query.status as never) : undefined,
    tags: Array.isArray(request.query.tags) ? (request.query.tags as string[]) : undefined,
  });

  return sendSuccess(response, organizations, "Organizations retrieved.");
}

export async function getOrganization(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const organization = await organizationService.getById(partitionKey, getRouteId(request.params.id));
  return sendSuccess(response, organization, "Organization retrieved.");
}

export async function createOrganization(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const organization = await organizationService.create(partitionKey, request.body);
  return sendSuccess(response, organization, "Organization created.", 201);
}

export async function updateOrganization(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const organization = await organizationService.update(partitionKey, getRouteId(request.params.id), request.body);
  return sendSuccess(response, organization, "Organization updated.");
}

export async function deleteOrganization(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const organization = await organizationService.remove(partitionKey, getRouteId(request.params.id));
  return sendSuccess(response, organization, "Organization deleted.");
}
