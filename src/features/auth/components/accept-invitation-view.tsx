"use client";

import { CheckCircle2Icon, EyeIcon, EyeOffIcon, LockKeyholeIcon, MailPlusIcon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/config/routes";
import { teamApi } from "@/features/admin/team/live/team-api";
import { acceptInvitationSchema } from "@/features/auth/schemas/login-schema";
import { ApiError } from "@/types/api";
import { AuthCard, AuthPanelFooter } from "./auth-card";
import { AUTH_INPUT_CLASS, AuthField } from "./auth-field";
import { AuthErrorMessage } from "./auth-message";
import { useAuth } from "./auth-provider";
import { AuthSubmitButton } from "./auth-submit-button";

type Outcome = { kind: "accepted" } | { kind: "invalid" } | { kind: "existing-account"; message: string };

/**
 * Landing page for the invitation email link: /accept-invitation?token=…
 *
 * The token is a single-use bearer secret, only ever sent to POST
 * /invitations/accept. It is read from the URL on every render rather than
 * copied into state and stripped from the address bar: rewriting the URL makes
 * the App Router re-render, and a remount would then lose a still-valid token
 * ("link can't be used" for a good link). Leakage is prevented instead by the
 * page's no-referrer policy; the token is useless once accepted or expired.
 * Accepting creates the account and membership but NOT a session: the new
 * member signs in normally afterwards and must set up their authenticator
 * (mandatory MFA).
 */
export function AcceptInvitationView() {
  const searchParams = useSearchParams();
  const { status, user, refreshUser } = useAuth();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [submitError, setSubmitError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || isPending) return;
    setSubmitError("");

    const parsed = acceptInvitationSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const errors: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as keyof typeof fieldErrors] ??= issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsPending(true);
    try {
      await teamApi.acceptInvitation(token, parsed.data.password);
      if (status === "authenticated") {
        try {
          await refreshUser();
        } catch {
          // ignore session refresh error if session expired
        }
      }
      setOutcome({ kind: "accepted" });
    } catch (error) {
      if (ApiError.isApiError(error) && error.status === 403) {
        setOutcome({ kind: "invalid" });
      } else if (ApiError.isApiError(error) && error.status === 409) {
        setOutcome({ kind: "existing-account", message: error.message });
      } else {
        setSubmitError(ApiError.isApiError(error) ? error.message : "The invitation could not be accepted. Please try again.");
      }
    } finally {
      setIsPending(false);
      setPassword("");
      setConfirmPassword("");
    }
  };

  let body;
  if (outcome?.kind === "accepted") {
    body = (
      <>
        <span className="flex size-11 items-center justify-center rounded-sm bg-primary-subtle text-primary">
          <CheckCircle2Icon size={22} />
        </span>
        <h1 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">You&apos;re in</h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
          Your account has been created. Sign in with your email and new password — you&apos;ll then be asked to set up an
          authenticator app, which is required for every account.
        </p>
        <Link href={ROUTES.login} className="mt-7 flex h-12 w-full items-center justify-center rounded-sm bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover">
          Go to sign in
        </Link>
      </>
    );
  } else if (outcome?.kind === "existing-account") {
    body = (
      <>
        <span className="flex size-11 items-center justify-center rounded-sm bg-primary-subtle text-primary">
          <MailPlusIcon size={22} />
        </span>
        <h1 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">You already have an account</h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">{outcome.message}</p>
        <p className="mt-2 text-[0.875rem] leading-6 text-muted-foreground">
          Joining a Company with an existing account through an invitation is not supported yet.
        </p>
        <Link href={ROUTES.login} className="mt-7 block text-center text-sm font-medium text-primary hover:text-primary-hover">
          Go to sign in
        </Link>
      </>
    );
  } else if (outcome?.kind === "invalid" || !token) {
    body = (
      <>
        <span className="flex size-11 items-center justify-center rounded-sm bg-red-50 text-red-600">
          <XCircleIcon size={22} />
        </span>
        <h1 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">This invitation link can&apos;t be used</h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
          It may be incomplete, expired (links last 48 hours), already used, or revoked. Ask the person who invited you
          to send a new invitation.
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
          <MailPlusIcon size={22} />
        </span>
        <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-muted-foreground">ACCEPT INVITATION</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">Create your account</h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
          Choose a password for the invited email address. You&apos;ll set up an authenticator app when you first sign in.
        </p>
        {status === "authenticated" && user ? (
          <p className="mt-3 rounded-sm border border-amber-200 bg-amber-50 p-3 text-[0.8125rem] text-amber-900">
            You are currently signed in as {user.email}. Accepting creates a separate account for the invited email.
          </p>
        ) : null}

        <form onSubmit={onSubmit} noValidate className="mt-7">
          <AuthField
            id="invite-password"
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
              id="invite-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(fieldErrors.password)}
              className={`${AUTH_INPUT_CLASS} pr-12`}
            />
          </AuthField>

          <AuthField id="invite-confirm" label="Confirm password" icon={LockKeyholeIcon} error={fieldErrors.confirmPassword} className="mt-4">
            <input
              id="invite-confirm"
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
            Accept invitation
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
