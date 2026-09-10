"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, MailCheckIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ROUTES } from "@/config/routes";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/features/auth/schemas/login-schema";
import { authService } from "@/features/auth/services/auth-service";
import { ApiError } from "@/types/api";
import { AUTH_INPUT_CLASS, AuthField } from "./auth-field";
import { AuthCard, AuthPanelFooter } from "./auth-card";
import { AuthErrorMessage } from "./auth-message";
import { AuthSubmitButton } from "./auth-submit-button";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setSubmitError("");
    try {
      await authService.requestPasswordReset(email);
      setSentTo(email);
    } catch (error) {
      setSubmitError(
        ApiError.isApiError(error)
          ? error.message
          : "We could not send the reset link. Please try again.",
      );
    }
  });

  return (
    <>
      <AuthCard>
        {sentTo ? (
          <>
            <span className="flex size-11 items-center justify-center rounded-xl bg-success-subtle text-success">
              <MailCheckIcon size={22} />
            </span>

            <h1 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
              Check your inbox
            </h1>

            <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">
              If <span className="font-medium text-foreground">{sentTo}</span> belongs to an
              EnCodency staff account, a password reset link is on its way. The link expires in 30
              minutes.
            </p>

            <Link
              href={ROUTES.login}
              className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border-strong bg-card font-semibold text-foreground transition hover:bg-accent"
            >
              <ArrowLeftIcon size={19} aria-hidden />
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground">
              ACCOUNT RECOVERY
            </p>

            <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
              Reset your password
            </h1>

            <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">
              Enter your work email and we will send you a link to set a new password. Resets are
              recorded in the audit log.
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-7">
              <AuthField
                id="reset-email"
                label="Email address"
                icon={MailIcon}
                error={errors.email?.message}
              >
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  aria-invalid={Boolean(errors.email)}
                  disabled={isSubmitting}
                  className={AUTH_INPUT_CLASS}
                  {...register("email")}
                />
              </AuthField>

              {submitError ? <AuthErrorMessage message={submitError} /> : null}

              <AuthSubmitButton isPending={isSubmitting} pendingLabel="Sending...">
                Send reset link
              </AuthSubmitButton>

              <Link
                href={ROUTES.login}
                className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeftIcon size={15} aria-hidden />
                Back to sign in
              </Link>
            </form>
          </>
        )}
      </AuthCard>

      <AuthPanelFooter />
    </>
  );
}
