import { z } from "zod";
import { organizationStatuses } from "../models/organization.model.js";

const nullableText = z.string().trim().optional().nullable().transform((value) => value || null);

export const organizationInputSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required."),
  description: z.string().trim().default(""),
  logoUrl: nullableText,
  ownerEmail: z.string().trim().email("A valid ownerEmail is required."),
  ownerUserId: nullableText,
  status: z.enum(organizationStatuses).default("active"),
  tags: z.array(z.string().trim().min(1)).default([]),
});

export const createOrganizationSchema = z.object({
  body: organizationInputSchema,
});

export const updateOrganizationSchema = z.object({
  body: organizationInputSchema.partial(),
});

const tagsQuerySchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (!value) {
      return undefined;
    }

    const normalized = Array.isArray(value) ? value : value.split(",");
    const tags = normalized.map((tag) => tag.trim()).filter(Boolean);
    return tags.length > 0 ? tags : undefined;
  });

export const listOrganizationsSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    name: z.string().trim().optional(),
    status: z.enum(organizationStatuses).optional(),
    tags: tagsQuerySchema,
  }),
});