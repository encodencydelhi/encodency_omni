"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Globe, Loader2, RotateCcw } from "lucide-react";
import { ApiError } from "@/types/api";
import { applyPreferences, preferencesApi } from "@/lib/api/display-preferences";
import type { DisplayPreferences } from "@/lib/utils/format";

const SELECT = "w-full h-8 px-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[12px] text-[#0F172A] font-normal outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shadow-2xs";
const QUERY_KEY = ["my-preferences"] as const;
const COMMON_ZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Australia/Sydney", "UTC"];
const errorText = (e: unknown, fallback: string) => (ApiError.isApiError(e) ? e.message : fallback);

function allTimeZones(): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  try {
    return supported ? supported("timeZone") : COMMON_ZONES;
  } catch {
    return COMMON_ZONES;
  }
}

/** The same rules the app's formatters use, for the preview before saving. */
function preview(p: DisplayPreferences, at: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: p.timezone, day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(at).map((x) => [x.type, x.value]));
  const date =
    p.dateFormat === "D MMM YYYY"
      ? at.toLocaleDateString("en-GB", { timeZone: p.timezone, day: "numeric", month: "short", year: "numeric" })
      : p.dateFormat === "MM/DD/YYYY"
        ? `${parts.month}/${parts.day}/${parts.year}`
        : p.dateFormat === "YYYY-MM-DD"
          ? `${parts.year}-${parts.month}-${parts.day}`
          : `${parts.day}/${parts.month}/${parts.year}`;
  const time = at.toLocaleTimeString("en-US", { timeZone: p.timezone, hour: "2-digit", minute: "2-digit", hour12: p.timeFormat === "12-hour" });
  const number = new Intl.NumberFormat(p.numberFormat === "indian" ? "en-IN" : "en-US").format(1234567.5);
  const money = new Intl.NumberFormat(p.numberFormat === "indian" ? "en-IN" : "en-US", { style: "currency", currency: "INR" }).format(1234567.5);
  return { date, time, number, money };
}

export function PreferencesSection() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: () => preferencesApi.get(), retry: false });
  const [draft, setDraft] = useState<Partial<DisplayPreferences>>({});
  const zones = useMemo(() => allTimeZones(), []);
  const [now] = useState(() => new Date());
  const saved = query.data?.preferences;
  const current = saved ? { ...saved, ...draft } : null;
  const dirty = Boolean(saved) && (Object.keys(draft) as (keyof DisplayPreferences)[]).some((k) => draft[k] !== saved![k]);
  const save = useMutation({
    mutationFn: () => preferencesApi.save(current!),
    onSuccess: (res) => {
      qc.setQueryData(QUERY_KEY, res);
      setDraft({});
      applyPreferences(res);
      toast.success("Preferences saved. Dates and numbers now use your format.");
    },
    onError: (e) => toast.error(errorText(e, "Could not save your preferences")),
  });
  const set = (partial: Partial<DisplayPreferences>) => setDraft((d) => ({ ...d, ...partial }));
  const sample = current ? preview(current, now) : null;

  return (
    <div className="space-y-2">
      <section className="bg-white rounded-xl border border-[#DDE4ED] shadow-xs p-3 space-y-2 hover:border-[#CBD5E1] transition-all">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-br from-[#0EA5E9] to-[#2563EB] text-white flex items-center justify-center shadow-xs shrink-0">
              <Globe className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#0F172A]">My Date, Time & Number Format</h3>
              <p className="text-[10.5px] text-[#64748B] font-normal">Only for you, on every device you sign in on. Applies to dates, times and numbers across the app.</p>
            </div>
          </div>
          {dirty || (saved && !query.data?.stored) ? (
            <div className="flex items-center gap-2">
              {dirty ? <button type="button" onClick={() => setDraft({})} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#64748B] hover:bg-[#F1F5F9]">
                <RotateCcw className="size-3.5" /> Undo
              </button> : null}
              <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex items-center gap-1 rounded-md bg-[#2563EB] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
                {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null} Save changes
              </button>
            </div>
          ) : null}
        </div>

        {query.isLoading || !current ? (
          query.error ? (
            <p className="px-1 py-3 text-[11.5px] text-[#B91C1C]">{errorText(query.error, "Your preferences could not be loaded.")}</p>
          ) : (
            <p className="flex items-center gap-2 px-1 py-3 text-[11.5px] text-[#64748B]"><Loader2 className="size-4 animate-spin" /> Loading your preferences…</p>
          )
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#334155] mb-1">Time Zone</label>
                <select value={current.timezone} onChange={(e) => set({ timezone: e.target.value })} className={SELECT}>
                  {[...new Set([current.timezone, ...zones])].map((z) => <option key={z} value={z}>{z.replaceAll("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#334155] mb-1">Date Format</label>
                <select value={current.dateFormat} onChange={(e) => set({ dateFormat: e.target.value as DisplayPreferences["dateFormat"] })} className={SELECT}>
                  <option value="D MMM YYYY">23 Oct 2026</option>
                  <option value="DD/MM/YYYY">23/10/2026</option>
                  <option value="MM/DD/YYYY">10/23/2026</option>
                  <option value="YYYY-MM-DD">2026-10-23</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#334155] mb-1">Time Format</label>
                <select value={current.timeFormat} onChange={(e) => set({ timeFormat: e.target.value as DisplayPreferences["timeFormat"] })} className={SELECT}>
                  <option value="12-hour">12-hour (2:30 PM)</option>
                  <option value="24-hour">24-hour (14:30)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#334155] mb-1">Number Format</label>
                <select value={current.numberFormat} onChange={(e) => set({ numberFormat: e.target.value as DisplayPreferences["numberFormat"] })} className={SELECT}>
                  <option value="indian">Indian (12,34,567)</option>
                  <option value="international">International (1,234,567)</option>
                </select>
              </div>
            </div>
            {sample ? (
              <div className="grid gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFD] p-2.5 text-[11px] sm:grid-cols-4">
                <p><span className="block text-[9.5px] font-bold uppercase tracking-wide text-[#94A3B8]">Date</span><span className="font-semibold text-[#0F172A]">{sample.date}</span></p>
                <p><span className="block text-[9.5px] font-bold uppercase tracking-wide text-[#94A3B8]">Time now</span><span className="font-semibold text-[#0F172A]">{sample.time}</span></p>
                <p><span className="block text-[9.5px] font-bold uppercase tracking-wide text-[#94A3B8]">Number</span><span className="font-semibold text-[#0F172A]">{sample.number}</span></p>
                <p><span className="block text-[9.5px] font-bold uppercase tracking-wide text-[#94A3B8]">Amount</span><span className="font-semibold text-[#0F172A]">{sample.money}</span></p>
              </div>
            ) : null}
            {!query.data?.stored ? <p className="px-1 text-[10.5px] text-[#94A3B8]">You have not saved preferences yet, so the app shows its standard formats. Save once to switch to yours.</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
