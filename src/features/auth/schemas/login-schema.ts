import { z } from "zod";

/**
 * Client-side validation contracts. The same schemas will type the request
 * bodies once the backend endpoints exist.
 */
export const loginSchema = z.object({
  email: z.string().min(1, "Please enter your email address.").email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const TOTP_LENGTH = 6;

export const totpSchema = z.object({
  code: z
    .string()
    .length(TOTP_LENGTH, "Please enter the complete 6-digit authentication code.")
    .regex(/^\d+$/, "Authentication codes contain digits only."),
});

export type TotpFormValues = z.infer<typeof totpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Please enter your email address.").email("Please enter a valid email address."),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
