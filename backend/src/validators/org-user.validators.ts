import { z } from "zod";
import { orgUserRoles } from "../models/org-user.model.js";

const baseOrgUserInputSchema = z.object({
  name: z.string().trim().min(1, "User name is required."),
  email: z.string().trim().email("A valid email is required."),
  role: z.enum(orgUserRoles),
  active: z.boolean().optional(),
  assignedProgramIds: z.array(z.string().trim().min(1)).optional(),
});

export const createOrgUserInputSchema = baseOrgUserInputSchema;
export const updateOrgUserInputSchema = baseOrgUserInputSchema.partial();

const orgRouteParamsSchema = z.object({
  orgId: z.string().trim().min(1),
});

const orgUserRouteParamsSchema = z.object({
  orgId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
});

export const listOrgUsersSchema = z.object({
  params: orgRouteParamsSchema,
});

export const createOrgUserSchema = z.object({
  params: orgRouteParamsSchema,
  body: createOrgUserInputSchema,
});

export const updateOrgUserSchema = z.object({
  params: orgUserRouteParamsSchema,
  body: updateOrgUserInputSchema,
});

export const removeOrgUserSchema = z.object({
  params: orgUserRouteParamsSchema,
});

export const resetOrgUserPasswordSchema = z.object({
  params: orgUserRouteParamsSchema,
});

export { baseOrgUserInputSchema as orgUserInputSchema };
