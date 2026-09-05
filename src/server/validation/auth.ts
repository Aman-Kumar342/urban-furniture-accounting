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

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
