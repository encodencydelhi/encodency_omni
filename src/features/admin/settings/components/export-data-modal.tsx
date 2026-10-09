"use client";

import { useState } from "react";
import { Download, Loader2, Check, X, FileArchive, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { buildOrganizationExport, downloadJson, EXPORT_CATEGORIES, type ExportCategoryId, type OrganizationExport } from "../settings-data/export";

interface ExportDataModalProps {
  open: boolean;
  onClose: () => void;
  /** Used for the file name only. */
  organizationName: string;
}

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "organization";

/**
 * A real export: the chosen categories are read live from the same APIs the app uses and saved as a JSON file in the browser.
 * Nothing is stored on a server, and a category the person's role cannot read is reported as such instead of being invented.
 */
export function ExportDataModal({ open, onClose, organizationName }: ExportDataModalProps) {
  const { companyId } = useTenancyContext();
  const [selected, setSelected] = useState<ExportCategoryId[]>(["organization", "members", "clients", "plan"]);
  const [status, setStatus] = useState<"idle" | "preparing" | "done">("idle");
  const [result, setResult] = useState<OrganizationExport | null>(null);

  if (!open) return null;

  const close = () => {
    setStatus("idle");
    setResult(null);
    onClose();
  };

  const toggle = (id: ExportCategoryId) => {
    if (selected.includes(id)) {
      if (selected.length === 1) {
        toast.warning("At least one data category must be selected.");
        return;
      }
      setSelected(selected.filter((item) => item !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const start = async () => {
    if (!companyId) {
      toast.error("Select a Company first.");
      return;
    }
    setStatus("preparing");
    try {
      const document = await buildOrganizationExport(companyId, selected);
      downloadJson(document, `${slug(organizationName)}-export`);
      setResult(document);
      setStatus("done");
    } catch (error) {
      setStatus("idle");
      toast.error(error instanceof Error ? error.message : "The export could not be created.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div role="dialog" aria-modal="true" aria-label="Export Organization Data" className="w-full max-w-lg bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 shrink-0">
              <FileArchive className="size-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F172A]">Export Organization Data</h3>
              <p className="text-[10.5px] text-[#64748B] font-normal leading-relaxed">Download your real data as a JSON file. It is created in your browser and not stored anywhere.</p>
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="text-[#64748B] hover:text-red-500 transition-colors p-1 cursor-pointer">
            <X className="size-3.5" />
          </button>
        </div>

        {status === "idle" && (
          <>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#334155]">Select Data To Include</label>
              <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                {EXPORT_CATEGORIES.map((category) => (
                  <label key={category.id} className="flex items-center justify-between p-2.5 rounded-xl border border-[#DDE4ED] hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs">
                    <div className="pr-2">
                      <div className="text-[11.5px] font-semibold text-[#0F172A]">{category.label}</div>
                      <div className="text-[9.5px] text-[#64748B] font-normal">{category.desc}</div>
                    </div>
                    <input type="checkbox" checked={selected.includes(category.id)} onChange={() => toggle(category.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 size-4 cursor-pointer" />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
              <button type="button" onClick={close} className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-[10.5px] font-semibold text-[#334155] hover:bg-slate-100 cursor-pointer shadow-2xs transition-colors">
                Cancel
              </button>
              <button type="button" onClick={() => void start()} className="px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-[11px] font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors">
                <Download className="size-3.5" /> Download Export
              </button>
            </div>
          </>
        )}

        {status === "preparing" && (
          <div className="py-4 text-center space-y-2" role="status">
            <Loader2 className="size-6 text-[#2563EB] animate-spin mx-auto" />
            <div className="text-[12.5px] font-bold text-[#0F172A]">Reading Your Data…</div>
            <p className="text-[10px] text-[#64748B] font-normal">Collecting the selected categories from the live system.</p>
          </div>
        )}

        {status === "done" && result && (
          <div className="py-2 space-y-2">
            <div className="text-center space-y-1">
              <div className="size-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-300">
                <Check className="size-4" />
              </div>
              <div className="text-[12.5px] font-bold text-[#0F172A]">Export Downloaded</div>
            </div>
            <ul className="divide-y divide-[#F1F5F9] border border-[#DDE4ED] rounded-xl text-[11px]">
              {Object.entries(result.summary).map(([id, text]) => {
                const label = EXPORT_CATEGORIES.find((category) => category.id === id)?.label ?? id;
                const failed = !(id in result.data);
                return (
                  <li key={id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="font-semibold text-[#0F172A]">{label}</span>
                    <span className={failed ? "inline-flex items-center gap-1 text-amber-700 font-medium" : "text-emerald-700 font-medium"}>
                      {failed && <AlertCircle className="size-3" />}
                      {text}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-end pt-1">
              <button type="button" onClick={close} className="px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-[11px] font-semibold cursor-pointer transition-colors">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
