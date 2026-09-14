"use client";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PlatformBadge } from "./ui-platform";
import type { PlatformValidation, ValidationLevel } from "../types/content.types";
import { PLATFORM_META } from "../config/platform-config";

type Props = {
  validations: PlatformValidation[];
  totalPlatforms: number;
};

const LEVEL_ICON: Record<ValidationLevel, React.ReactNode> = {
  ready: <CheckCircle2 className="size-3.5 text-emerald-500" />,
  warning: <AlertTriangle className="size-3.5 text-amber-500" />,
  error: <XCircle className="size-3.5 text-red-500" />,
};

const LEVEL_STYLE: Record<ValidationLevel, string> = {
  ready: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-600",
};

export function PlatformValidationPanel({ validations, totalPlatforms }: Props) {
  const readyCount = validations.filter(v => v.level === "ready").length;
  const warningCount = validations.filter(v => v.level === "warning").length;
  const errorCount = validations.filter(v => v.level === "error").length;
  const allReady = errorCount === 0 && warningCount === 0;

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)] overflow-hidden">
      <header className="px-3 py-2.5 border-b border-[#EDF1F5]">
        <div className="flex items-center justify-between">
          <h3 className="text-[13.5px] font-bold text-[#172044]">Channel Status</h3>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            allReady ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700"
          )}>
            {readyCount}/{totalPlatforms} ready
          </span>
        </div>
      </header>

      <div className="p-3 space-y-1">
        {validations.map((v) => {
          const meta = PLATFORM_META[v.platform];

          return (
            <div key={v.platform} className="rounded-lg border border-[#E2E8F0] overflow-hidden">
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                {LEVEL_ICON[v.level]}
                <PlatformBadge platform={v.platform} size="sm" />
                <span className="flex-1 text-[11px] font-semibold text-[#33445F]">{meta.label}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold", LEVEL_STYLE[v.level])}>
                  {v.level === "ready" ? "Ready" : v.level === "warning" ? "Warning" : "Error"}
                </span>
              </div>

              {v.items.length > 0 && (
                <div className="border-t border-[#EDF1F5] bg-[#F8FAFD] px-2.5 py-1.5 space-y-0.5">
                  {v.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      {item.level === "ready" && <CheckCircle2 className="mt-0.5 size-2.5 shrink-0 text-emerald-500" />}
                      {item.level === "warning" && <AlertTriangle className="mt-0.5 size-2.5 shrink-0 text-amber-500" />}
                      {item.level === "error" && <XCircle className="mt-0.5 size-2.5 shrink-0 text-red-500" />}
                      <span className="text-[10px] text-[#687797]">{item.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
