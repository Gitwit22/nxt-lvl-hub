import type { Request, Response } from "express";
import { orgUserService } from "../services/org-user.service.js";
import { sendSuccess } from "../utils/response.js";
import { getRequestPartition } from "../utils/partition.js";

function getRouteId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

export async function listOrgUsers(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const orgId = getRouteId(request.params.orgId);
  const users = await orgUserService.list(partitionKey, orgId);

  return sendSuccess(response, users, "Organization users retrieved.");
}

export async function createOrgUser(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const orgId = getRouteId(request.params.orgId);
  const actor = request.authUser!;
  const result = await orgUserService.create(partitionKey, orgId, request.body, {
    id: actor.id,
    email: actor.email,
  });

  return sendSuccess(
    response,
    {
      ...result.user,
      tempPassword: result.tempPassword,
      passwordWasGenerated: result.passwordWasGenerated,
      existingUser: result.existingUser,
    },
    "Organization user created.",
    201,
  );
}

export async function updateOrgUser(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const orgId = getRouteId(request.params.orgId);
  const userId = getRouteId(request.params.userId);
  const user = await orgUserService.update(partitionKey, orgId, userId, request.body);

  return sendSuccess(response, user, "Organization user updated.");
}

export async function removeOrgUser(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const orgId = getRouteId(request.params.orgId);
  const userId = getRouteId(request.params.userId);
  const user = await orgUserService.remove(partitionKey, orgId, userId);

  return sendSuccess(response, user, "Organization user removed.");
}

export async function resetOrgUserPassword(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const orgId = getRouteId(request.params.orgId);
  const userId = getRouteId(request.params.userId);
  const actor = request.authUser!;

  const result = await orgUserService.resetPassword(partitionKey, orgId, userId, {
    id: actor.id,
    email: actor.email,
  });

  return sendSuccess(response, result, "Temporary password generated.");
}
