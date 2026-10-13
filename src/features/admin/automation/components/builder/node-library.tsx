"use client";

import { useState } from "react";
import {
  Clock3, Users, Activity, FileText, UserPlus, Mail, CheckSquare, Filter, GitBranch, Database, Webhook, UserCheck, Hand,
} from "lucide-react";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa";
import type { AutomationNodeType } from "../../data/types";

export interface LibraryItem {
  id: string;
  type: AutomationNodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "Triggers" | "Actions" | "Logic";
  iconBg: string;
  hexColor: string;
}

export const LIBRARY: LibraryItem[] = [
  { id: "new_lead", type: "trigger", label: "New Lead", description: "Runs when a lead is added to the CRM (manually, import or form).", icon: UserCheck, category: "Triggers", iconBg: "bg-[#2563EB]", hexColor: "#2563EB" },
  { id: "meta_lead", type: "trigger", label: "New Meta Lead", description: "Runs when a lead with source Facebook or Instagram is added.", icon: FaFacebookF, category: "Triggers", iconBg: "bg-[#1877F2]", hexColor: "#1877F2" },
  { id: "new_customer", type: "trigger", label: "New Customer", description: "Runs when a contact is added to the CRM.", icon: Users, category: "Triggers", iconBg: "bg-[#0EA5E9]", hexColor: "#0EA5E9" },
  { id: "form_submission", type: "trigger", label: "Form Submission", description: "Your website form posts to this workflow’s URL; a CRM lead is created.", icon: FileText, category: "Triggers", iconBg: "bg-[#3B82F6]", hexColor: "#3B82F6" },
  { id: "inbound_webhook", type: "trigger", label: "Inbound Webhook", description: "Any system can POST JSON to this workflow’s secret URL.", icon: Webhook, category: "Triggers", iconBg: "bg-[#7C3AED]", hexColor: "#7C3AED" },
  { id: "website_down", type: "trigger", label: "Website Down", description: "Runs when a website check finds the client’s site down.", icon: Activity, category: "Triggers", iconBg: "bg-[#DC2626]", hexColor: "#DC2626" },
  { id: "manual", type: "trigger", label: "Manual Trigger", description: "Runs only when someone presses “Run” / “Test”.", icon: Hand, category: "Triggers", iconBg: "bg-[#64748B]", hexColor: "#64748B" },

  { id: "send_whatsapp", type: "action", label: "Send WhatsApp", description: "Send an approved WhatsApp template via AiSensy.", icon: FaWhatsapp, category: "Actions", iconBg: "bg-[#25D366]", hexColor: "#16A34A" },
  { id: "send_email", type: "action", label: "Send Email", description: "Send an email to the record or your team.", icon: Mail, category: "Actions", iconBg: "bg-[#F97316]", hexColor: "#F97316" },
  { id: "assign_user", type: "action", label: "Assign User", description: "Make a team member the owner of the lead/contact.", icon: UserPlus, category: "Actions", iconBg: "bg-[#3B82F6]", hexColor: "#3B82F6" },
  { id: "update_record", type: "action", label: "Update Record", description: "Change the stage/status, add tags or append a note.", icon: Database, category: "Actions", iconBg: "bg-[#7C3AED]", hexColor: "#7C3AED" },
  { id: "create_task", type: "action", label: "Create Task", description: "Create a CRM follow-up task.", icon: CheckSquare, category: "Actions", iconBg: "bg-[#0891B2]", hexColor: "#0891B2" },

  { id: "filter_condition", type: "condition", label: "Filter Condition", description: "Stop the run unless the condition is true.", icon: Filter, category: "Logic", iconBg: "bg-[#EF4444]", hexColor: "#EF4444" },
  { id: "if_else", type: "condition", label: "If / Else", description: "If true run the next step, otherwise skip it and continue.", icon: GitBranch, category: "Logic", iconBg: "bg-[#E11D48]", hexColor: "#E11D48" },
  { id: "delay", type: "delay", label: "Wait / Delay", description: "Pause the run for minutes, hours or days.", icon: Clock3, category: "Logic", iconBg: "bg-[#F59E0B]", hexColor: "#F59E0B" },
];

export function libraryItem(actionId?: string, label?: string): LibraryItem | undefined {
  return LIBRARY.find((i) => i.id === actionId) ?? LIBRARY.find((i) => i.label === label);
}

export function NodeLibrary({ hasTrigger, onAddNode }: { hasTrigger: boolean; onAddNode: (item: LibraryItem) => void }) {
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
        {(["Triggers", "Actions", "Logic"] as const).map((category) => {
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
                    onClick={() => onAddNode(item)}
                    className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-all hover:border-[#E2E8F0] hover:bg-[#F8FAFC]"
                  >
                    <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.iconBg} text-white shadow-sm`}>
                      <item.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-semibold text-[#111C3A]">{item.label}</p>
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
