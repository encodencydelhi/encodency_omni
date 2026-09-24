"use client";

import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import { AuthSubmitButton } from "./auth-submit-button";

interface RecoveryCodesStepProps {
  codes: readonly string[];
  onAcknowledged: () => void;
}

/**
 * Shown exactly once, right after first-time enrollment: the backend returns
 * these codes a single time and never again. They live only in this
 * component's props (in memory) — never in localStorage, sessionStorage,
 * logs or analytics — and are dropped as soon as the user continues.
 */
export function RecoveryCodesStep({ codes, onAcknowledged }: RecoveryCodesStepProps) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <span className="flex size-11 items-center justify-center rounded-sm bg-primary-subtle text-primary">
        <KeyRoundIcon size={22} />
      </span>

      <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-muted-foreground">SAVE YOUR RECOVERY CODES</p>

      <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
        Keep these somewhere safe
      </h1>

      <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
        If you lose your authenticator, each code lets you sign in once. They are shown{" "}
        <span className="font-medium text-foreground">only this one time</span> — store them in a password manager
        or on paper. Never share them.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-2 rounded-sm border border-border bg-card p-4 font-mono text-sm text-foreground sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code} className="select-all tracking-wider">
            {code}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => void copy()}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:text-primary-hover"
      >
        {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
        {copied ? "Copied" : "Copy codes"}
      </button>

      <label className="mt-6 flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
        <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} className="mt-0.5 size-4 accent-primary" />
        I have saved my recovery codes somewhere safe.
      </label>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (saved) onAcknowledged();
        }}
      >
        <fieldset disabled={!saved}>
          <AuthSubmitButton isPending={false} pendingLabel="Continuing...">
            Continue
          </AuthSubmitButton>
        </fieldset>
      </form>
    </>
  );
}
