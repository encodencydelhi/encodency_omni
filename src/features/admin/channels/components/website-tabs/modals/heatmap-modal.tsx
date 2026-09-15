"use client";

import { useState } from "react";
import { X, Flame, Laptop, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface HeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageName?: string;
}

export function HeatmapModal({ isOpen, onClose, pageName = "Homepage (namogangetrust.org/)" }: HeatmapModalProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [metric, setMetric] = useState<"clicks" | "scroll" | "attention">("clicks");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150">
      <div className="flex flex-col h-[90vh] w-full max-w-5xl rounded-sm border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-sm bg-amber-500 text-white font-bold text-xs">
              <Flame className="size-3.5" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900">User Behavior Heatmap</h3>
              <p className="text-[10px] text-slate-500">{pageName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Metric Mode */}
            <div className="flex items-center rounded-sm border border-slate-200 bg-white p-0.5 shadow-2xs text-[11px] font-semibold">
              <button
                onClick={() => setMetric("clicks")}
                className={cn("px-2 py-1 rounded-xs transition-colors cursor-pointer", metric === "clicks" ? "bg-amber-500 text-white" : "text-slate-600 hover:text-slate-900")}
              >
                Click Heatmap
              </button>
              <button
                onClick={() => setMetric("scroll")}
                className={cn("px-2 py-1 rounded-xs transition-colors cursor-pointer", metric === "scroll" ? "bg-amber-500 text-white" : "text-slate-600 hover:text-slate-900")}
              >
                Scroll Depth
              </button>
            </div>

            {/* Device Switcher */}
            <div className="flex items-center rounded-sm border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                className={cn("p-1.5 rounded-xs transition-colors cursor-pointer", device === "desktop" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-600")}
              >
                <Laptop className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                className={cn("p-1.5 rounded-xs transition-colors cursor-pointer", device === "mobile" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-600")}
              >
                <Smartphone className="size-3.5" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="grid size-8 place-items-center rounded-sm text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {/* Heatmap summary metrics bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-amber-50/60 px-4 py-2 text-xs">
          <div className="flex gap-4 text-amber-950 font-medium">
            <span>Sample size: <b>3,420 sessions</b></span>
            <span>Avg. Scroll Depth: <b>72.4%</b></span>
            <span>Top Click Element: <b>&quot;Donate Now&quot; CTA (34%)</b></span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
            <span>Low</span>
            <span className="h-2 w-16 rounded-xs bg-gradient-to-r from-blue-500 via-amber-400 to-rose-600 inline-block" />
            <span>High Intensity</span>
          </div>
        </div>

        {/* Simulated Heatmap Viewport */}
        <div className="flex-1 min-h-0 bg-slate-900/90 overflow-y-auto p-4 flex justify-center items-start relative">
          <div
            className={cn(
              "bg-white rounded-sm border border-slate-700 shadow-2xl relative overflow-hidden transition-all duration-200",
              device === "desktop" ? "w-full max-w-4xl" : "w-[360px]"
            )}
          >
            {/* Simulated Page Content with visual heat glowing circles */}
            <div className="relative">
              {/* Heat Spots */}
              {metric === "clicks" && (
                <>
                  <div className="absolute top-[80px] right-[40px] size-24 rounded-full bg-rose-500/50 blur-xl pointer-events-none" />
                  <div className="absolute top-[85px] right-[45px] size-12 rounded-full bg-yellow-400/70 blur-md pointer-events-none" />

                  <div className="absolute top-[220px] left-[120px] size-32 rounded-full bg-rose-600/40 blur-2xl pointer-events-none" />
                  <div className="absolute top-[235px] left-[140px] size-16 rounded-full bg-yellow-300/80 blur-lg pointer-events-none" />

                  <div className="absolute top-[380px] right-[160px] size-28 rounded-full bg-amber-500/40 blur-xl pointer-events-none" />
                </>
              )}

              {metric === "scroll" && (
                <div className="absolute inset-0 pointer-events-none flex flex-col">
                  <div className="h-44 bg-emerald-500/20 border-b border-emerald-400 text-right pr-2 text-[10px] font-bold text-emerald-800">100% of visitors saw this</div>
                  <div className="h-52 bg-yellow-500/20 border-b border-yellow-400 text-right pr-2 text-[10px] font-bold text-yellow-800">78% scroll depth</div>
                  <div className="h-60 bg-amber-500/20 border-b border-amber-400 text-right pr-2 text-[10px] font-bold text-amber-800">54% scroll depth</div>
                  <div className="h-60 bg-rose-500/20 text-right pr-2 text-[10px] font-bold text-rose-800">22% reached footer</div>
                </div>
              )}

              {/* Underlying Web Layout */}
              <nav className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                <div className="font-bold text-xs text-slate-900">Namo Gange Trust</div>
                <div className="flex gap-2">
                  <span className="text-[11px] text-slate-600">Home</span>
                  <span className="text-[11px] text-slate-600">About</span>
                  <span className="text-[11px] font-bold text-white bg-blue-600 px-2.5 py-0.5 rounded-sm">Donate Now</span>
                </div>
              </nav>

              <section className="p-8 bg-gradient-to-r from-blue-900 to-indigo-950 text-white space-y-3">
                <h1 className="text-xl font-bold">Restoring India&apos;s Sacred Ganga Riverfronts</h1>
                <p className="text-xs text-slate-300 max-w-lg">Over 500+ passionate volunteers dedicated to community clean-up drives.</p>
                <button className="h-8 px-4 rounded-sm bg-amber-500 font-bold text-xs text-slate-950">
                  Register For Sunday Drive
                </button>
              </section>

              <section className="p-8 space-y-4">
                <h2 className="text-sm font-bold text-slate-900">Key Conservation Programs</h2>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 border border-slate-200 rounded-sm">Riverfront Cleanup</div>
                  <div className="p-3 border border-slate-200 rounded-sm">Water Quality Testing</div>
                  <div className="p-3 border border-slate-200 rounded-sm">Community Awareness</div>
                </div>
              </section>

              <footer className="p-6 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-400 text-center">
                © 2025 Namo Gange Trust • Clean Ganga Initiative
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
