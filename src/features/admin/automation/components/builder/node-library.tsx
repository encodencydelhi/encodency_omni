"use client";

import { useState } from "react";
import {
  Clock3, Users, Activity, FileText, UserPlus, Mail, CheckSquare, Filter, GitBranch, Database, Webhook, UserCheck, Hand, Split, Merge, Repeat2, BadgeCheck, Workflow,
  CalendarClock, ArrowRightLeft, ShieldAlert, Globe, Bell, MessageSquare, AlarmClock, UserX, CreditCard, Receipt, MessageSquareWarning, Handshake, TrendingUp, CheckCheck, Sparkles,
} from "lucide-react";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa";
import type { AutomationNodeType } from "../../data/types";

export interface LibraryItem {
  id: string;
  type: AutomationNodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "Triggers" | "Actions" | "Conditions" | "Delays" | "Orchestration" | "Human" | "Reuse";
  iconBg: string;
  hexColor: string;
  supported?: boolean;
}

export const LIBRARY: LibraryItem[] = [
  { id: "new_lead", type: "trigger", label: "New Lead", description: "Runs when a lead is added to the CRM (manually, import or form).", icon: UserCheck, category: "Triggers", iconBg: "bg-[#2563EB]", hexColor: "#2563EB", supported: true },
  { id: "meta_lead", type: "trigger", label: "New Meta Lead", description: "Runs when a lead with source Facebook or Instagram is added.", icon: FaFacebookF, category: "Triggers", iconBg: "bg-[#1877F2]", hexColor: "#1877F2" },
  { id: "new_customer", type: "trigger", label: "New Customer", description: "Runs when a contact is added to the CRM.", icon: Users, category: "Triggers", iconBg: "bg-[#0EA5E9]", hexColor: "#0EA5E9" },
  { id: "form_submission", type: "trigger", label: "Form Submission", description: "Your website form posts to this workflow’s URL; a CRM lead is created.", icon: FileText, category: "Triggers", iconBg: "bg-[#3B82F6]", hexColor: "#3B82F6" },
  { id: "inbound_webhook", type: "trigger", label: "Inbound Webhook", description: "Any system can POST JSON to this workflow’s secret URL.", icon: Webhook, category: "Triggers", iconBg: "bg-[#7C3AED]", hexColor: "#7C3AED" },
  { id: "website_down", type: "trigger", label: "Website Down", description: "Runs when a website check finds the client’s site down.", icon: Activity, category: "Triggers", iconBg: "bg-[#DC2626]", hexColor: "#DC2626" },
  { id: "schedule", type: "trigger", label: "Schedule", description: "Runs on a timetable: every few minutes, daily, on chosen weekdays or monthly.", icon: CalendarClock, category: "Triggers", iconBg: "bg-[#0D9488]", hexColor: "#0D9488" },
  { id: "lead_stage_changed", type: "trigger", label: "Lead Stage Changed", description: "Runs when a lead moves to another pipeline stage (optionally only to a chosen stage).", icon: ArrowRightLeft, category: "Triggers", iconBg: "bg-[#9333EA]", hexColor: "#9333EA" },
  { id: "website_ssl_expiring", type: "trigger", label: "SSL Expiring", description: "Runs when a monitored website's SSL certificate is close to expiring.", icon: ShieldAlert, category: "Triggers", iconBg: "bg-[#D97706]", hexColor: "#D97706" },
  { id: "task_overdue", type: "trigger", label: "Task Overdue", description: "Runs once when a CRM task passes its due date without being completed.", icon: AlarmClock, category: "Triggers", iconBg: "bg-[#E11D48]", hexColor: "#E11D48" },
  { id: "lead_inactive", type: "trigger", label: "Lead Inactive", description: "Runs once when a lead has had no activity for a number of days.", icon: UserX, category: "Triggers", iconBg: "bg-[#475569]", hexColor: "#475569" },
  { id: "new_deal", type: "trigger", label: "New Deal", description: "Runs when a deal is created in the CRM pipeline.", icon: Handshake, category: "Triggers", iconBg: "bg-[#0E7490]", hexColor: "#0E7490" },
  { id: "deal_stage_changed", type: "trigger", label: "Deal Stage Changed", description: "Runs when a deal moves to another pipeline stage (optionally only to a chosen stage).", icon: TrendingUp, category: "Triggers", iconBg: "bg-[#7C2D12]", hexColor: "#7C2D12" },
  { id: "task_completed", type: "trigger", label: "Task Completed", description: "Runs when a CRM task is marked completed.", icon: CheckCheck, category: "Triggers", iconBg: "bg-[#15803D]", hexColor: "#15803D" },
  { id: "payment_failed", type: "trigger", label: "Payment Failed", description: "Runs when an online payment for your subscription invoice fails.", icon: CreditCard, category: "Triggers", iconBg: "bg-[#B91C1C]", hexColor: "#B91C1C" },
  { id: "invoice_paid", type: "trigger", label: "Invoice Paid", description: "Runs when an online payment settles a subscription invoice.", icon: Receipt, category: "Triggers", iconBg: "bg-[#15803D]", hexColor: "#15803D" },
  { id: "whatsapp_failed", type: "trigger", label: "WhatsApp Failed", description: "Runs when a WhatsApp message could not be delivered.", icon: MessageSquareWarning, category: "Triggers", iconBg: "bg-[#EA580C]", hexColor: "#EA580C" },
  { id: "manual", type: "trigger", label: "Manual Trigger", description: "Runs only when someone presses “Run” / “Test”.", icon: Hand, category: "Triggers", iconBg: "bg-[#64748B]", hexColor: "#64748B" },

  { id: "send_whatsapp", type: "action", label: "Send WhatsApp", description: "Send an approved WhatsApp template via AiSensy.", icon: FaWhatsapp, category: "Actions", iconBg: "bg-[#25D366]", hexColor: "#16A34A" },
  { id: "send_email", type: "action", label: "Send Email", description: "Send an email to the record or your team.", icon: Mail, category: "Actions", iconBg: "bg-[#F97316]", hexColor: "#F97316" },
  { id: "assign_user", type: "action", label: "Assign User", description: "Make a team member the owner of the lead/contact.", icon: UserPlus, category: "Actions", iconBg: "bg-[#3B82F6]", hexColor: "#3B82F6" },
  { id: "update_record", type: "action", label: "Update Record", description: "Change the stage/status, add tags or append a note.", icon: Database, category: "Actions", iconBg: "bg-[#7C3AED]", hexColor: "#7C3AED" },
  { id: "http_request", type: "action", label: "HTTP Request", description: "Call any public URL (your CRM, Slack, Zapier, Make, a Google Sheets script) with a custom body.", icon: Globe, category: "Actions", iconBg: "bg-[#0F172A]", hexColor: "#0F172A" },
  { id: "ai_generate", type: "action", label: "AI Step", description: "Ask AI to write a brief, a task description, a reminder or to score a lead. Its answer is available to the next steps.", icon: Sparkles, category: "Actions", iconBg: "bg-[#6D28D9]", hexColor: "#6D28D9" },
  { id: "slack_message", type: "action", label: "Slack Message", description: "Post a message to a Slack channel through an incoming webhook.", icon: MessageSquare, category: "Actions", iconBg: "bg-[#4A154B]", hexColor: "#4A154B" },
  { id: "notify_user", type: "action", label: "Notify Team", description: "Send an in-app notification to the owner, chosen members or the whole client team.", icon: Bell, category: "Actions", iconBg: "bg-[#DB2777]", hexColor: "#DB2777" },
  { id: "create_task", type: "action", label: "Create Task", description: "Create a CRM follow-up task.", icon: CheckSquare, category: "Actions", iconBg: "bg-[#0891B2]", hexColor: "#0891B2" },

  { id: "filter_condition", type: "condition", label: "Filter Condition", description: "Stop the run unless the condition is true.", icon: Filter, category: "Conditions", iconBg: "bg-[#EF4444]", hexColor: "#EF4444" },
  { id: "if_else", type: "condition", label: "If / Else", description: "If true run the next step, otherwise skip it and continue.", icon: GitBranch, category: "Conditions", iconBg: "bg-[#E11D48]", hexColor: "#E11D48" },
  { id: "switch", type: "condition", label: "Switch", description: "Route execution across named cases with an optional default.", icon: GitBranch, category: "Conditions", iconBg: "bg-[#BE123C]", hexColor: "#BE123C" },
  { id: "delay", type: "delay", label: "Wait / Delay", description: "Pause the run for minutes, hours or days.", icon: Clock3, category: "Delays", iconBg: "bg-[#F59E0B]", hexColor: "#F59E0B" },
  { id: "wait_until", type: "delay", label: "Wait Until", description: "Resume at an absolute timezone-aware time or after a relative duration.", icon: Clock3, category: "Delays", iconBg: "bg-[#D97706]", hexColor: "#D97706", supported: true },
  { id: "parallel", type: "parallel", label: "Parallel Branch", description: "Run 2–10 paths concurrently.", icon: Split, category: "Orchestration", iconBg: "bg-[#4F46E5]", hexColor: "#4F46E5", supported: true },
  { id: "merge", type: "merge", label: "Merge / Join", description: "Wait for all branches or the first successful branch.", icon: Merge, category: "Orchestration", iconBg: "bg-[#4338CA]", hexColor: "#4338CA", supported: true },
  { id: "for_each", type: "loop", label: "For Each", description: "Process array items concurrently with durable checkpoints.", icon: Repeat2, category: "Orchestration", iconBg: "bg-[#7C3AED]", hexColor: "#7C3AED", supported: true },
  { id: "loop", type: "loop", label: "Bounded Loop", description: "Repeat a path until a stop condition or safety limit.", icon: Repeat2, category: "Orchestration", iconBg: "bg-[#6D28D9]", hexColor: "#6D28D9", supported: true },
  { id: "approval", type: "approval", label: "Approval", description: "Pause for an authorized approval, rejection or expiry.", icon: BadgeCheck, category: "Human", iconBg: "bg-[#0F766E]", hexColor: "#0F766E", supported: true },
  { id: "sub_workflow", type: "sub_workflow", label: "Sub-workflow", description: "Invoke a version-pinned reusable workflow.", icon: Workflow, category: "Reuse", iconBg: "bg-[#0369A1]", hexColor: "#0369A1", supported: true },
];

