import { z } from "zod";
import { validatePassword } from "@/lib/password";

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email").max(200),
  password: z
    .string()
    .max(200)
    .superRefine((val, ctx) => {
      const error = validatePassword(val);
      if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
