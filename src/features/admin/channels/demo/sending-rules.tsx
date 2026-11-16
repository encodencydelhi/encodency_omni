"use client";
import { Input } from "@/components/ui/input";
import { Field } from "./ui";
import type { SendRules, Settings } from "./mock-service";

export const DEFAULT_SEND_RULES: SendRules = { marketingPerDay: 0, marketingPerWeek: 0, campaignPerMinute: 0, quietHours: null };
const whole = (value: string, max: number) => Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));

export function SendingRulesFields({ draft, setDraft, disabled }: { draft: Settings; setDraft: (next: Settings) => void; disabled: boolean }) {
  const rules = draft.sendRules ?? DEFAULT_SEND_RULES;
  const set = (patch: Partial<SendRules>) => setDraft({ ...draft, sendRules: { ...rules, ...patch } });
  const quiet = rules.quietHours;
  return (
    <fieldset disabled={disabled} className="space-y-3 rounded-lg border p-3 text-xs md:col-span-2">
      <legend className="px-1 font-semibold">Sending Rules</legend>
      <p className="text-slate-500">These Limits Apply To Marketing Templates Only. Service Replies And Utility Messages Are Never Delayed. Zero Turns A Limit Off.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Marketing Messages Per Contact Per Day"><Input type="number" min={0} max={100} value={rules.marketingPerDay} onChange={(event) => set({ marketingPerDay: whole(event.target.value, 100) })} /></Field>
        <Field label="Marketing Messages Per Contact Per Week"><Input type="number" min={0} max={500} value={rules.marketingPerWeek} onChange={(event) => set({ marketingPerWeek: whole(event.target.value, 500) })} /></Field>
        <Field label="Campaign Messages Per Minute"><Input type="number" min={0} max={600} value={rules.campaignPerMinute} onChange={(event) => set({ campaignPerMinute: whole(event.target.value, 600) })} /></Field>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!quiet} onChange={(event) => set({ quietHours: event.target.checked ? { start: "21:00", end: "09:00", timezone: "Asia/Kolkata" } : null })} />
        Hold Marketing Messages During Quiet Hours
      </label>
      {quiet && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Quiet Hours Start"><Input type="time" value={quiet.start} onChange={(event) => set({ quietHours: { ...quiet, start: event.target.value } })} /></Field>
          <Field label="Quiet Hours End"><Input type="time" value={quiet.end} onChange={(event) => set({ quietHours: { ...quiet, end: event.target.value } })} /></Field>
          <Field label="Timezone (IANA)"><Input value={quiet.timezone} maxLength={64} onChange={(event) => set({ quietHours: { ...quiet, timezone: event.target.value } })} /></Field>
        </div>
      )}
    </fieldset>
  );
}
