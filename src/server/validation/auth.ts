import { z } from "zod";
import { Role } from "@prisma/client";
import { validatePassword } from "@/lib/password";

const passwordField = z
  .string()
  .max(200)
  .superRefine((val, ctx) => {
    const error = validatePassword(val);
    if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  });

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email").max(200),
  password: passwordField,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

// Admin-only "Create User". The email is the login identifier (no separate loginId column).
// role accepts any of ADMIN / ACCOUNTANT / CONTACT; CONTACT additionally links/creates a Contact.
export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email").max(200),
  role: z.nativeEnum(Role, { errorMap: () => ({ message: "Choose a role." }) }),
  password: passwordField,
});

// Request a reset link. Email is validated for format only; the route always responds generically
// (never revealing whether the email maps to an account).
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email").max(200),
});

// Consume a reset token and set a new password (shared policy). The reset UI is a later screen;
// the endpoint exists so the token lifecycle is complete and testable.
export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Invalid token").max(500),
  password: passwordField,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
