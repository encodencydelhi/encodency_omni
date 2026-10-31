"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** The compact Admin card used by every Content Studio panel (same look as the campaign pages): slim header, 14px body. */
export function Card({ title, subtitle, action, children, className }: {
  title?: string; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-sm border border-[#E2E8F0] bg-white shadow-xs", className)}>
      {(title || action) && (
        <header className="flex min-h-[40px] flex-wrap items-center justify-between gap-2 border-b border-[#EDF1F5] px-3.5 py-2">
          <div className="min-w-0">
            {title && <h3 className="truncate text-[13px] font-semibold text-[#172044]">{title}</h3>}
            {subtitle && <p className="text-[11.5px] leading-snug text-[#7A87A0]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-3.5">{children}</div>
    </section>
  );
}
