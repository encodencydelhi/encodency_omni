"use client";

import { CheckCircle2Icon, EyeIcon, EyeOffIcon, LockKeyholeIcon, MailPlusIcon, XCircleIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES } from "@/config/routes";
import { teamApi, type InvitationValidationResponse } from "@/features/admin/team/live/team-api";
import { acceptInvitationSchema } from "@/features/auth/schemas/login-schema";
import { ApiError } from "@/types/api";
import { AuthCard, AuthPanelFooter } from "./auth-card";
import { AUTH_INPUT_CLASS, AuthField } from "./auth-field";
import { AuthErrorMessage } from "./auth-message";
import { useAuth } from "./auth-provider";
import { AuthSubmitButton } from "./auth-submit-button";

type Outcome =
  | { kind: "accepted" }
  | { kind: "finalized"; companyId: string }
  | { kind: "invalid" }
  | { kind: "email-mismatch"; invitedEmail: string };

export function AcceptInvitationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, user, refreshUser } = useAuth();
  const token = searchParams.get("token");

  const [validation, setValidation] = useState<InvitationValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [submitError, setSubmitError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // Step 1: Validate invitation token on mount
  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setOutcome({ kind: "invalid" });
      return;
    }

    let cancelled = false;
    teamApi
      .validateInvitation(token)
      .then((res) => {
        if (!cancelled) {
          setValidation(res);
          setIsValidating(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setIsValidating(false);
          setOutcome({ kind: "invalid" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Path A: New user accepts with password
  const onAcceptNewUser = async (event: React.FormEvent) => {
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
      setOutcome({ kind: "accepted" });
    } catch (error) {
      if (ApiError.isApiError(error)) {
        const serverCode = error.detail<string>("code") ?? (error.code as string);
        if (error.status === 403) setOutcome({ kind: "invalid" });
        else if (error.status === 409 && (serverCode === "account_exists_login_required" || error.code === "CONFLICT")) {
          // Switch to existing account flow
          setValidation((prev) => (prev ? { ...prev, accountExists: true } : prev));
        } else {
          setSubmitError(error.message);
        }
      } else {
        setSubmitError(error instanceof Error ? error.message : "The invitation could not be accepted.");
      }
    } finally {
      setIsPending(false);
      setPassword("");
      setConfirmPassword("");
    }
  };

  // Path B: Existing logged-in user finalizes invitation
  const onFinalizeExistingAccount = async () => {
    if (!token || isPending) return;
    setSubmitError("");
    setIsPending(true);

    try {
      const res = await teamApi.finalizeInvitation(token);
      await refreshUser();
      setOutcome({ kind: "finalized", companyId: res.companyId });
    } catch (error) {
      if (ApiError.isApiError(error)) {
        const serverCode = error.detail<string>("code") ?? (error.code as string);
        if (error.status === 403 && serverCode === "invitation_email_mismatch") {
          setOutcome({ kind: "email-mismatch", invitedEmail: validation?.email ?? "the invited address" });
        } else if (error.status === 403) {
          setOutcome({ kind: "invalid" });
        } else {
          setSubmitError(error.message);
        }
      } else {
        setSubmitError(error instanceof Error ? error.message : "Failed to join company.");
      }
    } finally {
      setIsPending(false);
    }
  };

  let body;

  if (isValidating) {
    body = (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Validating invitation...</p>
      </div>
    );
  } else if (outcome?.kind === "accepted") {
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
  } else if (outcome?.kind === "finalized") {
    body = (
      <>
        <span className="flex size-11 items-center justify-center rounded-sm bg-primary-subtle text-primary">
          <CheckCircle2Icon size={22} />
        </span>
        <h1 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">Welcome to the team</h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
          Your membership has been activated. You can now access the company dashboard.
        </p>
        <Link href="/admin/dashboard" className="mt-7 flex h-12 w-full items-center justify-center rounded-sm bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover">
          Go to Dashboard
        </Link>
      </>
    );
  } else if (outcome?.kind === "email-mismatch") {
    body = (
      <>
        <span className="flex size-11 items-center justify-center rounded-sm bg-amber-50 text-amber-600">
          <XCircleIcon size={22} />
        </span>
        <h1 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">Account mismatch</h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
          This invitation was sent to <strong>{outcome.invitedEmail}</strong>, but you are signed in as <strong>{user?.email}</strong>.
        </p>
        <p className="mt-2 text-[0.875rem] leading-6 text-muted-foreground">
          Please sign out and sign in with the invited email address to accept this invitation.
        </p>
        <Link href={ROUTES.login} className="mt-7 block text-center text-sm font-medium text-primary hover:text-primary-hover">
          Sign out and switch account
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
  } else if (validation?.accountExists) {
    // Path B: Existing account detected
    body = (
      <>
        <span className="flex size-11 items-center justify-center rounded-sm bg-primary-subtle text-primary">
          <MailPlusIcon size={22} />
        </span>
        <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-muted-foreground">INVITATION TO {validation.companyName.toUpperCase()}</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">Accept Invitation</h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
          An account already exists for <strong>{validation.email}</strong>.
        </p>

        {status === "authenticated" && user ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-sm border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              You are signed in as <strong>{user.email}</strong>. Click below to join {validation.companyName} as {validation.systemRole}.
            </p>
            {submitError ? <AuthErrorMessage message={submitError} /> : null}
            <button
              onClick={onFinalizeExistingAccount}
              disabled={isPending}
              className="flex h-12 w-full items-center justify-center rounded-sm bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
            >
              {isPending ? "Connecting to company..." : "Accept & Join Company"}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Please sign in with your password and authenticator to link this invitation to your account.
            </p>
            <Link
              href={`${ROUTES.login}?returnTo=${encodeURIComponent(`/accept-invitation?token=${token}`)}`}
              className="flex h-12 w-full items-center justify-center rounded-sm bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
            >
              Sign in to accept
            </Link>
          </div>
        )}
      </>
    );
  } else {
    // Path A: New user account creation
    body = (
      <>
        <span className="flex size-11 items-center justify-center rounded-sm bg-primary-subtle text-primary">
          <MailPlusIcon size={22} />
        </span>
        <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-muted-foreground">
          {validation?.companyName ? `INVITATION TO ${validation.companyName.toUpperCase()}` : "ACCEPT INVITATION"}
        </p>
        <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">Create your account</h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
          Choose a password for <strong>{validation?.email}</strong>. You&apos;ll set up an authenticator app when you first sign in.
        </p>

        <form onSubmit={onAcceptNewUser} noValidate className="mt-7">
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