export function libraryItem(actionId?: string, label?: string): LibraryItem | undefined {
  return LIBRARY.find((i) => i.id === actionId) ?? LIBRARY.find((i) => i.label === label);
}

export const NODE_DRAG_TYPE = "application/x-encodency-automation-node";

export function NodeLibrary({ hasTrigger, onAddNode, readOnly = false }: { hasTrigger: boolean; onAddNode: (item: LibraryItem) => void; readOnly?: boolean }) {
  const [search, setSearch] = useState("");
  const filtered = search ? LIBRARY.filter((i) => `${i.label} ${i.description}`.toLowerCase().includes(search.toLowerCase())) : LIBRARY;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#E2E8F0] p-4">
        <h2 className="mb-3 text-[13px] font-bold text-[#111C3A]">Add Step</h2>
        <input
          type="search"
          placeholder="Search steps..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[11.5px] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]/20"
        />
      </div>
      <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-4">
        {(["Triggers", "Actions", "Conditions", "Delays", "Orchestration", "Human", "Reuse"] as const).map((category) => {
          const items = filtered.filter((i) => i.category === category);
          if (!items.length) return null;
          return (
            <div key={category}>
              <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{category}</h3>
              {category === "Triggers" ? <p className="mb-2 text-[10px] text-[#94A3B8]">{hasTrigger ? "Picking another trigger replaces the current one." : "Every workflow starts with one trigger."}</p> : null}
              <div className="space-y-1.5">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    draggable={!readOnly && item.supported !== false}
                    disabled={readOnly || item.supported === false}
                    onDragStart={(event) => { event.dataTransfer.setData(NODE_DRAG_TYPE, item.id); event.dataTransfer.effectAllowed = "move"; }}
                    onClick={() => onAddNode(item)}
                    className="group flex w-full cursor-grab items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-all hover:border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.iconBg} text-white shadow-sm`}>
                      <item.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-semibold text-[#111C3A]">{item.label}</p>
                      {item.supported === false ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">Coming Soon</span> : null}
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[#6B7A94]">{item.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
