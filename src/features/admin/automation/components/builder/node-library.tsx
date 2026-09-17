"use client";

import { useState } from "react";
import { Bot, MessageCircle, Clock3, Users, Zap, LayoutTemplate, Activity } from "lucide-react";

interface LibraryItem {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: any;
  category: string;
  disabledReason?: string;
}

const LIBRARY: LibraryItem[] = [
  { id: "meta_lead", type: "trigger", label: "New Meta Lead", description: "Triggers when a lead form is submitted on Facebook/Instagram.", icon: Zap, category: "Triggers" },
  { id: "website_down", type: "trigger", label: "Website Down", description: "Triggers when website monitoring detects downtime.", icon: Activity, category: "Triggers" },
  { id: "send_whatsapp", type: "action", label: "Send WhatsApp", description: "Send a template message via AiSensy.", icon: MessageCircle, category: "Actions" },
  { id: "assign_user", type: "action", label: "Assign User", description: "Assign the entity to a team member.", icon: Users, category: "Actions" },
  { id: "delay", type: "delay", label: "Wait / Delay", description: "Pause the workflow for a set amount of time.", icon: Clock3, category: "Logic" },
  { id: "condition", type: "condition", label: "Condition", description: "Branch workflow based on rules.", icon: LayoutTemplate, category: "Logic" }
];

export function NodeLibrary({ onAddNode }: { onAddNode: (type: string, label: string) => void }) {
  const [search, setSearch] = useState("");

  const filtered = search ? LIBRARY.filter(i => i.label.toLowerCase().includes(search.toLowerCase())) : LIBRARY;
  const categories = Array.from(new Set(filtered.map(i => i.category)));

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-[#E2E8F0]">
        <h2 className="text-[12.5px] font-semibold text-[#111C3A] mb-3">Add Step</h2>
        <input 
          type="text" 
          placeholder="Search steps..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-8 px-2.5 rounded-md border border-[#DDE4ED] text-[11.5px] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {categories.map(category => (
          <div key={category}>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">{category}</h3>
            <div className="space-y-2">
              {filtered.filter(i => i.category === category).map(item => (
                <button
                  key={item.id}
                  onClick={() => onAddNode(item.type, item.label)}
                  className="flex w-full items-start gap-3 p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <div className="grid size-7 shrink-0 place-items-center rounded-md bg-[#EFF4FC] text-[#3B69B8]">
                    <item.icon className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-[11.5px] font-semibold text-[#111C3A]">{item.label}</p>
                    <p className="text-[10px] text-[#6B7A94] mt-0.5 leading-snug">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
