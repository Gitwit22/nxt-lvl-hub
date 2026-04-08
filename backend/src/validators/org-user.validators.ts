import { z } from "zod";
import { orgUserRoles } from "../models/org-user.model.js";

const orgUserInputSchema = z.object({
  id: z.string().trim().optional(),
  orgId: z.string().trim().optional(),
  authUserId: z.string().trim().nullable().optional(),
  name: z.string().trim().min(1, "User name is required."),
  email: z.string().trim().email("A valid email is required."),
  role: z.enum(orgUserRoles),
  active: z.boolean().optional(),
  assignedProgramIds: z.array(z.string().trim().min(1)).optional(),
});

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
  body: orgUserInputSchema,
});

export const updateOrgUserSchema = z.object({
  params: orgUserRouteParamsSchema,
  body: orgUserInputSchema.partial(),
});

export { orgUserInputSchema };
