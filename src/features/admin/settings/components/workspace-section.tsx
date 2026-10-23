"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Layers, Loader2, RotateCcw } from "lucide-react";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";
import { useAdminContext } from "@/features/admin/shell/admin-context";
import { useSettingsCapability } from "../settings-data/capability-provider";
import { LANDING_PAGES, workspaceApi, type WorkspaceSettings } from "../live/workspace-api";

const SELECT = "w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 cursor-pointer shadow-2xs";
const errorText = (e: unknown, fallback: string) => (ApiError.isApiError(e) ? e.message : fallback);

export function WorkspaceSection() {
  const { capabilities } = useSettingsCapability();
  const canEdit = capabilities.canManagePreferences;
  const { companyId, isReady } = useTenancyContext();
  const { Clients, isPlaceholderData } = useAdminContext();
  const clients = isPlaceholderData ? [] : Clients;
  const qc = useQueryClient();
  const key = ["workspace-settings", companyId] as const;
  const query = useQuery({ queryKey: key, queryFn: () => workspaceApi.get(companyId), enabled: isReady && Boolean(companyId), retry: false });
  const [draft, setDraft] = useState<Partial<WorkspaceSettings>>({});
  const saved = query.data?.settings;
  const value = <K extends keyof WorkspaceSettings>(k: K): WorkspaceSettings[K] | undefined => (k in draft ? (draft[k] as WorkspaceSettings[K]) : saved?.[k]);
  const dirty = Object.keys(draft).some((k) => draft[k as keyof WorkspaceSettings] !== saved?.[k as keyof WorkspaceSettings]);
  const save = useMutation({
    mutationFn: () => workspaceApi.save(companyId, draft),
    onSuccess: (res) => {
      qc.setQueryData(key, res);
      setDraft({});
      toast.success("Workspace defaults saved. They apply the next time someone signs in.");
    },
    onError: (e) => toast.error(errorText(e, "Could not save the workspace defaults")),
  });
  const set = (partial: Partial<WorkspaceSettings>) => setDraft((d) => ({ ...d, ...partial }));
  const primaryId = value("primaryClientId") ?? "";

  return (
    <div className="space-y-2">
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-xs shrink-0">
              <Layers className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F172A]">Workspace & Client Defaults</h3>
              <p className="text-[10.5px] text-[#64748B] font-normal">What everyone in this organization sees right after signing in.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dirty ? (
              <>
                <button type="button" onClick={() => setDraft({})} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#64748B] hover:bg-[#F1F5F9]">
                  <RotateCcw className="size-3.5" /> Undo
                </button>
                <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex items-center gap-1 rounded-md bg-[#2563EB] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
                  {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null} Save changes
                </button>
              </>
            ) : null}
            <Link href="/admin/clients" className="text-[10.5px] font-semibold text-[#2563EB] hover:underline flex items-center gap-1 shrink-0 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs hover:bg-blue-100 transition-colors">
              Clients Directory <ExternalLink className="size-2.5" />
            </Link>
          </div>
        </div>

        {query.isLoading ? (
          <p className="flex items-center gap-2 px-1 py-3 text-[11.5px] text-[#64748B]"><Loader2 className="size-4 animate-spin" /> Loading workspace defaults…</p>
        ) : query.error ? (
          <p className="px-1 py-3 text-[11.5px] text-[#B91C1C]">{errorText(query.error, "Workspace defaults could not be loaded.")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-[#334155] mb-1">Primary Client</label>
              <select value={primaryId} onChange={(e) => set({ primaryClientId: e.target.value || null, ...(e.target.value ? {} : { clientOnLogin: "last" }) })} disabled={!canEdit} className={SELECT}>
                <option value="">{clients.length === 0 ? "No clients yet" : "None (use the first client)"}</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">Opened for people who have not picked a client yet.</span>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#334155] mb-1">Client After Sign-In</label>
              <select value={value("clientOnLogin") ?? "last"} onChange={(e) => set({ clientOnLogin: e.target.value as WorkspaceSettings["clientOnLogin"] })} disabled={!canEdit} className={SELECT}>
                <option value="last">The client each person used last</option>
                <option value="primary" disabled={!primaryId}>Always the primary client</option>
              </select>
              <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">{primaryId ? "Applied every time someone signs in." : "Choose a primary client to use “Always the primary client”."}</span>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#334155] mb-1">Page After Sign-In</label>
              <select value={value("landingPage") ?? "dashboard"} onChange={(e) => set({ landingPage: e.target.value as WorkspaceSettings["landingPage"] })} disabled={!canEdit} className={SELECT}>
                {LANDING_PAGES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <span className="text-[9.5px] text-[#64748B] font-normal mt-0.5 block">A link someone opened before signing in still wins.</span>
            </div>
          </div>
        )}
        {!canEdit ? <p className="px-1 text-[10.5px] text-[#94A3B8]">Only Owners and Admins can change these.</p> : null}
      </section>
    </div>
  );
}
