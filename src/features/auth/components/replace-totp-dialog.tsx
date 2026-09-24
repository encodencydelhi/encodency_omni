"use client";

import { KeyRoundIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authService } from "@/features/auth/services/auth-service";
import { TOTP_LENGTH, recoveryCodeSchema, totpSchema } from "@/features/auth/schemas/login-schema";
import { ApiError } from "@/types/api";
import type { TotpReplacementPendingResponse } from "@/types/domain/auth";
import { AuthErrorMessage } from "./auth-message";

type Step = "authorize" | "enroll" | "complete";

const EMPTY_CODE = Array.from({ length: TOTP_LENGTH }, () => "");

function manualKeyFrom(otpauthUri: string): string | null {
  try {
    return new URL(otpauthUri).searchParams.get("secret");
  } catch {
    return null;
  }
}

function describeFailure(caught: unknown, fallback: string): string {
  if (ApiError.isApiError(caught) && caught.status === 401) return fallback;
  return ApiError.isApiError(caught) ? caught.message : fallback;
}

interface ReplaceTotpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Self-service MFA rotation for a signed-in account.
 *
 * Step 1  POST /auth/totp/replace           — authorised with the CURRENT
 *          authenticator code or a recovery code; returns a pending QR for
 *          the NEW secret. The active factor is unchanged if this is abandoned.
 * Step 2  POST /auth/totp/verify-replacement — code from the NEW entry;
 *          swaps the secret, rotates recovery codes, revokes other sessions.
 * Step 3  One-time recovery codes shown in memory only, same rule as enrollment.
 *
 * Both endpoints are AccountRoute (session cookie); 401 means "wrong code",
 * never a lost session, so the transport must not fire the session-expiry event.
 */
