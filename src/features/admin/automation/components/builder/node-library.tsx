"use client";

import { useState } from "react";
import {
  Clock3,
  Users,
  Activity,
  FileText,
  UserPlus,
  Mail,
  CheckSquare,
  Filter,
  GitBranch,
  Database,
  Webhook,
} from "lucide-react";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa";

interface LibraryItem {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: any;
  category: string;
  iconBg: string;
  iconColor: string;
}

const LIBRARY: LibraryItem[] = [
  { id: "meta_lead", type: "trigger", label: "New Meta Lead", description: "Triggers when a lead form is submitted on Facebook/Instagram.", icon: FaFacebookF, category: "Triggers", iconBg: "bg-[#1877F2]", iconColor: "text-white" },
  { id: "website_down", type: "trigger", label: "Website Down", description: "Triggers when website monitoring detects downtime.", icon: Activity, category: "Triggers", iconBg: "bg-[#3B82F6]", iconColor: "text-white" },
  { id: "inbound_webhook", type: "trigger", label: "Inbound Webhook", description: "Triggers when data is received via a webhook URL.", icon: Webhook, category: "Triggers", iconBg: "bg-[#7C3AED]", iconColor: "text-white" },
  { id: "form_submission", type: "trigger", label: "Form Submission", description: "Triggers when a form is submitted on your website.", icon: FileText, category: "Triggers", iconBg: "bg-[#3B82F6]", iconColor: "text-white" },
  { id: "new_customer", type: "trigger", label: "New Customer", description: "Triggers when a new customer is added to the system.", icon: Users, category: "Triggers", iconBg: "bg-[#3B82F6]", iconColor: "text-white" },

  { id: "send_whatsapp", type: "action", label: "Send WhatsApp", description: "Send a template message via AiSensy.", icon: FaWhatsapp, category: "Actions", iconBg: "bg-[#25D366]", iconColor: "text-white" },
  { id: "send_email", type: "action", label: "Send Email", description: "Send an email to the user or team.", icon: Mail, category: "Actions", iconBg: "bg-[#3B82F6]", iconColor: "text-white" },
  { id: "assign_user", type: "action", label: "Assign User", description: "Assign the entity to a team member.", icon: UserPlus, category: "Actions", iconBg: "bg-[#3B82F6]", iconColor: "text-white" },
  { id: "update_record", type: "action", label: "Update Record", description: "Update lead information in the database.", icon: Database, category: "Actions", iconBg: "bg-[#7C3AED]", iconColor: "text-white" },
  { id: "create_task", type: "action", label: "Create Task", description: "Create a follow-up task for the assigned user.", icon: CheckSquare, category: "Actions", iconBg: "bg-[#3B82F6]", iconColor: "text-white" },

  { id: "filter_condition", type: "condition", label: "Filter Condition", description: "Check if the data meets the required criteria.", icon: Filter, category: "Conditions", iconBg: "bg-[#EF4444]", iconColor: "text-white" },
  { id: "if_else", type: "condition", label: "If / Else", description: "Branch workflow based on conditions.", icon: GitBranch, category: "Conditions", iconBg: "bg-[#EF4444]", iconColor: "text-white" },
  { id: "delay", type: "delay", label: "Wait / Delay", description: "Wait for a specific time before next step.", icon: Clock3, category: "Conditions", iconBg: "bg-[#F59E0B]", iconColor: "text-white" },
];

export function NodeLibrary({ onAddNode }: { onAddNode: (type: string, label: string, actionId?: string) => void }) {
  const [search, setSearch] = useState("");

  const filtered = search ? LIBRARY.filter(i => i.label.toLowerCase().includes(search.toLowerCase())) : LIBRARY;
  const categories = ["Triggers", "Actions", "Conditions"];

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-[#E2E8F0]">
        <h2 className="text-[13px] font-bold text-[#111C3A] mb-3">Add Step</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search steps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 px-3 pr-8 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[11.5px] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
          />
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {categories.map(category => {
          const items = filtered.filter(i => i.category === category);
          if (items.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2.5">{category}</h3>
              <div className="space-y-1.5">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onAddNode(item.type, item.label, item.id)}
                    className="flex w-full items-center gap-3 p-2 rounded-lg border border-transparent hover:border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all text-left group cursor-pointer"
                  >
                    <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.iconBg} ${item.iconColor} shadow-sm`}>
                      <item.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-semibold text-[#111C3A] truncate">{item.label}</p>
                      <p className="text-[10px] text-[#6B7A94] mt-0.5 leading-snug line-clamp-2">{item.description}</p>
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
