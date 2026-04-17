import type { Request, Response } from "express";
import { programService } from "../services/program.service.js";
import { sendSuccess } from "../utils/response.js";
import { getRequestPartition } from "../utils/partition.js";
import { AppError } from "../utils/app-error.js";

function getRouteId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

export async function listPrograms(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);

  const programs = await programService.list(partitionKey, {
    search: typeof request.query.search === "string" ? request.query.search : undefined,
    category: typeof request.query.category === "string" ? request.query.category : undefined,
    status: typeof request.query.status === "string" ? (request.query.status as never) : undefined,
    tags: Array.isArray(request.query.tags) ? (request.query.tags as string[]) : undefined,
    featured: typeof request.query.featured === "boolean" ? request.query.featured : undefined,
    organizationId: typeof request.query.organizationId === "string" ? request.query.organizationId : undefined,
    publicOnly: true,
  });

  return sendSuccess(response, programs, "Programs retrieved.");
}

export async function getProgram(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const program = await programService.getById(partitionKey, getRouteId(request.params.id));

  if (!program.isPublic || program.adminOnly) {
    throw new AppError("Program not found.", 404);
  }

  return sendSuccess(response, program, "Program retrieved.");
}

export async function createProgram(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const program = await programService.create(partitionKey, request.body);
  return sendSuccess(response, program, "Program created.", 201);
}

export async function updateProgram(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const program = await programService.update(partitionKey, getRouteId(request.params.id), request.body);
  return sendSuccess(response, program, "Program updated.");
}

export async function deleteProgram(request: Request, response: Response) {
  const partitionKey = getRequestPartition(request);
  const program = await programService.remove(partitionKey, getRouteId(request.params.id));
  return sendSuccess(response, program, "Program deleted.");
}
