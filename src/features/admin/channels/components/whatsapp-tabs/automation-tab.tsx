"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Zap,
  Clock,
  MessageSquare,
  ArrowRight,
  Workflow,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface AutomationTabProps {
  onOpenModal: (modal: string) => void;
}

const initialRules = [
  { id: 1, name: "Welcome Message", description: "Send a welcome message when a new contact is added", trigger: "New Contact", triggerType: "event", action: "Send welcome_message template", enabled: true, lastTriggered: "2 hours ago", triggeredCount: 342 },
  { id: 2, name: "Keyword Reply - DONATE", description: "Auto-reply when message contains 'donate'", trigger: 'Message contains "donate"', triggerType: "keyword", action: "Send donation_link template", enabled: true, lastTriggered: "30 mins ago", triggeredCount: 128 },
  { id: 3, name: "Event Reminder", description: "Send reminder 24 hours before event", trigger: "24 hrs before event", triggerType: "time-based", action: "Send event_reminder template", enabled: true, lastTriggered: "1 day ago", triggeredCount: 856 },
  { id: 4, name: "Follow-up Message", description: "Send follow-up if no reply in 48 hours", trigger: "No reply in 48hrs", triggerType: "time-based", action: "Send follow_up template", enabled: true, lastTriggered: "3 hours ago", triggeredCount: 194 },
  { id: 5, name: "Lead Nurture Sequence", description: "3-part drip sequence for new volunteers", trigger: "New volunteer signup", triggerType: "event", action: "Send 3-part drip sequence", enabled: false, lastTriggered: "5 days ago", triggeredCount: 67 },
  { id: 6, name: "Auto-assign Agent", description: "Assign inbound messages based on keywords", trigger: "Inbound message", triggerType: "keyword", action: "Route to available agent", enabled: true, lastTriggered: "15 mins ago", triggeredCount: 2104 },
];

const triggerIcons: Record<string, typeof Zap> = {
  event: Zap,
  keyword: MessageSquare,
  "time-based": Clock,
};

const triggerColors: Record<string, string> = {
  event: "bg-emerald-50 text-emerald-700 border-emerald-200",
  keyword: "bg-blue-50 text-blue-700 border-blue-200",
  "time-based": "bg-amber-50 text-amber-700 border-amber-200",
};

export function AutomationTab({ onOpenModal }: AutomationTabProps) {
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [ruleList, setRuleList] = useState(initialRules);

  const toggleRule = (id: number) => {
    setRuleList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    toast.success("Rule Status Updated");
  };

  const handleDelete = (id: number) => {
    const item = ruleList.find((r) => r.id === id);
    setRuleList(ruleList.filter((r) => r.id !== id));
    toast.success(`Deleted rule: "${item?.name}"`);
  };

  const activeCount = ruleList.filter((r) => r.enabled).length;

  return (
    <div className="space-y-4 pt-1">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Automation Rules & Keyword Triggers</h3>
          <p className="text-xs text-slate-500">Automate responses, agent assignment and drip sequences via AiSensy WABA engine.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-xs font-bold text-slate-700">Master Switch</span>
            <Switch checked={automationEnabled} onCheckedChange={(val) => { setAutomationEnabled(val); toast.info(val ? "Automation Enabled" : "Automation Paused"); }} />
          </div>
          <Button
            onClick={() => onOpenModal("create-rule")}
            className="h-10 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="size-4" /> Create Rule
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Rules", value: `${activeCount}/${ruleList.length}`, icon: Zap, color: "bg-emerald-50 text-emerald-600 border-emerald-100", trend: "Running" },
          { label: "Total Triggered", value: "2,456", icon: ArrowRight, color: "bg-blue-50 text-blue-600 border-blue-100", trend: "↑ 24% this week" },
          { label: "Success Rate", value: "94.2%", icon: Workflow, color: "bg-teal-50 text-teal-600 border-teal-100", trend: "↑ 2.1%" },
          { label: "Messages Automated", value: "12,340", icon: MessageSquare, color: "bg-purple-50 text-purple-600 border-purple-100", trend: "↑ 18% vs last month" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3.5 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-bold", s.color)}>
              <s.icon className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">{s.label}</p>
              <div className="flex items-baseline gap-1.5">
                <b className="text-xl font-bold text-slate-900">{s.value}</b>
                <span className="text-[11px] font-semibold text-emerald-600">{s.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {ruleList.map((rule) => {
          const TriggerIcon = triggerIcons[rule.triggerType] || Zap;
          return (
            <div
              key={rule.id}
              className={cn(
                "flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border p-4 bg-white shadow-xs transition-all hover:shadow-md",
                rule.enabled ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50/50"
              )}
            >
              <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl border font-bold", triggerColors[rule.triggerType])}>
                <TriggerIcon className="size-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{rule.name}</h4>
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border", triggerColors[rule.triggerType])}>
                    {rule.triggerType}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{rule.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
                  <span>Trigger: <b className="text-slate-900 font-bold">{rule.trigger}</b></span>
                  <span>Action: <b className="text-slate-900 font-bold">{rule.action}</b></span>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Last triggered</p>
                  <p className="text-xs font-bold text-slate-900">{rule.lastTriggered}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{rule.triggeredCount} executions</p>
                </div>
                <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                <div className="flex items-center gap-1">
                  <button onClick={() => toast.success(`Editing rule: ${rule.name}`)} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500" title="Edit">
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="rounded-lg p-1.5 hover:bg-rose-50 text-rose-600" title="Delete">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Workflow Preview Node Diagram */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="mb-3 text-xs font-bold text-slate-900 uppercase tracking-wider">Visual Bot Flow Execution Diagram</h3>
        <div className="flex items-center justify-center gap-3 overflow-x-auto py-4">
          {[
            { label: "1. Inbound Trigger", sub: "Incoming User Message", color: "bg-emerald-50 border-emerald-300 text-emerald-800" },
            { label: "2. Logic Condition", sub: 'Contains "help" / "join"', color: "bg-blue-50 border-blue-300 text-blue-800" },
            { label: "3. Auto Response", sub: "Send WABA Template", color: "bg-purple-50 border-purple-300 text-purple-800" },
            { label: "4. Team Inbox", sub: "Assign to Agent", color: "bg-amber-50 border-amber-300 text-amber-800" },
            { label: "5. Resolution", sub: "Mark Chat Resolved", color: "bg-slate-100 border-slate-300 text-slate-700" },
          ].map((node, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={cn("rounded-xl border-2 px-4 py-3 text-center min-w-[150px] shadow-xs", node.color)}>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{node.label}</p>
                <p className="text-xs font-bold mt-0.5">{node.sub}</p>
              </div>
              {i < 4 && <ArrowRight className="size-4 shrink-0 text-slate-400" />}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
