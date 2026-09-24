"use client";

import { QrCodeIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { TOTP_LENGTH, totpSchema } from "@/features/auth/schemas/login-schema";
import { ApiError } from "@/types/api";
import type { EnrollmentResult, TotpChallenge, TotpSetupResponse } from "@/types/domain/auth";
import { AuthErrorMessage } from "./auth-message";
import { AuthSubmitButton } from "./auth-submit-button";

interface TotpSetupStepProps {
  challenge: TotpChallenge;
  /** Enrollment succeeded; the one-time recovery codes must be shown before the user enters the app. */
  onEnrolled: (result: EnrollmentResult) => void;
  onBack: () => void;
}

const EMPTY_CODE = Array.from({ length: TOTP_LENGTH }, () => "");

function manualKeyFrom(otpauthUri: string): string | null {
  try {
    return new URL(otpauthUri).searchParams.get("secret");
  } catch {
    return null;
  }
}

/**
 * First-time authenticator enrollment (mandatory MFA). The QR code and key come
 * from the backend's POST /auth/totp/setup response and are only held in
 * component state while this step is open.
 */
export function TotpSetupStep({ challenge, onEnrolled, onBack }: TotpSetupStepProps) {
  const { setupTotp, verifyTotpSetup } = useAuth();

  const [setupData, setSetupData] = useState<TotpSetupResponse | null>(null);
  const [setupError, setSetupError] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [digits, setDigits] = useState<string[]>(EMPTY_CODE);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const isFetching = !setupData && !setupError;

  useEffect(() => {
    let cancelled = false;

    setupTotp(challenge.challengeToken)
      .then((data) => {
        if (!cancelled) setSetupData(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setSetupError(
            ApiError.isApiError(err) && err.status === 401
              ? "This setup session has expired. Go back and sign in again."
              : ApiError.isApiError(err)
                ? err.message
                : "Failed to generate the QR code.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [challenge.challengeToken, setupTotp]);

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
      onEnrolled(await verifyTotpSetup({ challengeToken: challenge.challengeToken, code: parsed.data.code }));
    } catch (caught) {
      setError(
        ApiError.isApiError(caught) && caught.status === 401
          ? "That code was not accepted. Check the time on your phone, wait for a new code and try again."
          : ApiError.isApiError(caught)
            ? caught.message
            : "Invalid authentication code. Please try again.",
      );
      setDigits(EMPTY_CODE);
      focusInput(0);
    } finally {
      setIsPending(false);
    }
  };

  const manualKey = setupData ? manualKeyFrom(setupData.otpauthUri) : null;

  return (
    <>
      <span className="flex size-11 items-center justify-center rounded-sm bg-primary-subtle text-primary">
        <QrCodeIcon size={22} />
      </span>

      <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-muted-foreground">
        SET UP AUTHENTICATOR
      </p>

      <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
        Secure your account
      </h1>

      <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
        Scan the QR code with an authenticator app (e.g. Microsoft or Google Authenticator) and enter the code below to complete setup.
      </p>

      {isFetching ? (
        <div className="mt-6 flex h-[200px] items-center justify-center rounded-sm border border-dashed border-border bg-card">
          <p className="text-sm text-muted-foreground animate-pulse">Generating QR Code...</p>
        </div>
      ) : setupData?.qrDataUrl ? (
        <div className="mt-6 flex flex-col items-center rounded-sm border border-border bg-white p-4">
          {/* A data: URL from the API; next/image adds nothing for an inline, never-cached QR code. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setupData.qrDataUrl} alt="Authenticator QR code" className="h-[180px] w-[180px]" />
          {manualKey ? (
            showKey ? (
              <p className="mt-3 break-all text-center font-mono text-xs text-foreground">{manualKey}</p>
            ) : (
              <button type="button" onClick={() => setShowKey(true)} className="mt-3 text-xs font-medium text-primary hover:text-primary-hover">
                Can&apos;t scan? Show setup key
              </button>
            )
          ) : null}
        </div>
      ) : null}

      {setupError ? <AuthErrorMessage message={setupError} /> : null}

      <form onSubmit={onSubmit} className="mt-7">
        <fieldset disabled={isFetching || !setupData}>
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
          Complete setup &amp; continue
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
