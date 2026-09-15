"use client";

import { useState } from "react";
import { X, Laptop, Tablet, Smartphone, Globe } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { WebsitePageItem } from "../types";

interface PreviewPageModalProps {
  page: WebsitePageItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PreviewPageModal({ page, isOpen, onClose }: PreviewPageModalProps) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  if (!isOpen || !page) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150">
      <div className="flex flex-col h-[90vh] w-full max-w-5xl rounded-sm border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-sm bg-blue-600 text-white font-bold text-xs">
              <Globe className="size-3.5" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900 truncate max-w-[280px] sm:max-w-md">
                Live Preview: {page.name}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono truncate">https://namogangetrust.org{page.slug}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport switchers */}
            <div className="flex items-center rounded-sm border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                className={cn(
                  "p-1.5 rounded-xs text-xs font-bold transition-colors cursor-pointer",
                  device === "desktop" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-900"
                )}
                title="Desktop View"
              >
                <Laptop className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDevice("tablet")}
                className={cn(
                  "p-1.5 rounded-xs text-xs font-bold transition-colors cursor-pointer",
                  device === "tablet" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-900"
                )}
                title="Tablet View"
              >
                <Tablet className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                className={cn(
                  "p-1.5 rounded-xs text-xs font-bold transition-colors cursor-pointer",
                  device === "mobile" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-900"
                )}
                title="Mobile View"
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

        {/* Viewport simulator container */}
        <div className="flex-1 min-h-0 bg-slate-100 overflow-y-auto p-4 flex justify-center items-start">
          <div
            className={cn(
              "bg-white rounded-sm border border-slate-200 shadow-xl overflow-hidden transition-all duration-200 flex flex-col my-auto",
              device === "desktop" ? "w-full min-h-[580px]" : device === "tablet" ? "w-[768px] min-h-[580px]" : "w-[360px] min-h-[580px]"
            )}
          >
            {/* Browser chrome simulation */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 bg-slate-50 text-[10px] text-slate-500 font-mono">
              <div className="flex gap-1">
                <span className="size-2 rounded-full bg-rose-400" />
                <span className="size-2 rounded-full bg-amber-400" />
                <span className="size-2 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 bg-white border border-slate-200 rounded-sm px-2 py-0.5 truncate text-[9.5px]">
                https://namogangetrust.org{page.slug}
              </div>
            </div>

            {/* Simulated Header */}
            <nav className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <div className="grid size-6 place-items-center rounded-sm bg-blue-600 text-white font-bold text-[10px]">
                  NG
                </div>
                <span className="text-xs font-bold text-slate-900">Namo Gange Trust</span>
              </div>
              <div className="flex gap-3 text-xs font-semibold text-slate-600">
                <span className="hover:text-blue-600 cursor-pointer">About</span>
                <span className="hover:text-blue-600 cursor-pointer">Programs</span>
                <span className="hover:text-blue-600 cursor-pointer">Events</span>
                <span className="text-blue-600 font-bold hover:underline cursor-pointer">Donate</span>
              </div>
            </nav>

            {/* Simulated Hero Section */}
            <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-8">
              <div className="max-w-2xl space-y-2">
                <span className="inline-block rounded-xs bg-blue-400/20 border border-blue-300/30 px-2 py-0.5 text-[9.5px] font-bold tracking-wider uppercase text-blue-200">
                  {page.template || "Standard Page"}
                </span>
                <h1 className="text-xl md:text-2xl font-bold leading-tight">{page.name}</h1>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Join Namo Gange Trust in protecting India&apos;s sacred water heritage through grassroots mobilization and ecological research.
                </p>
              </div>
            </section>

            {/* Content Area */}
            <section className="p-6 space-y-4 flex-1">
              <div className="max-w-3xl space-y-3 text-xs leading-relaxed text-slate-700">
                <h2 className="text-sm font-bold text-slate-900">About this Initiative</h2>
                <p>
                  Namo Gange Trust is actively mobilizing local youth, riverfront communities, and environmental volunteers to clean, preserve, and restore the river ecosystems across Delhi, Haridwar, and Rishikesh.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                  <div className="p-3 rounded-sm border border-slate-200 bg-slate-50 text-center space-y-1">
                    <p className="text-lg font-bold text-blue-600">500+</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Active Volunteers</p>
                  </div>
                  <div className="p-3 rounded-sm border border-slate-200 bg-slate-50 text-center space-y-1">
                    <p className="text-lg font-bold text-emerald-600">12 KM</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Riverfront Restored</p>
                  </div>
                  <div className="p-3 rounded-sm border border-slate-200 bg-slate-50 text-center space-y-1">
                    <p className="text-lg font-bold text-purple-600">24.8K</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Community Reach</p>
                  </div>
                </div>
                <p>
                  Our goal is to build an accountable, sustainable framework that empowers every citizen to actively contribute towards cleaner rivers and healthier communities.
                </p>
              </div>
            </section>

            {/* Simulated Footer */}
            <footer className="mt-auto border-t border-slate-100 bg-slate-50 px-6 py-4 text-[10.5px] text-slate-500 flex flex-wrap justify-between items-center gap-2">
              <span>© 2025 Namo Gange Trust. All Rights Reserved.</span>
              <div className="flex gap-3">
                <span className="hover:underline cursor-pointer">Privacy Policy</span>
                <span className="hover:underline cursor-pointer">Terms of Service</span>
                <span className="hover:underline cursor-pointer">Contact Us</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
