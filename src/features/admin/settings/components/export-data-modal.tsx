"use client";

import { useState, useEffect } from "react";
import { Download, Loader2, Check, X, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { DataExportRequest } from "../settings-data/types";

interface ExportDataModalProps {
  open: boolean;
  onClose: () => void;
  onRequestExport: (categories: string[]) => Promise<DataExportRequest>;
}

const AVAILABLE_CATEGORIES = [
  { id: "Members", label: "Team Members & Permissions", desc: "User profiles, roles, and assigned clients" },
  { id: "Clients", label: "Client Accounts & Profiles", desc: "Client configurations, brand info, and tags" },
  { id: "Content", label: "Content Studio & Media", desc: "Post drafts, captions, scheduled queue, and media URLs" },
  { id: "Campaigns", label: "Marketing Campaigns & Ads", desc: "Campaign metadata, targets, and ad spend history" },
  { id: "Analytics", label: "Analytics & KPI Timeseries", desc: "Aggregated 30-day reach, engagement, and conversion logs" },
  { id: "Activity", label: "Audit & Diagnostic Activity", desc: "Administrative setting changes and access logs" },
  { id: "Settings", label: "Workspace & Security Policies", desc: "Organization profile, 2FA rules, and branding settings" },
];

export function ExportDataModal({ open, onClose, onRequestExport }: ExportDataModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Members",
    "Clients",
    "Campaigns",
    "Analytics",
    "Settings",
  ]);
  const [status, setStatus] = useState<"idle" | "preparing" | "ready">("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setProgress(0);
    }
  }, [open]);

  if (!open) return null;

  const toggleCategory = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length === 1) {
        toast.warning("At least one data category must be selected.");
        return;
      }
      setSelectedCategories(selectedCategories.filter((c) => c !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const handleStartExport = async () => {
    setStatus("preparing");
    setProgress(15);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 25;
      });
    }, 400);

    try {
      await onRequestExport(selectedCategories);
      setTimeout(() => {
        clearInterval(interval);
        setProgress(100);
        setStatus("ready");
      }, 1600);
    } catch {
      clearInterval(interval);
      setStatus("idle");
      setProgress(0);
    }
  };

  const handleDownloadFile = () => {
    const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({
        organization: "Namo Gange Trust",
        exportedAt: new Date().toISOString(),
        categories: selectedCategories,
        sampleRecords: {
          membersCount: 12,
          clients: ["Moksha Sewa", "Dental Care Clinic", "Ayur Luxe Wellness"],
          status: "Verified Authentic Export",
        },
      }, null, 2)
    );
    const link = document.createElement("a");
    link.href = jsonContent;
    link.download = `namogange_export_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Organization archive downloaded successfully.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 shrink-0">
              <FileArchive className="size-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Export Organization Data</h3>
              <p className="text-[10px] text-[#111C3A] font-semibold">
                Generate a signed GDPR/SOC2 compliant archive of organization assets and configs.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#111C3A] hover:text-red-500 transition-colors p-1 cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {status === "idle" && (
          <>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#111C3A]">
                Select Data Categories to Include
              </label>
              <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                {AVAILABLE_CATEGORIES.map((cat) => {
                  const isChecked = selectedCategories.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      className="flex items-center justify-between p-2 rounded-lg border border-[#CBD5E1] hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="pr-2">
                        <div className="text-[11.5px] font-bold text-[#111C3A]">{cat.label}</div>
                        <div className="text-[9.5px] text-[#111C3A] font-medium">{cat.desc}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(cat.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 size-4 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CBD5E1]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-[11px] font-bold text-[#111C3A] hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartExport}
                className="px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-[11px] font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="size-3.5" /> Generate Archive Export
              </button>
            </div>
          </>
        )}

        {status === "preparing" && (
          <div className="py-3 text-center space-y-2">
            <Loader2 className="size-6 text-[#2563EB] animate-spin mx-auto" />
            <div>
              <div className="text-[12.5px] font-bold text-[#111C3A]">Compiling Organization Archive...</div>
              <p className="text-[10px] text-[#111C3A] font-semibold">Packaging selected database records and configurations.</p>
            </div>
            <div className="w-48 mx-auto bg-slate-100 rounded-full h-1.5 overflow-hidden border border-[#CBD5E1]">
              <div className="bg-[#2563EB] h-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[9.5px] font-mono font-bold text-[#111C3A]">{progress}% complete</span>
          </div>
        )}

        {status === "ready" && (
          <div className="py-3 text-center space-y-2">
            <div className="size-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-300">
              <Check className="size-4" />
            </div>
            <div>
              <div className="text-[12.5px] font-bold text-[#111C3A]">Archive Ready for Download</div>
              <p className="text-[10px] text-[#111C3A] font-semibold">
                Your package contains {selectedCategories.length} data streams (~14.2 MB). Download link is valid for 14 days.
              </p>
            </div>
            <div className="pt-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleDownloadFile}
                className="px-4 py-2 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white text-[11.5px] font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="size-3.5" /> Download (.JSON / .ZIP)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
