"use client";

import { ArrowRightIcon, Loader2Icon } from "lucide-react";

interface AuthSubmitButtonProps {
  isPending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
}

/** The single primary action on the sign-in screen. */
export function AuthSubmitButton({ isPending, pendingLabel, children }: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-linear-to-r from-brand-cta-from to-brand-cta-to font-semibold text-primary-foreground shadow-[0_8px_20px_-6px_rgb(226_6_17/0.35)] transition hover:brightness-95 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <>
          <Loader2Icon size={19} className="animate-spin" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          <ArrowRightIcon size={19} aria-hidden />
        </>
      )}
    </button>
  );
}