export function ReplaceTotpDialog({ open, onOpenChange }: ReplaceTotpDialogProps) {
  const [step, setStep] = useState<Step>("authorize");
  const [mode, setMode] = useState<"totp" | "recovery">("totp");

  const [digits, setDigits] = useState<string[]>(EMPTY_CODE);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [pending, setPending] = useState<TotpReplacementPendingResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [savedCodes, setSavedCodes] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Reset every time the dialog opens so a previous abandoned attempt never leaks.
  useEffect(() => {
    if (!open) return;
    setStep("authorize");
    setMode("totp");
    setDigits(EMPTY_CODE);
    setRecoveryCode("");
    setPending(null);
    setRecoveryCodes([]);
    setSavedCodes(false);
    setShowKey(false);
    setError("");
  }, [open]);

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
    if (event.key === "Backspace" && !digits[index] && index > 0) focusInput(index - 1);
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

  const onAuthorize = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    let authorization: { code: string } | { recoveryCode: string };
    if (mode === "totp") {
      const parsed = totpSchema.safeParse({ code: digits.join("") });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please enter the complete 6-digit code.");
        return;
      }
      authorization = { code: parsed.data.code };
    } else {
      const parsed = recoveryCodeSchema.safeParse({ code: recoveryCode });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please enter a recovery code.");
        return;
      }
      authorization = { recoveryCode: parsed.data.code };
    }

    setIsPending(true);
    try {
      const result = await authService.requestTotpReplacement(authorization);
      setPending(result);
      setDigits(EMPTY_CODE);
      setRecoveryCode("");
      setStep("enroll");
    } catch (caught) {
      setError(
        describeFailure(
          caught,
          mode === "totp"
            ? "That code was not accepted. Wait for a new code in your app — the code used to sign in cannot be reused."
            : "That recovery code was not accepted. Each code works only once.",
        ),
      );
      setDigits(EMPTY_CODE);
      focusInput(0);
    } finally {
      setIsPending(false);
    }
  };

  const onVerifyNew = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!pending) return;

    const parsed = totpSchema.safeParse({ code: digits.join("") });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please enter the complete 6-digit code.");
      return;
    }

    setIsPending(true);
    try {
      const result = await authService.verifyTotpReplacement({
        challengeToken: pending.challengeToken,
        code: parsed.data.code,
      });
      setRecoveryCodes(result.recoveryCodes);
      setPending(null);
      setDigits(EMPTY_CODE);
      setStep("complete");
      toast.success("Authenticator replaced. Other sessions were signed out.");
    } catch (caught) {
      setError(
        describeFailure(
          caught,
          "That code was not accepted. Make sure it comes from the NEW entry, wait for the next code and try again.",
        ),
      );
      setDigits(EMPTY_CODE);
      focusInput(0);
    } finally {
      setIsPending(false);
    }
  };

  const manualKey = pending ? manualKeyFrom(pending.otpauthUri) : null;
  const expiresLabel = pending
    ? new Date(pending.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "authorize"
              ? "Replace authenticator"
              : step === "enroll"
                ? "Set up the new authenticator"
                : "Save your new recovery codes"}
          </DialogTitle>
          <DialogDescription>
            {step === "authorize"
              ? "Authorise with your current authenticator or a recovery code, then confirm a code from a new entry. Your current setup stays active until the last step succeeds."
              : step === "enroll"
                ? "Add this as a NEW entry in your authenticator app (keep the old one until this finishes), then enter a code from the new entry."
                : "Your previous recovery codes no longer work. These are shown only this once."}
          </DialogDescription>
        </DialogHeader>

        {step === "authorize" ? (
          <form onSubmit={onAuthorize} className="space-y-4">
            <div className="flex gap-1 rounded-sm border border-border bg-muted p-1" role="tablist" aria-label="Authorisation method">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "totp"}
                onClick={() => {
                  setMode("totp");
                  setError("");
                  setDigits(EMPTY_CODE);
                  setRecoveryCode("");
                }}
                disabled={isPending}
                className={`flex-1 rounded-sm px-2 py-1.5 text-xs font-semibold transition ${mode === "totp" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                Authenticator code
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "recovery"}
                onClick={() => {
                  setMode("recovery");
                  setError("");
                  setDigits(EMPTY_CODE);
                  setRecoveryCode("");
                }}
                disabled={isPending}
                className={`flex-1 rounded-sm px-2 py-1.5 text-xs font-semibold transition ${mode === "recovery" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                Recovery code
              </button>
            </div>

            {mode === "totp" ? (
              <fieldset disabled={isPending}>
                <legend className="sr-only">Six digit code from your current authenticator</legend>
                <div className="grid grid-cols-6 gap-2">
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
                      className="h-11 w-full min-w-0 rounded-sm border border-input bg-card text-center text-lg font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
                    />
                  ))}
                </div>
              </fieldset>
            ) : (
              <input
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                disabled={isPending}
                aria-label="Recovery code"
                className="h-11 w-full rounded-sm border border-input bg-card px-3 font-mono text-sm tracking-wider text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
              />
            )}

            {error ? <AuthErrorMessage message={error} /> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2Icon className="animate-spin" aria-hidden /> : <ShieldCheckIcon aria-hidden />}
                {isPending ? "Checking..." : "Continue"}
              </Button>
            </div>
          </form>
        ) : null}

        {step === "enroll" && pending ? (
          <form onSubmit={onVerifyNew} className="space-y-4">
            <div className="flex flex-col items-center rounded-sm border border-border bg-white p-4">
              {/* data: URL from the API; next/image adds nothing for an inline, never-cached QR code. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pending.qrDataUrl} alt="New authenticator QR code" className="h-[180px] w-[180px]" />
              {manualKey ? (
                showKey ? (
                  <p className="mt-3 break-all text-center font-mono text-xs text-foreground">{manualKey}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowKey(true)}
                    className="mt-3 text-xs font-medium text-primary hover:text-primary-hover"
                  >
                    Can&apos;t scan? Show setup key
                  </button>
                )
              ) : null}
              {expiresLabel ? (
                <p className="mt-2 text-[11px] text-muted-foreground">Expires at {expiresLabel}. Don&apos;t share this screen.</p>
              ) : null}
            </div>

            <fieldset disabled={isPending}>
              <legend className="text-xs font-semibold text-foreground">Code from the NEW entry</legend>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      inputRefs.current[index] = element;
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label={`New entry digit ${index + 1}`}
                    maxLength={1}
                    value={digit}
                    disabled={isPending}
                    onChange={(event) => handleChange(event.target.value, index)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    onPaste={handlePaste}
                    className="h-11 w-full min-w-0 rounded-sm border border-input bg-card text-center text-lg font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
                  />
                ))}
              </div>
            </fieldset>

            {error ? <AuthErrorMessage message={error} /> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2Icon className="animate-spin" aria-hidden /> : <ShieldCheckIcon aria-hidden />}
                {isPending ? "Confirming..." : "Confirm replacement"}
              </Button>
            </div>
          </form>
        ) : null}

        {step === "complete" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you lose this authenticator, each code lets you sign in once. Store them in a password manager
              or on paper. Never share them.
            </p>
            <ul className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto rounded-sm border border-border bg-card p-3 font-mono text-sm text-foreground sm:grid-cols-2">
              {recoveryCodes.map((code) => (
                <li key={code} className="select-all tracking-wider">
                  {code}
                </li>
              ))}
            </ul>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={savedCodes}
                onChange={(event) => setSavedCodes(event.target.checked)}
                className="mt-0.5 size-4 accent-primary"
              />
              I have saved my recovery codes somewhere safe.
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" disabled={!savedCodes} onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : null}

        {step !== "complete" ? (
          <p className="flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
            <KeyRoundIcon className="mt-px size-3.5 shrink-0" aria-hidden />
            Completing rotation signs out every other session. This session stays signed in.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
