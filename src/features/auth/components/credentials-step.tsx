"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, LockKeyholeIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { APP } from "@/config/app";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/features/auth/components/auth-provider";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login-schema";
import { ApiError } from "@/types/api";
import type { LoginResult } from "@/types/domain/auth";
import type { InternalRole } from "@/types/domain/team";
import { AUTH_INPUT_CLASS, AuthField } from "./auth-field";
import { AuthErrorMessage } from "./auth-message";
import { AuthSubmitButton } from "./auth-submit-button";

interface CredentialsStepProps {
  /** Called when credentials are accepted and a second factor is required. */
  onChallenge: (result: Extract<LoginResult, { status: "challenge" }>, rememberMe: boolean) => void;
  /** Called when the backend decides no second factor is needed. */
  onAuthenticated: (role: InternalRole) => void;
}

export function CredentialsStep({ onChallenge, onAuthenticated }: CredentialsStepProps) {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError("");
    try {
      const result = await login(values);
      if (result.status === "challenge") {
        onChallenge(result, values.rememberMe);
      } else {
        onAuthenticated(result.session.user.role);
      }
    } catch (error) {
      setSubmitError(
        ApiError.isApiError(error)
          ? error.message
          : "Unable to sign in. Please check your credentials.",
      );
    }
  });

  return (
    <>
      <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground">SIGN IN TO</p>

      <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
        {APP.name}
      </h1>

      <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">
        Access your workspace and continue building what’s next.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-7">
        <AuthField id="email" label="Email address" icon={MailIcon} error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            disabled={isSubmitting}
            className={AUTH_INPUT_CLASS}
            {...register("email")}
          />
        </AuthField>

        <AuthField
          id="password"
          label="Password"
          icon={LockKeyholeIcon}
          error={errors.password?.message}
          className="mt-4"
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition hover:text-foreground"
            >
              {showPassword ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
            </button>
          }
        >
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            disabled={isSubmitting}
            className={`${AUTH_INPUT_CLASS} pr-12`}
            {...register("password")}
          />
        </AuthField>

        <div className="mt-4 flex items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              disabled={isSubmitting}
              className="size-4 accent-primary"
              {...register("rememberMe")}
            />
            Remember me
          </label>

          <Link
            href={ROUTES.forgotPassword}
            className="text-sm font-medium text-primary transition hover:text-primary-hover"
          >
            Forgot password?
          </Link>
        </div>

        {submitError ? <AuthErrorMessage message={submitError} /> : null}

        <AuthSubmitButton isPending={isSubmitting} pendingLabel="Signing in...">
          Sign in
        </AuthSubmitButton>
      </form>
    </>
  );
}
