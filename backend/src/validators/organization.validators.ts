import { z } from "zod";
import { organizationPlanTypes, organizationStatuses } from "../models/organization.model.js";

const nullableText = z.string().trim().optional().nullable().transform((value) => value || null);

export const organizationInputSchema = z.object({
  id: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  name: z.string().trim().min(1, "Organization name is required."),
  description: z.string().trim().default(""),
  subdomain: z.string().trim().min(1, "Subdomain is required."),
  contactEmail: z.string().trim().email("A valid contactEmail is required."),
  logo: z.string().trim().min(1).default("OR"),
  logoUrl: nullableText,
  bannerUrl: nullableText,
  welcomeMessage: z.string().trim().default(""),
  supportEmail: z.string().trim().email("A valid supportEmail is required."),
  supportContactName: z.string().trim().default("Support"),
  phoneNumber: z.string().trim().default(""),
  industryType: z.string().trim().default(""),
  notes: z.string().trim().default(""),
  planType: z.enum(organizationPlanTypes).default("starter"),
  seatLimit: z.number().int().min(1, "Seat limit must be greater than 0."),
  trialEndsAt: nullableText,
  lastActivityAt: z.string().trim().optional(),
  branding: z.object({
    primaryColor: z.string().trim().default("217 80% 56%"),
    accentColor: z.string().trim().default("191 85% 47%"),
  }),
  assignedProgramIds: z.array(z.string().trim().min(1)).default([]),
  assignedBundleIds: z.array(z.string().trim().min(1)).default([]),
  announcements: z.array(z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    message: z.string().trim().min(1),
    createdAt: z.string().trim().min(1),
  })).default([]),
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