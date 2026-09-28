"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, CheckCircle2Icon, EyeIcon, EyeOffIcon, KeyRoundIcon, LockIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ROUTES } from "@/config/routes";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/features/auth/schemas/login-schema";
import { authService } from "@/features/auth/services/auth-service";
import { ApiError } from "@/types/api";
import { AUTH_INPUT_CLASS, AuthField } from "./auth-field";
import { AuthCard, AuthPanelFooter } from "./auth-card";
import { AuthErrorMessage } from "./auth-message";
import { AuthSubmitButton } from "./auth-submit-button";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    if (!token) {
      setSubmitError("No password reset token was provided. Please request a new link.");
      return;
    }

    setSubmitError("");
    try {
      await authService.resetPassword(token, password);
      setIsSuccess(true);
    } catch (error) {
      setSubmitError(
        ApiError.isApiError(error)
          ? error.message
          : "We could not reset your password. The link may have expired.",
      );
    }
  });

  return (
    <>
      <AuthCard>
        {isSuccess ? (
          <>
            <span className="flex size-11 items-center justify-center rounded-sm bg-success-subtle text-success">
              <CheckCircle2Icon size={22} />
            </span>

            <h1 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
              Password updated
            </h1>

            <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">
              Your password has been reset successfully. All active sessions have been revoked.
              You can now sign in with your new password.
            </p>

            <Link
              href={ROUTES.login}
              className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-primary font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover"
            >
              Sign in now
            </Link>
          </>
        ) : !token ? (
          <>
            <span className="flex size-11 items-center justify-center rounded-sm bg-destructive/10 text-destructive">
              <KeyRoundIcon size={22} />
            </span>

            <h1 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
              Invalid or missing link
            </h1>

            <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">
              This password reset link is missing a valid token or has expired. Please request a new
              reset link.
            </p>

            <Link
              href={ROUTES.forgotPassword}
              className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-border-strong bg-card font-semibold text-foreground transition hover:bg-accent"
            >
              Request new reset link
            </Link>

            <Link
              href={ROUTES.login}
              className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeftIcon size={15} aria-hidden />
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground">
              ACCOUNT SECURITY
            </p>

            <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
              Set new password
            </h1>

            <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">
              Create a new secure password for your account. It must be at least 8 characters long.
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-7 space-y-4">
              <AuthField
                id="new-password"
                label="New password"
                icon={LockIcon}
                error={errors.password?.message}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                }
              >
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  aria-invalid={Boolean(errors.password)}
                  disabled={isSubmitting}
                  className={AUTH_INPUT_CLASS}
                  {...register("password")}
                />
              </AuthField>

              <AuthField
                id="confirm-password"
                label="Confirm new password"
                icon={LockIcon}
                error={errors.confirmPassword?.message}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                }
              >
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  disabled={isSubmitting}
                  className={AUTH_INPUT_CLASS}
                  {...register("confirmPassword")}
                />
              </AuthField>

              {submitError ? <AuthErrorMessage message={submitError} /> : null}

              <AuthSubmitButton isPending={isSubmitting} pendingLabel="Resetting...">
                Reset password
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
