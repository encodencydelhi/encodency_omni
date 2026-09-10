"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface AuthFieldProps {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Rendered inside the field on the right, e.g. a show/hide toggle. */
  trailing?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Field chrome for the sign-in screen.
 *
 * Auth is the one full-page moment in the product, so its inputs are taller
 * and softer than the dense controls used inside the panel. Keeping that
 * difference in a dedicated component stops it leaking into the data tables.
 */
export function AuthField({
  id,
  label,
  icon: Icon,
  trailing,
  error,
  children,
  className,
}: AuthFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>

      <div className="relative">
        <Icon
          size={18}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        {children}
        {trailing}
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Shared input styling for the auth screen. */
export const AUTH_INPUT_CLASS = cn(
  "h-12 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-sm text-foreground outline-none transition",
  "placeholder:text-muted-foreground/80",
  "focus:border-ring focus:ring-4 focus:ring-primary/10",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-invalid:border-danger aria-invalid:ring-4 aria-invalid:ring-danger/10",
);
