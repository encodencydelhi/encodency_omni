"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { createContext, useContext, useState, type ComponentType, type ReactNode } from "react";
import { AlertTriangle, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useBeforeUnload } from "../billing-data/hooks";
import { Button } from "./ui";

interface Guard {
  label: string;
  onSave?: () => Promise<boolean>;
  saveLabel?: string;
  onDiscard?: () => void;
}

const FlowCloseContext = createContext<() => void>(() => { });

/** Close the surrounding flow, going through its unsaved-changes guard. */
export function useFlowClose() {
  return useContext(FlowCloseContext);
}

export function FlowShell({
  open,
  onOpenChange,
  variant = "dialog",
  width = 560,
  title,
  description,
  icon: Icon,
  steps,
  step,
  dirty = false,
  guard,
  locked = false,
  footer,
  children,
  bodyClassName,
  headerExtra,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "dialog" | "sheet";
  width?: number;
  title: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  steps?: string[];
  step?: number;
  dirty?: boolean;
  guard?: Guard;
  /** While true (e.g. a payment is processing) the flow can't be closed. */
  locked?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  headerExtra?: ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  useBeforeUnload(open && dirty);

  const requestClose = () => {
    if (locked || saving) return;
    if (dirty && guard) setConfirming(true);
    else onOpenChange(false);
  };

  const intercept = (event: Event) => {
    event.preventDefault();
    requestClose();
  };

  const sheet = variant === "sheet";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0F1B3D]/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          onEscapeKeyDown={intercept}
          onPointerDownOutside={intercept}
          onInteractOutside={(event) => event.preventDefault()}
          style={{ ["--flow-width" as string]: `${width}px` }}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-white shadow-[0_24px_64px_-16px_rgba(15,27,61,0.35)] outline-none",
            sheet
              ? "inset-y-0 right-0 h-[100dvh] w-full border-l border-[#E4E9F0] sm:max-w-[var(--flow-width)] data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-200"
              : "inset-0 h-[100dvh] w-full sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100dvh-48px)] sm:w-[calc(100vw-48px)] sm:max-w-[var(--flow-width)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[12px] sm:border sm:border-[#E4E9F0] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        >
          <FlowCloseContext.Provider value={requestClose}>
            <div className="flex items-start gap-3 border-b border-[#EEF1F5] px-5 py-4">
              {Icon && (
                <span className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-[#EFF4FF] text-[#1D4ED8]">
                  <Icon className="size-[18px]" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="text-[15px] font-semibold leading-5 text-[#0F1B3D]">{title}</DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="mt-0.5 text-[12.5px] leading-4 text-[#6B7890]">{description}</DialogPrimitive.Description>
                ) : (
                  <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : "Billing"}</DialogPrimitive.Description>
                )}
              </div>
              {headerExtra}
              <Button size="iconSm" variant="ghost" aria-label="Close" onClick={requestClose} disabled={locked || saving}>
                <XIcon className="size-4" />
              </Button>
            </div>

            {steps && step !== undefined && <Steps steps={steps} current={step} />}

            <div className={cn("scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>{children}</div>

            {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF1F5] bg-white px-5 py-3">{footer}</div>}

            {confirming && guard && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-white/80 p-4 backdrop-blur-[1px]" role="alertdialog" aria-modal="true" aria-labelledby="leave-title">
                <div className="w-full max-w-[380px] rounded-[10px] border border-[#E4E9F0] bg-white p-4 shadow-[0_16px_40px_-12px_rgba(15,27,61,0.3)]">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#FFF7E8] text-[#B54708]">
                      <AlertTriangle className="size-[18px]" />
                    </span>
                    <div>
                      <p id="leave-title" className="text-[14px] font-semibold text-[#0F1B3D]">
                        You have unsaved changes
                      </p>
                      <p className="mt-1 text-[12.5px] leading-5 text-[#3C4A66]">Your changes to {guard.label} haven&apos;t been saved. If you leave now they&apos;ll be lost.</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" onClick={() => setConfirming(false)} disabled={saving} autoFocus>
                      Stay
                    </Button>
                    <Button
                      variant="danger"
                      disabled={saving}
                      onClick={() => {
                        setConfirming(false);
                        guard.onDiscard?.();
                        onOpenChange(false);
                      }}
                    >
                      Discard
                    </Button>
                    {guard.onSave && (
                      <Button
                        variant="primary"
                        loading={saving}
                        onClick={async () => {
                          setSaving(true);
                          const ok = await guard.onSave!();
                          setSaving(false);
                          setConfirming(false);
                          if (ok) onOpenChange(false);
                        }}
                      >
                        {guard.saveLabel ?? "Save & leave"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </FlowCloseContext.Provider>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-1.5 overflow-x-auto border-b border-[#EEF1F5] px-5 py-2.5" aria-label="Progress">
      {steps.map((label, index) => (
        <li key={label} className="flex min-w-0 shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "grid size-5 shrink-0 place-items-center rounded-full text-[10.5px] font-bold transition-colors",
              index < current ? "bg-[#12B76A] text-white" : index === current ? "bg-[#2563EB] text-white" : "bg-[#F1F4F8] text-[#98A2B3]",
            )}
            aria-current={index === current ? "step" : undefined}
          >
            {index < current ? "✓" : index + 1}
          </span>
          <span className={cn("whitespace-nowrap text-[11.5px] font-medium", index === current ? "text-[#0F1B3D]" : "text-[#98A2B3]", index !== current && "max-sm:hidden")}>{label}</span>
          {index < steps.length - 1 && <span className="h-px w-3 shrink-0 bg-[#E4E9F0] sm:w-6" />}
        </li>
      ))}
    </ol>
  );
}

/** Inline failure with recovery, shown inside a flow instead of a toast. */
export function FlowError({ message, hint, actions }: { message: string; hint: string; actions?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 rounded-[10px] border border-[#FBD5D9] bg-[#FEF6F7] px-3.5 py-3">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#C81E2B]" />
      <div className="min-w-[200px] flex-1">
        <p className="text-[13px] font-semibold text-[#0F1B3D]">{message}</p>
        <p className="mt-0.5 text-[12.5px] leading-5 text-[#3C4A66]">{hint}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
