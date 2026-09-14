"use client";

import {
  ArrowRight,
  Beaker,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import type { CampaignDraft, AutomationRule, ABTest } from "../draft";
import { Field, TextInput } from "../ui";
import { cn } from "@/lib/utils/cn";

type Setter = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;

const CONDITIONS = [
  "Conversions reached",
  "Cost per lead > threshold",
  "Budget spent > percentage",
  "Click-through rate < threshold",
  "Impressions reached",
  "Engagement rate < threshold",
  "New lead generated",
  "Campaign paused",
];

const ACTIONS = [
  "Increase budget",
  "Decrease budget",
  "Pause campaign",
  "Resume campaign",
  "Create CRM contact",
  "Assign sales owner",
  "Send WhatsApp message",
  "Send email",
  "Create follow-up task",
  "Send notification",
];

const AB_VARIABLES = ["Creative", "Headline", "CTA", "Audience", "Landing Page", "Offer", "Caption", "Thumbnail"];

let ruleIdCounter = 10;
let testIdCounter = 10;

export function StepAutomation({ draft, set }: { draft: CampaignDraft; set: Setter }) {
  const addRule = () => {
    const newRule: AutomationRule = {
      id: `rule-${++ruleIdCounter}`,
      name: `Rule ${draft.automationRules.length + 1}`,
      enabled: true,
      condition: CONDITIONS[0]!,
      conditionValue: "",
      action: ACTIONS[0]!,
      actionValue: "",
    };
    set("automationRules", [...draft.automationRules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<AutomationRule>) => {
    set("automationRules", draft.automationRules.map((r) => (r.id === id ? { ...r, ...updates } as AutomationRule : r)));
  };

  const removeRule = (id: string) => {
    set("automationRules", draft.automationRules.filter((r) => r.id !== id));
  };

  const addTest = () => {
    const newTest: ABTest = {
      id: `test-${++testIdCounter}`,
      name: `Test ${draft.abTests.length + 1}`,
      enabled: true,
      variable: AB_VARIABLES[0]!,
      variantA: "Variant A",
      variantB: "Variant B",
      trafficSplit: 50,
    };
    set("abTests", [...draft.abTests, newTest]);
  };

  const updateTest = (id: string, updates: Partial<ABTest>) => {
    set("abTests", draft.abTests.map((t) => (t.id === id ? { ...t, ...updates } as ABTest : t)));
  };

  const removeTest = (id: string) => {
    set("abTests", draft.abTests.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-2.5">
      <Panel letter="A" icon={Zap} title="Automation Rules" caption="Set up automatic rules to optimize your campaign in real-time.">
        <div className="space-y-3">
          {draft.automationRules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-[#E6E8F0] bg-white p-3">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                  <Zap className="size-3.5" />
                </span>
                <input
                  value={rule.name}
                  onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                  className="min-w-0 flex-1 text-[12px] font-bold text-[#111827] outline-none"
                />
                <button
                  type="button"
                  onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                  className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", rule.enabled ? "bg-[#0AA673]" : "bg-[#CBD5E1]")}
                >
                  <span className={cn("absolute top-0.5 block size-4 rounded-full bg-white shadow-sm transition-all", rule.enabled ? "left-[18px]" : "left-0.5")} />
                </button>
                <button onClick={() => removeRule(rule.id)} className="text-[#9CA3AF] hover:text-[#E11D28]">
                  <span className="text-[11px]">&times;</span>
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                <div className="rounded-lg border border-[#E7EDF5] bg-[#F8FAFC] p-2.5">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-[#8791A4]">WHEN</span>
                  <div className="space-y-2">
                    <select
                      value={rule.condition}
                      onChange={(e) => updateRule(rule.id, { condition: e.target.value })}
                      className="flex h-8 w-full items-center appearance-none rounded-lg border border-[#DDE6F1] bg-white px-2.5 py-1.5 text-[10.5px] font-semibold text-[#374151] outline-none"
                    >
                      {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    {rule.condition.includes("threshold") || rule.condition.includes("percentage") || rule.condition.includes("reached") ? (
                      <TextInput value={rule.conditionValue} onChange={(v) => updateRule(rule.id, { conditionValue: v })} placeholder="e.g. 50, ₹150, 80%" />
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <span className="grid size-8 place-items-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
                    <ArrowRight className="size-4" />
                  </span>
                </div>

                <div className="rounded-lg border border-[#E7EDF5] bg-[#F8FAFC] p-2.5">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-[#8791A4]">THEN</span>
                  <div className="space-y-2">
                    <select
                      value={rule.action}
                      onChange={(e) => updateRule(rule.id, { action: e.target.value })}
                      className="flex h-8 w-full items-center appearance-none rounded-lg border border-[#DDE6F1] bg-white px-2.5 py-1.5 text-[10.5px] font-semibold text-[#374151] outline-none"
                    >
                      {ACTIONS.map((a) => <option key={a}>{a}</option>)}
                    </select>
                    {(rule.action.includes("budget") || rule.action.includes("Increase") || rule.action.includes("Decrease")) && (
                      <TextInput value={rule.actionValue} onChange={(v) => updateRule(rule.id, { actionValue: v })} placeholder="e.g. 10%, ₹5,000" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addRule}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#BFD4F2] bg-[#F8FBFF] text-[11px] font-semibold text-[#155EEF] hover:bg-[#EFF6FF]"
          >
            <Plus className="size-3.5" />
            Add Automation Rule
          </button>
        </div>
      </Panel>

      <Panel letter="B" icon={Beaker} title="A/B Testing & Experiments" caption="Test different variants to optimize campaign performance.">
        <div className="space-y-3">
          {draft.abTests.map((test) => (
            <div key={test.id} className="rounded-xl border border-[#E6E8F0] bg-white p-3">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#F2EAFF] text-[#7C3AED]">
                  <Beaker className="size-3.5" />
                </span>
                <input
                  value={test.name}
                  onChange={(e) => updateTest(test.id, { name: e.target.value })}
                  className="min-w-0 flex-1 text-[12px] font-bold text-[#111827] outline-none"
                />
                <button
                  type="button"
                  onClick={() => updateTest(test.id, { enabled: !test.enabled })}
                  className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", test.enabled ? "bg-[#0AA673]" : "bg-[#CBD5E1]")}
                >
                  <span className={cn("absolute top-0.5 block size-4 rounded-full bg-white shadow-sm transition-all", test.enabled ? "left-[18px]" : "left-0.5")} />
                </button>
                <button onClick={() => removeTest(test.id)} className="text-[#9CA3AF] hover:text-[#E11D28]">
                  <span className="text-[11px]">&times;</span>
                </button>
              </div>

              <div className="mb-3">
                <Field label="Variable to Test" required>
                  <div className="flex flex-wrap gap-1.5">
                    {AB_VARIABLES.map((v) => (
                      <button
                        key={v}
                        onClick={() => updateTest(test.id, { variable: v })}
                        className={cn(
                          "h-7 rounded-md border px-2 text-[10px] font-semibold",
                          test.variable === v ? "border-[#7C3AED] bg-[#F2EAFF] text-[#7C3AED]" : "border-[#DDE6F1] text-[#526385]",
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-[#E7EDF5] bg-[#F8FAFC] p-2.5">
                  <span className="mb-1 block text-[10px] font-bold text-[#155EEF]">Variant A (Control)</span>
                  <TextInput value={test.variantA} onChange={(v) => updateTest(test.id, { variantA: v })} placeholder="Describe variant A" />
                </div>
                <div className="rounded-lg border border-[#E7EDF5] bg-[#F8FAFC] p-2.5">
                  <span className="mb-1 block text-[10px] font-bold text-[#7C3AED]">Variant B</span>
                  <TextInput value={test.variantB} onChange={(v) => updateTest(test.id, { variantB: v })} placeholder="Describe variant B" />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span className="text-[10px] font-semibold text-[#374151]">Traffic Split:</span>
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-[10px] text-[#155EEF]">A: {test.trafficSplit}%</span>
                  <span className="relative h-2 flex-1 rounded-full bg-[#E7EDF5]">
                    <i className="absolute left-0 top-0 h-full rounded-full bg-[#155EEF]" style={{ width: `${test.trafficSplit}%` }} />
                  </span>
                  <span className="text-[10px] text-[#7C3AED]">B: {100 - test.trafficSplit}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={test.trafficSplit}
                  onChange={(e) => updateTest(test.id, { trafficSplit: Number(e.target.value) })}
                  className="w-20"
                />
              </div>

              <div className="mt-2 flex items-center gap-2 text-[9.5px] text-[#8791A4]">
                <Sparkles className="size-3 text-[#7C3AED]" />
                Automatically allocate more budget to the winning variant after reaching statistical significance.
              </div>
            </div>
          ))}

          <button
            onClick={addTest}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#D4BFFA] bg-[#FAF7FF] text-[11px] font-semibold text-[#7C3AED] hover:bg-[#F2EAFF]"
          >
            <Plus className="size-3.5" />
            Add A/B Test
          </button>
        </div>
      </Panel>
    </div>
  );
}

function Panel({ letter, icon: Icon, title, caption, children }: { letter: string; icon: typeof Zap; title: string; caption: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#DDE6F1] bg-white p-3 shadow-[0_1px_4px_rgb(15_23_42/0.05)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#FFE6EA] text-[13px] font-black text-[#EB0711]">{letter}</span>
        <Icon className="size-4 text-[#7C3AED]" />
        <div className="min-w-0 flex-1">
          <b className="block text-[15px] font-black leading-5 text-[#101A3D]">{title}</b>
          <small className="block text-[10.5px] leading-4 text-[#526385]">{caption}</small>
        </div>
      </div>
      {children}
    </section>
  );
}
