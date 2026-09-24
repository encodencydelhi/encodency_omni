import { z } from "zod";

/**
 * Client-side validation contracts. The same schemas will type the request
 * bodies once the backend endpoints exist.
 */
export const loginSchema = z.object({
  email: z.string().min(1, "Please enter your email address.").email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
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

/** Recovery codes look like "ab12-cd34-ef56-7890-abcd"; the server normalises case and separators. */
export const recoveryCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(8, "Please enter a complete recovery code.")
    .max(64, "That does not look like a recovery code."),
});

/** Invitation acceptance: the backend requires at least 8 characters. */
export const acceptInvitationSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters.").max(256, "Use at most 256 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Please enter your email address.").email("Please enter a valid email address."),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
