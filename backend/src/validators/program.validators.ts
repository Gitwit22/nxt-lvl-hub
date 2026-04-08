import { z } from "zod";
import { programOrigins, programStatuses } from "../models/program.model.js";

const nullableText = z.string().trim().optional().nullable().transform((value) => value || null);

const programInputFields = z.object({
  organizationId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1, "Program name is required."),
  shortDescription: z.string().trim().min(1, "Short description is required."),
  longDescription: z.string().trim().default(""),
  category: z.string().trim().default("General"),
  status: z.enum(programStatuses),
  tags: z.array(z.string().trim().min(1)).default([]),
  logoUrl: nullableText,
  internalOrExternal: z.enum(programOrigins),
  internalRoute: nullableText,
  externalUrl: nullableText,
  featured: z.boolean().default(false),
  displayOrder: z.number().finite(),
  loginRequired: z.boolean().default(false),
  launchButtonLabel: z.string().trim().default("Launch"),
  notes: z.string().trim().default(""),
  accentColor: nullableText,
});

export const programInputSchema = programInputFields.superRefine((value, context) => {
    if (value.internalOrExternal === "internal" && !value.internalRoute) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["internalRoute"],
        message: "Internal programs require an internalRoute.",
      });
    }

    if (value.internalOrExternal === "external" && !value.externalUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalUrl"],
        message: "External programs require an externalUrl.",
      });
    }
  });

export const createProgramSchema = z.object({
  body: programInputSchema,
});

export const updateProgramSchema = z.object({
  body: programInputFields.partial(),
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

const featuredQuerySchema = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (value === undefined) {
      return undefined;
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    return undefined;
  });

export const listProgramsSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    status: z.enum(programStatuses).optional(),
    tags: tagsQuerySchema,
    featured: featuredQuerySchema,
    organizationId: z.string().trim().optional(),
  }),
});