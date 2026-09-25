"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { Field } from "../primitives";

/** Compact numbered stepper used by multi-step dialogs and the create wizard. */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <ol className={cn("flex items-center gap-1.5 overflow-x-auto scrollbar-thin", className)} aria-label="Progress">
      {steps.map((label, index) => {
        const state = index < current ? "done" : index === current ? "current" : "todo";
        return (
          <li key={label} className="flex shrink-0 items-center gap-1.5" aria-current={state === "current" ? "step" : undefined}>
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-sm border text-[11px] font-semibold tabular",
                state === "done" && "border-success/30 bg-success-subtle text-success",
                state === "current" && "border-primary bg-primary text-primary-foreground",
                state === "todo" && "border-border-strong bg-card text-muted-foreground",
              )}
            >
              {state === "done" ? <CheckIcon className="size-3" strokeWidth={3} aria-hidden /> : index + 1}
            </span>
            <span className={cn("text-2xs font-medium", state === "current" ? "text-foreground" : "text-muted-foreground", state !== "current" && "hidden sm:inline")}>
              {label}
            </span>
            {index < steps.length - 1 ? <span className="mx-0.5 h-px w-4 bg-border-strong sm:w-6" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** A dialog shell with a consistent header, scrolling body and footer. */
export function FlowDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  showClose = true,
  badge = (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 shrink-0">
      Preview Mode
    </span>
  ),
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  size?: "md" | "lg" | "xl";
  showClose?: boolean;
  badge?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={showClose}
        className={cn(
          "max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-5",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl",
          size === "xl" && "max-w-4xl",
        )}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="flex-1">{title}</DialogTitle>
            {badge}
          </div>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="min-h-0 space-y-3 overflow-y-auto pr-0.5 scrollbar-thin">{children}</div>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SubmitButton({
  pending,
  children,
  variant = "default",
  disabled,
  onClick,
  type = "button",
}: {
  pending: boolean;
  children: ReactNode;
  variant?: "default" | "destructive" | "outline";
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <Button type={type} variant={variant} disabled={pending || disabled} onClick={onClick}>
      {pending ? <Loader2Icon className="animate-spin" /> : null}
      {children}
    </Button>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <AlertBanner tone="danger" title="Nothing was changed">
      {message}
    </AlertBanner>
  );
}

/** Requires the operator to type a phrase before a high-risk action is enabled. */
export function ConfirmPhrase({
  id,
  phrase,
  value,
  onChange,
  label,
}: {
  id: string;
  phrase: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <Field
      label={label ?? `Type "${phrase}" to confirm`}
      htmlFor={id}
      hint="This confirmation is required because the action is hard to undo."
    >
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder={phrase}
      />
    </Field>
  );
}

export function phraseMatches(value: string, phrase: string): boolean {
  return value.trim().toLowerCase() === phrase.trim().toLowerCase();
}

/** A list of consequences, each tagged so no one mistakes intent for completed work. */
export function ImpactList({ items }: { items: ReadonlyArray<{ area: string; intent: string }> }) {
  return (
    <ul className="divide-y divide-border rounded-sm border border-border">
      {items.map((item) => (
        <li key={item.area} className="flex items-start justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[0.8125rem] font-medium text-foreground">{item.area}</p>
            <p className="text-2xs text-muted-foreground">{item.intent}</p>
          </div>
          <span className="shrink-0 rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-0.5 text-[11px] font-medium text-neutral">
            Backend enforced
          </span>
        </li>
      ))}
    </ul>
  );
}
