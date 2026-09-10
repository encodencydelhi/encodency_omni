"use client";

import { ShieldCheckIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { TOTP_LENGTH, totpSchema } from "@/features/auth/schemas/login-schema";
import { ApiError } from "@/types/api";
import type { TotpChallenge } from "@/types/domain/auth";
import type { InternalRole } from "@/types/domain/team";
import { AuthErrorMessage } from "./auth-message";
import { AuthSubmitButton } from "./auth-submit-button";

interface TotpStepProps {
  challenge: TotpChallenge;
  rememberMe: boolean;
  onVerified: (role: InternalRole) => void;
  onBack: () => void;
}

const EMPTY_CODE = Array.from({ length: TOTP_LENGTH }, () => "");

/**
 * Second factor.
 *
 * The six inputs behave as one field: typing advances, backspace retreats, and
 * a pasted code fills the whole row — which is how people actually enter a code
 * from an authenticator app.
 */
export function TotpStep({ challenge, rememberMe, onVerified, onBack }: TotpStepProps) {
  const { verifyTotp } = useAuth();

  const [digits, setDigits] = useState<string[]>(EMPTY_CODE);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  };

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    setDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });

    if (value && index < TOTP_LENGTH - 1) focusInput(index + 1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
    if (event.key === "ArrowLeft" && index > 0) focusInput(index - 1);
    if (event.key === "ArrowRight" && index < TOTP_LENGTH - 1) focusInput(index + 1);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, TOTP_LENGTH);
    if (!pasted) return;

    event.preventDefault();
    setDigits(EMPTY_CODE.map((_, index) => pasted[index] ?? ""));
    focusInput(Math.min(pasted.length, TOTP_LENGTH - 1));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const parsed = totpSchema.safeParse({ code: digits.join("") });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please enter the complete 6-digit code.");
      return;
    }

    setIsPending(true);
    try {
      const session = await verifyTotp({
        challengeToken: challenge.challengeToken,
        code: parsed.data.code,
        rememberMe,
      });
      onVerified(session.user.role);
    } catch (caught) {
      setError(
        ApiError.isApiError(caught)
          ? caught.message
          : "Invalid authentication code. Please try again.",
      );
      setDigits(EMPTY_CODE);
      focusInput(0);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary-subtle text-primary">
        <ShieldCheckIcon size={22} />
      </span>

      <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-muted-foreground">
        TWO-FACTOR AUTHENTICATION
      </p>

      <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
        Verify your identity
      </h1>

      <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">
        Enter the 6-digit code from your authenticator app for{" "}
        <span className="font-medium text-foreground">{challenge.maskedEmail}</span>.
      </p>

      <form onSubmit={onSubmit} className="mt-7">
        <fieldset>
          <legend className="sr-only">Six digit authentication code</legend>
          <div className="grid grid-cols-6 gap-2 sm:gap-3">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label={`Digit ${index + 1}`}
                maxLength={1}
                value={digit}
                disabled={isPending}
                onChange={(event) => handleChange(event.target.value, index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onPaste={handlePaste}
                className="h-12 w-full min-w-0 rounded-xl border border-input bg-card text-center text-lg font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-primary/10 disabled:opacity-60 sm:h-13 sm:text-xl"
              />
            ))}
          </div>
        </fieldset>

        {error ? <AuthErrorMessage message={error} /> : null}

        <AuthSubmitButton isPending={isPending} pendingLabel="Verifying...">
          Verify &amp; continue
        </AuthSubmitButton>

        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="mt-3 w-full rounded-sm text-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          Back to sign in
        </button>
      </form>
    </>
  );
}
