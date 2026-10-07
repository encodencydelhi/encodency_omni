"use client";

import { CheckCircle2Icon, EyeIcon, EyeOffIcon, LockKeyholeIcon, Loader2, ShieldCheckIcon, UserIcon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES } from "@/config/routes";
import { staffInvitationPublicApi, type StaffTokenInfo } from "@/features/internal-team/live/staff-api";
import { acceptInvitationSchema } from "@/features/auth/schemas/login-schema";
import { ApiError } from "@/types/api";
import { AuthCard, AuthPanelFooter } from "./auth-card";
import { AUTH_INPUT_CLASS, AuthField } from "./auth-field";
import { AuthErrorMessage } from "./auth-message";
import { AuthSubmitButton } from "./auth-submit-button";

type Phase = "validating" | "invalid" | "form" | "accepted";

const ROLE_LABEL = { SUPER_ADMIN: "Super Admin", SUPPORT: "Support" } as const;

/** Public page for platform staff invitations (the link in the invitation email). */
export function AcceptStaffInvitationView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [phase, setPhase] = useState<Phase>(token ? "validating" : "invalid");
  const [info, setInfo] = useState<StaffTokenInfo | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; password?: string; confirmPassword?: string }>({});
  const [submitError, setSubmitError] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    staffInvitationPublicApi
      .validate(token)
      .then((res) => {
        if (cancelled) return;
        setInfo(res);
        setFullName(res.name ?? "");
        setPhase("form");
      })
      .catch(() => {
        if (!cancelled) setPhase("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || isPending) return;
    setSubmitError("");

    const parsed = acceptInvitationSchema.safeParse({ password, confirmPassword });
    if (!parsed.success || !fullName.trim()) {
      const errors: typeof fieldErrors = {};
      if (!fullName.trim()) errors.name = "Enter your full name.";
      if (!parsed.success) for (const issue of parsed.error.issues) errors[issue.path[0] as keyof typeof fieldErrors] ??= issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsPending(true);
    try {
      await staffInvitationPublicApi.accept({ token, password: parsed.data.password, name: fullName.trim() });
      setPhase("accepted");
    } catch (error) {
      if (ApiError.isApiError(error) && error.status === 409) setSubmitError("An account with this email already exists. Sign in instead.");
      else if (ApiError.isApiError(error) && error.status === 400) setPhase("invalid");
      else setSubmitError(error instanceof Error ? error.message : "The invitation could not be accepted.");
    } finally {
      setIsPending(false);
      setPassword("");
      setConfirmPassword("");
    }
  };

  let body;
  if (phase === "validating") {
    body = (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Validating invitation...</p>
      </div>
    );
  } else if (phase === "accepted") {
    body = (
      <>
        <span className="flex size-11 items-center justify-center rounded-sm bg-primary-subtle text-primary">
          <CheckCircle2Icon size={22} />
        </span>
        <h1 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">Your staff account is ready</h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
          Sign in with your email and the password you just chose. You&apos;ll be asked to set up an authenticator app, which is required for every account.
        </p>
        <Link href={ROUTES.login} className="mt-7 flex h-12 w-full items-center justify-center rounded-sm bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover">
          Go to sign in
        </Link>
      </>
    );
  } else if (phase === "invalid") {
    body = (
      <>
        <span className="flex size-11 items-center justify-center rounded-sm bg-red-50 text-red-600">
          <XCircleIcon size={22} />
        </span>
        <h1 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">This invitation link can&apos;t be used</h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
          It may be incomplete, expired (links last 48 hours), already used, or revoked. Ask a Super Admin to send a new invitation.
        </p>
        <Link href={ROUTES.login} className="mt-7 block text-center text-sm font-medium text-primary hover:text-primary-hover">
          Go to sign in
        </Link>
      </>
    );
  } else {
    body = (
      <>
        <span className="flex size-11 items-center justify-center rounded-sm bg-primary-subtle text-primary">
          <ShieldCheckIcon size={22} />
        </span>
        <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-muted-foreground">
          PLATFORM STAFF · {info ? ROLE_LABEL[info.platformRole].toUpperCase() : ""}
        </p>
        <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">Create your staff account</h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
          You were invited as <strong>{info?.email}</strong>. Choose how your name appears and set a password. You&apos;ll set up an authenticator app when you first sign in.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-7">
          <AuthField id="staff-name" label="Full name" icon={UserIcon} error={fieldErrors.name} className="mb-4">
            <input
              id="staff-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={isPending}
              maxLength={200}
              aria-invalid={Boolean(fieldErrors.name)}
              className={AUTH_INPUT_CLASS}
            />
          </AuthField>

          <AuthField
            id="staff-password"
            label="Password"
            icon={LockKeyholeIcon}
            error={fieldErrors.password}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition hover:text-foreground"
              >
                {showPassword ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
              </button>
            }
          >
            <input
              id="staff-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(fieldErrors.password)}
              className={`${AUTH_INPUT_CLASS} pr-12`}
            />
          </AuthField>

          <AuthField id="staff-confirm" label="Confirm password" icon={LockKeyholeIcon} error={fieldErrors.confirmPassword} className="mt-4">
            <input
              id="staff-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              className={AUTH_INPUT_CLASS}
            />
          </AuthField>

          {submitError ? <AuthErrorMessage message={submitError} /> : null}

          <AuthSubmitButton isPending={isPending} pendingLabel="Creating account...">
            Create staff account
          </AuthSubmitButton>
        </form>
      </>
    );
  }

  return (
    <>
      <AuthCard>{body}</AuthCard>
      <AuthPanelFooter />
    </>
  );
}
