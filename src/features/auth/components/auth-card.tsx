import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** The white panel that carries every authentication step. */
export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[1.25rem] border border-border bg-card px-6 py-7 shadow-[0_18px_70px_rgb(15_23_42/0.07)] sm:px-10 sm:py-9",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Corporate sign-off shown beneath the card. */
export function AuthPanelFooter() {
  return (
    <>
      <div className="mt-6 flex items-center justify-center gap-4">
        <span className="h-px w-20 bg-border-strong" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Powered by <span className="font-semibold text-primary">EnCodency</span>
        </p>
        <span className="h-px w-20 bg-border-strong" aria-hidden />
      </div>

      <p className="mt-3 text-center text-[0.625rem] font-semibold tracking-[0.25em] text-muted-foreground/80">
        TECHNOLOGY FOR A HIGHER TOMORROW
      </p>
    </>
  );
}
