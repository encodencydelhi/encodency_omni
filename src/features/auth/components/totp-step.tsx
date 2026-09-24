"use client";

import { KeyRoundIcon, ShieldCheckIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { TOTP_LENGTH, recoveryCodeSchema, totpSchema } from "@/features/auth/schemas/login-schema";
import { ApiError } from "@/types/api";
import type { AuthenticatedUser, TotpChallenge } from "@/types/domain/auth";
import { AUTH_INPUT_CLASS } from "./auth-field";
import { AuthErrorMessage } from "./auth-message";
import { AuthSubmitButton } from "./auth-submit-button";

interface TotpStepProps {
  challenge: TotpChallenge;
  onVerified: (user: AuthenticatedUser) => void;
  onBack: () => void;
}

const EMPTY_CODE = Array.from({ length: TOTP_LENGTH }, () => "");

function describeFailure(caught: unknown, fallback: string): string {
  if (ApiError.isApiError(caught) && caught.status === 401) return fallback;
  return ApiError.isApiError(caught) ? caught.message : fallback;
}

/**
 * Second factor for an enrolled account: a code from the authenticator app,
 * or — if the device is lost — one of the one-time recovery codes. Both go to
 * the real backend with the short-lived challenge token; neither is stored.
 */
export function TotpStep({ challenge, onVerified, onBack }: TotpStepProps) {
  const { verifyTotp, verifyRecoveryCode } = useAuth();

  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [digits, setDigits] = useState<string[]>(EMPTY_CODE);
  const [recoveryCode, setRecoveryCode] = useState("");
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

  const switchMode = (next: "totp" | "recovery") => {
    setMode(next);
    setError("");
    setDigits(EMPTY_CODE);
    setRecoveryCode("");
  };

  const onSubmitTotp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const parsed = totpSchema.safeParse({ code: digits.join("") });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please enter the complete 6-digit code.");
      return;
    }

    setIsPending(true);
    try {
      onVerified(await verifyTotp({ challengeToken: challenge.challengeToken, code: parsed.data.code }));
    } catch (caught) {
      setError(
        describeFailure(
          caught,
          "That code was not accepted. Wait for a new code in your app and try again — if this keeps failing, sign in again.",
        ),
      );
      setDigits(EMPTY_CODE);
      focusInput(0);
    } finally {
      setIsPending(false);
    }
  };

  const onSubmitRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const parsed = recoveryCodeSchema.safeParse({ code: recoveryCode });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please enter a recovery code.");
      return;
    }

    setIsPending(true);
    try {
      onVerified(await verifyRecoveryCode({ challengeToken: challenge.challengeToken, code: parsed.data.code }));
    } catch (caught) {
      setError(describeFailure(caught, "That recovery code was not accepted. Each code works only once."));
      setRecoveryCode("");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <span className="flex size-11 items-center justify-center rounded-sm bg-primary-subtle text-primary">
        {mode === "totp" ? <ShieldCheckIcon size={22} /> : <KeyRoundIcon size={22} />}
      </span>

      <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-muted-foreground">
        TWO-FACTOR AUTHENTICATION
      </p>

      <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
        Verify your identity
      </h1>

      {mode === "totp" ? (
        <>
          <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">
            Enter the 6-digit code from your authenticator app for{" "}
            <span className="font-medium text-foreground">{challenge.maskedEmail}</span>.
          </p>

          <form onSubmit={onSubmitTotp} className="mt-7">
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
                    className="h-12 w-full min-w-0 rounded-sm border border-input bg-card text-center text-lg font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-primary/10 disabled:opacity-60 sm:h-13 sm:text-xl"
                  />
                ))}
              </div>
            </fieldset>

            {error ? <AuthErrorMessage message={error} /> : null}

            <AuthSubmitButton isPending={isPending} pendingLabel="Verifying...">
              Verify &amp; continue
            </AuthSubmitButton>
          </form>
        </>
      ) : (
        <>
          <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">
            Enter one of the recovery codes you saved when you set up your authenticator. Each code can be used once.
          </p>

          <form onSubmit={onSubmitRecovery} className="mt-7" noValidate>
            <label htmlFor="recovery-code" className="sr-only">
              Recovery code
            </label>
            <input
              id="recovery-code"
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
              disabled={isPending}
              className={`${AUTH_INPUT_CLASS} font-mono tracking-wider`}
            />

            {error ? <AuthErrorMessage message={error} /> : null}

            <AuthSubmitButton isPending={isPending} pendingLabel="Verifying...">
              Verify recovery code
            </AuthSubmitButton>
          </form>
        </>
      )}

      <button
        type="button"
        onClick={() => switchMode(mode === "totp" ? "recovery" : "totp")}
        disabled={isPending}
        className="mt-4 w-full rounded-sm text-center text-sm font-medium text-primary transition hover:text-primary-hover"
      >
        {mode === "totp" ? "Lost your device? Use a recovery code" : "Use an authenticator code instead"}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={isPending}
        className="mt-2 w-full rounded-sm text-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        Back to sign in
      </button>
    </>
  );
}
