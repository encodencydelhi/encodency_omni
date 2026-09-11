"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ title, subtitle, action, children, className }: {
  title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-[#EDF1F5] px-3 py-2.5">
          <div className="min-w-0">
            {title && <h3 className="truncate text-[13.5px] font-bold text-[#172044]">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[11.5px] text-[#7A87A0]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-3">{children}</div>
    </section>
  );
}
