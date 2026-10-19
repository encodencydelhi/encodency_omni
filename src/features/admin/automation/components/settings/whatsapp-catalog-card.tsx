"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ClipboardCopy } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { whatsappApi } from "@/features/admin/channels/live/whatsapp-api";
import { automationApi, type WhatsAppCatalogItem } from "../../data/automation-api";
import { errorMessage } from "../../data/hooks";

const STATE_STYLE: Record<WhatsAppCatalogItem["state"], { label: string; cls: string }> = {
  missing: { label: "Not created", cls: "bg-slate-100 text-slate-600" },
  pending: { label: "Pending approval", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700" },
  registered: { label: "Added here", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rejected / paused", cls: "bg-red-50 text-red-700" },
  other: { label: "Synced", cls: "bg-blue-50 text-blue-700" },
};

/**
 * Every WhatsApp template the automation templates rely on, with its state for the selected client and the exact text to paste into
 * AiSensy. AiSensy sends by API campaign NAME and this platform sends the template name as the campaign name, so each template needs
 * an API campaign with the same name.
 */
export function WhatsAppCatalogCard({ clientId }: { clientId: string | null | undefined }) {
  const [items, setItems] = useState<WhatsAppCatalogItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) { setItems(null); return; }
    try {
      setItems((await automationApi.whatsappCatalog(clientId)).items);
      setError(null);
    } catch (e) {
      setItems([]);
      setError(errorMessage(e));
    }
  }, [clientId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const copy = async (item: WhatsAppCatalogItem) => {
    try { await navigator.clipboard.writeText(item.copyText); toast.success(`Copied “${item.name}” — paste it into AiSensy`); } catch { toast.error("Could not copy to the clipboard."); }
  };

  const [registering, setRegistering] = useState(false);
  const ready = items?.filter((i) => i.state === "approved" || i.state === "registered").length ?? 0;
  const missing = items?.filter((i) => i.state === "missing") ?? [];

  /** Adds templates you already created in AiSensy to the platform by hand (many AiSensy accounts cannot be synced). */
  const register = async (targets: WhatsAppCatalogItem[]) => {
    if (!clientId) return;
    setRegistering(true);
    try {
      const companyId = getStoredCompanyId();
      for (const item of targets) {
        const count = new Set([...item.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1])).size;
        await whatsappApi.upsertTemplate(companyId, clientId, { name: item.name, language: "en", category: item.category, variables: Array.from({ length: count }, (_, i) => `{{${i + 1}}}`), body: item.body, footer: item.footer });
      }
      toast.success(`Added ${targets.length} template${targets.length === 1 ? "" : "s"} here. Make sure each one also exists in AiSensy with a Live API campaign of the same name.`);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2">
        <div className="flex items-center gap-2"><FaWhatsapp className="size-4 text-[#16A34A]" /><h4 className="text-[12.5px] font-bold text-[#111C3A]">WhatsApp templates checklist</h4></div>
        {items ? <span className="text-[11px] text-[#64748B]">{ready} of {items.length} ready</span> : null}
      </div>
      <ol className="list-decimal space-y-1 pl-4 text-[11px] text-[#64748B]">
        <li>Use the API host <code>https://backend.aisensy.com</code> in WhatsApp settings (not aisensy.com).</li>
        <li>In AiSensy: <strong>Templates → Create template</strong>, paste the text below (use <em>Copy</em>), submit it and wait for Meta approval.</li>
        <li>In AiSensy: <strong>Campaigns → API Campaign → Create</strong>, pick that template and name the campaign <strong>exactly like the template</strong>. Set it Live.</li>
        <li>Here: press <strong>Add here</strong> on the row (or <strong>WhatsApp → Templates → Sync</strong> if your AiSensy account allows it). Automation templates then pick it automatically.</li>
        <li>In AiSensy: set the webhook to <code>/api/v1/integrations/whatsapp/webhook</code> on your API domain so delivery reports reach the platform.</li>
      </ol>
      {missing.length > 1 ? <button type="button" disabled={registering} onClick={() => void register(missing)} className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50">{registering ? "Adding…" : `Add all ${missing.length} missing here`}</button> : null}
      {!clientId ? <p className="text-[11px] text-[#64748B]">Select a client to see which templates exist for it.</p> : error ? <p className="text-[11px] text-red-600">{error}</p> : items === null ? <p className="text-[11px] text-[#64748B]">Loading…</p> : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const style = STATE_STYLE[item.state];
            const expanded = open === item.name;
            return (
              <li key={item.name} className="rounded-lg border border-[#E2E8F0]">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button type="button" aria-label={expanded ? `Hide ${item.name}` : `Show ${item.name}`} onClick={() => setOpen(expanded ? null : item.name)} className="text-[#94A3B8]">{expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}</button>
                  <div className="min-w-0 flex-1"><code className="text-[11.5px] font-semibold text-[#111C3A]">{item.name}</code><span className="ml-2 text-[10.5px] text-[#94A3B8]">{item.category === "UTILITY" ? "Utility" : "Marketing"} · {item.purpose}</span></div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${style.cls}`}>{style.label}</span>
                  {item.state === "missing" ? <button type="button" disabled={registering} onClick={() => void register([item])} className="shrink-0 rounded-md border border-[#E2E8F0] px-2 py-1 text-[10.5px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50">Add here</button> : null}
                  <button type="button" aria-label={`Copy ${item.name}`} onClick={() => void copy(item)} className="grid size-7 shrink-0 place-items-center rounded-md border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"><ClipboardCopy className="size-3.5" /></button>
                </div>
                {expanded ? (
                  <div className="space-y-1 border-t border-[#F1F5F9] bg-[#FAFBFD] px-3 py-2 text-[11px] text-[#334155]">
                    {item.header ? <p><strong>Header:</strong> {item.header}</p> : null}
                    <p className="whitespace-pre-wrap"><strong>Body:</strong> {item.body}</p>
                    {item.footer ? <p><strong>Footer:</strong> {item.footer}</p> : null}
                    {item.buttons?.length ? <p><strong>Buttons:</strong> {item.buttons.map((b) => (b.type === "URL" ? `${b.text} (website: ${b.url})` : `${b.text} (quick reply)`)).join(" · ")}</p> : null}
                    <p><strong>Sample values:</strong> {item.samples.map((v, i) => `{{${i + 1}}} = ${v}`).join(", ")}</p>
                    <p><strong>Filled by the automation with:</strong> {item.fills.map((v, i) => `{{${i + 1}}} ← ${v}`).join(", ")}</p>
                    <p><strong>AiSensy API campaign name:</strong> <code>{item.campaignName}</code>{item.usedBy.length ? <> · used by {item.usedBy.length} automation template{item.usedBy.length === 1 ? "" : "s"}</> : null}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
