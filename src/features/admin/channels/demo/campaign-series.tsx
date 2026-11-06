"use client";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, Select } from "./ui";
import type { Campaign, FollowUpStep, Template } from "./mock-service";
import { parameterLabel, templateKeys } from "./creation-model";

const CONDITIONS: { label: string; value: FollowUpStep["condition"] }[] = [
  { label: "Delivered But Not Read", value: "NOT_READ" },
  { label: "Did Not Reply", value: "NO_REPLY" },
  { label: "Did Not Click A Button Or Link", value: "NO_CLICK" },
  { label: "Everyone Who Received It", value: "ALWAYS" },
];
const FREQUENCIES = [{ label: "Every Day", value: "DAILY" }, { label: "Every Week", value: "WEEKLY" }, { label: "Every Month", value: "MONTHLY" }] as const;
const MAPPINGS = ["Custom Value", "$FirstName", "$Name", "$Phone"];

/**
 * Follow-up messages and repeating runs for a broadcast. Everything here is only a plan until the campaign is activated; each
 * follow-up or run re-checks consent for every recipient, and Stop Follow-Ups And Repeats (on the report page) cancels what is pending.
 */
export function CampaignSeriesFields({ draft, patch, templates, contactFields }: { draft: Campaign; patch: (values: Partial<Campaign>) => void; templates: Template[]; contactFields: { key: string }[] }) {
  const steps = draft.followUps ?? [];
  const mappings = [...MAPPINGS, ...contactFields.map((field) => `$Field:${field.key}`)];
  const setStep = (index: number, values: Partial<FollowUpStep>) => patch({ followUps: steps.map((step, position) => (position === index ? { ...step, ...values } : step)) });
  const repeat = draft.recurrence ?? null;
  return (
    <>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const template = templates.find((item) => item.id === step.templateId);
          const keys = template ? templateKeys(template) : [];
          return (
            <div key={index} className="space-y-3 rounded-lg border border-slate-200 p-3">
              <div className="flex items-end justify-between gap-2"><p className="text-xs font-semibold">Follow-Up {index + 1}</p><Button type="button" aria-label="Remove Follow-Up" size="icon-sm" variant="ghost" onClick={() => patch({ followUps: steps.filter((_, position) => position !== index) })}><Trash2 /></Button></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Wait After The Campaign Finishes (Hours, 1–720)"><Input type="number" min={1} max={720} value={step.afterHours} onChange={(event) => setStep(index, { afterHours: Number(event.target.value) })} /></Field>
                <Select label="Send To" value={CONDITIONS.find((item) => item.value === step.condition)?.label ?? CONDITIONS[0]!.label} options={CONDITIONS.map((item) => item.label)} onChange={(label) => setStep(index, { condition: CONDITIONS.find((item) => item.label === label)?.value ?? "NO_REPLY" })} />
              </div>
              <Select label="Follow-Up Template" value={template?.name ?? "Choose A Template"} options={["Choose A Template", ...templates.map((item) => item.name)]} onChange={(name) => { const next = templates.find((item) => item.name === name); setStep(index, { templateId: next?.id ?? "", parameters: {}, parameterFallbacks: {} }); }} />
              {keys.map((key) => {
                const value = step.parameters[key] ?? "";
                const mapped = value.startsWith("$");
                return (
                  <div key={key} className="space-y-2 rounded border border-slate-100 bg-slate-50 p-2">
                    <Select label={`Value For ${parameterLabel(key)}`} value={mapped ? value : "Custom Value"} options={mappings} onChange={(mapping) => setStep(index, { parameters: { ...step.parameters, [key]: mapping === "Custom Value" ? "" : mapping } })} />
                    {mapped ? <Field label="Fallback Value"><Input value={step.parameterFallbacks[key] ?? ""} placeholder="e.g. there" onChange={(event) => setStep(index, { parameterFallbacks: { ...step.parameterFallbacks, [key]: event.target.value } })} /></Field>
                      : <Field label="Custom Value"><Input value={value} onChange={(event) => setStep(index, { parameters: { ...step.parameters, [key]: event.target.value } })} /></Field>}
                  </div>
                );
              })}
            </div>
          );
        })}
        {steps.length < 3 && <Button type="button" size="sm" variant="outline" disabled={draft.kind === "API"} onClick={() => patch({ followUps: [...steps, { afterHours: 24, condition: "NO_REPLY", templateId: "", parameters: {}, parameterFallbacks: {} }] })}><Plus />Add Follow-Up</Button>}
        <p className="text-[11px] text-slate-400">A Follow-Up Goes Only To People Who Received This Campaign And Match The Condition. Anyone Who Has Since Opted Out Is Left Out.</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2"><Switch aria-label="Repeat Campaign" checked={!!repeat} disabled={draft.kind === "API"} onCheckedChange={(checked) => patch({ recurrence: checked ? { frequency: "WEEKLY", runs: 4 } : null })} /><span className="text-xs">Repeat This Campaign</span></div>
        {repeat && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Select label="How Often" value={FREQUENCIES.find((item) => item.value === repeat.frequency)?.label ?? "Every Week"} options={FREQUENCIES.map((item) => item.label)} onChange={(label) => patch({ recurrence: { ...repeat, frequency: FREQUENCIES.find((item) => item.label === label)?.value ?? "WEEKLY" } })} />
            <Field label="Total Runs (2–52, Including The First)"><Input type="number" min={2} max={52} value={repeat.runs} onChange={(event) => patch({ recurrence: { ...repeat, runs: Number(event.target.value) } })} /></Field>
          </div>
        )}
        {repeat && <p className="text-[11px] text-slate-400">Each Run Is Sent At The Same Time Of Day To The Same Audience; Consent Is Checked Again Every Time. Opt-Outs Stop Receiving It Immediately.</p>}
      </div>
    </>
  );
}
