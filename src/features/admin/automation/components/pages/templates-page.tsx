"use client";

import { useMemo, useState } from "react";
import { Eye, Layers, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AutomationPageActions } from "../../automation-page";
import { errorMessage, useAutomationScope, useAutomationTemplates } from "../../data/hooks";
import type { AutomationTemplate } from "../../data/types";
import { libraryItem } from "../builder/node-library";
import { EmptyPanel, channelLabel } from "../shared";

const INTEGRATION_LABEL: Record<string, string> = { aisensy: "WhatsApp (AiSensy)", meta: "Meta lead source" };
const COMPLEXITY_STYLE: Record<string, string> = { Basic: "bg-emerald-50 text-emerald-700", Intermediate: "bg-amber-50 text-amber-700", Advanced: "bg-rose-50 text-rose-700" };

export function TemplatesPage({ onUseTemplate }: AutomationPageActions) {
  const { clientId } = useAutomationScope();
  const { data: templates = [], isLoading, error, refetch } = useAutomationTemplates(clientId);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [complexity, setComplexity] = useState("all");
  const [preview, setPreview] = useState<AutomationTemplate | null>(null);
  const [using, setUsing] = useState<string | null>(null);

  const categories = Array.from(new Set(templates.map((t) => t.category)));
  const filtered = useMemo(() => templates.filter((t) =>
    (!search.trim() || `${t.name} ${t.description} ${t.trigger}`.toLowerCase().includes(search.trim().toLowerCase())) &&
    (category === "all" || t.category === category) &&
    (complexity === "all" || t.complexity === complexity)), [templates, search, category, complexity]);

  const use = async (id: string) => {
    setUsing(id);
    try { await onUseTemplate(id); } finally { setUsing(null); setPreview(null); }
  };

  return (
    <div className="space-y-3 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
        <div>
          <h3 className="text-[14px] font-bold text-[#111C3A]">Workflow templates</h3>
          <p className="text-[11px] text-[#64748B]">Each template creates a draft workflow. Finish the highlighted steps (template, recipients, owner), test it, then publish.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#94A3B8]" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." className="h-8 w-[200px] rounded-md border border-[#E2E8F0] pl-8 pr-3 text-[12px] focus:border-[#3B82F6] focus:outline-none" />
          </div>
          <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 rounded-md border border-[#E2E8F0] bg-white px-2 text-[11.5px]">
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Complexity" value={complexity} onChange={(e) => setComplexity(e.target.value)} className="h-8 rounded-md border border-[#E2E8F0] bg-white px-2 text-[11.5px]">
            <option value="all">Any complexity</option>
            {["Basic", "Intermediate", "Advanced"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-white"><EmptyPanel title="Templates could not be loaded" body={errorMessage(error)} action={<button type="button" onClick={() => void refetch()} className="text-[12px] font-semibold text-[#2563EB] hover:underline">Retry</button>} /></div>
      ) : isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-48 animate-pulse rounded-xl border border-[#E2E8F0] bg-slate-50" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-white"><EmptyPanel title="No templates match" body="Try a different search or filter." /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tpl) => {
            const TriggerIcon = libraryItem(tpl.nodes?.[0]?.actionId)?.icon ?? Zap;
            return (
              <div key={tpl.id} className="flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="grid size-9 place-items-center rounded-lg bg-[#EFF6FF] text-[#2563EB]"><TriggerIcon className="size-4" /></div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${COMPLEXITY_STYLE[tpl.complexity] ?? ""}`}>{tpl.complexity}</span>
                </div>
                <h4 className="text-[13px] font-bold text-[#111C3A]">{tpl.name}</h4>
                <p className="mt-1 line-clamp-3 text-[11.5px] leading-snug text-[#64748B]">{tpl.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-semibold text-[#475569]">{tpl.category}</span>
                  <span className="flex items-center gap-1 rounded bg-[#F1F5F9] px-1.5 py-0.5 font-semibold text-[#475569]"><Layers className="size-3" /> {tpl.stepCount} steps</span>
                  {(tpl.channels ?? []).filter((c) => c !== "system").map((c) => <span key={c} className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-semibold text-[#475569]">{channelLabel(c)}</span>)}
                  {tpl.useCount ? <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700">Used {tpl.useCount}×</span> : null}
                </div>
                {tpl.requiredIntegrations.length ? <p className="mt-2 text-[10.5px] text-[#B45309]">Needs: {tpl.requiredIntegrations.map((r) => INTEGRATION_LABEL[r] ?? r).join(", ")}</p> : null}
                <div className="mt-auto flex gap-2 pt-3">
                  <button type="button" onClick={() => setPreview(tpl)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#E2E8F0] py-1.5 text-[11.5px] font-semibold text-[#334155] hover:bg-slate-50"><Eye className="size-3.5" /> Preview</button>
                  <button type="button" disabled={using !== null} onClick={() => void use(tpl.id)} className="flex-1 rounded-lg bg-[#2563EB] py-1.5 text-[11.5px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">{using === tpl.id ? "Creating..." : "Use template"}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>{preview?.description}</DialogDescription>
          </DialogHeader>
          <ol className="space-y-2">
            {preview?.nodes?.map((node, i) => {
              const item = libraryItem(node.actionId);
              const Icon = item?.icon ?? Zap;
              return (
                <li key={node.id} className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] p-2.5">
                  <span className="mt-0.5 text-[11px] font-bold text-[#94A3B8]">{i + 1}</span>
                  <div className={`grid size-7 shrink-0 place-items-center rounded-md ${item?.iconBg ?? "bg-[#64748B]"} text-white`}><Icon className="size-3.5" /></div>
                  <div><p className="text-[12px] font-semibold text-[#111C3A]">{node.label}</p><p className="text-[11px] text-[#64748B]">{node.description}</p></div>
                </li>
              );
            })}
          </ol>
          {preview?.features?.length ? <p className="text-[11px] text-[#64748B]">Includes: {preview.features.join(" · ")}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
            <Button disabled={!preview || using !== null} onClick={() => preview && void use(preview.id)}>{using ? "Creating..." : "Use template"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
