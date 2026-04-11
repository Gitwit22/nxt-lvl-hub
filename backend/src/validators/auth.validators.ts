import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email("A valid email is required."),
    password: z.string().min(1, "Password is required."),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().trim().email("A valid email is required."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    setupToken: z.string().optional(),
  }),
});

export const bootstrapAdminSchema = z.object({
  body: z.object({
    setupToken: z.string().min(1, "Setup token is required."),
  }),
});

export const setPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
  }),
});
