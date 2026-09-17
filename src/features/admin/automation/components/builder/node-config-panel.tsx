"use client";

import { AutomationNode } from "../../data/types";
import { WButton } from "../../../website/components/ui/kit";
import { Trash2 } from "lucide-react";

export function NodeConfigPanel({ 
  node, 
  onChange 
}: { 
  node: AutomationNode, 
  onChange: (updates: Partial<AutomationNode>) => void 
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <div>
          <h2 className="text-[13.5px] font-semibold text-[#111C3A]">{node.label}</h2>
          <p className="text-[10px] text-[#6B7A94] mt-0.5 uppercase tracking-wider">{node.type}</p>
        </div>
        <button className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded transition-colors">
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Dynamic Config Fields based on type */}
        {node.type === "trigger" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-semibold text-[#111C3A]">Trigger Name</label>
              <input 
                type="text" 
                value={node.label}
                onChange={e => onChange({ label: e.target.value })}
                className="w-full h-8 px-2.5 rounded-md border border-[#DDE4ED] text-[11.5px] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            {node.label.includes("Meta") && (
              <div className="space-y-1.5">
                <label className="text-[11.5px] font-semibold text-[#111C3A]">Facebook Page</label>
                <select className="w-full h-8 px-2.5 rounded-md border border-[#DDE4ED] text-[11.5px] focus:outline-none focus:border-[#2563EB]">
                  <option>Moksha Sewa Official</option>
                  <option>Namo Gange Trust</option>
                </select>
              </div>
            )}
          </div>
        )}

        {node.type === "action" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-semibold text-[#111C3A]">Action Name</label>
              <input 
                type="text" 
                value={node.label}
                onChange={e => onChange({ label: e.target.value })}
                className="w-full h-8 px-2.5 rounded-md border border-[#DDE4ED] text-[11.5px] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            
            {node.label.includes("WhatsApp") && (
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[11.5px] font-semibold text-[#111C3A]">Template Message</label>
                  <select className="w-full h-8 px-2.5 rounded-md border border-[#DDE4ED] text-[11.5px] focus:outline-none focus:border-[#2563EB]">
                    <option>welcome_lead_01</option>
                    <option>followup_no_reply</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11.5px] font-semibold text-[#111C3A]">Recipient Number Variable</label>
                  <input 
                    type="text" 
                    value="{{lead.phone}}"
                    readOnly
                    className="w-full h-8 px-2.5 rounded-md border border-[#DDE4ED] text-[11.5px] bg-[#F8FAFC]"
                  />
                  <p className="text-[10px] text-[#6B7A94]">This field will be mapped automatically.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {node.type === "delay" && (
          <div className="space-y-4">
             <div className="space-y-1.5">
              <label className="text-[11.5px] font-semibold text-[#111C3A]">Delay Duration</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={node.config.duration || 2}
                  onChange={e => onChange({ config: { ...node.config, duration: e.target.value } })}
                  className="w-20 h-8 px-2.5 rounded-md border border-[#DDE4ED] text-[11.5px] focus:outline-none focus:border-[#2563EB]"
                />
                <select 
                  value={node.config.unit || "hours"}
                  onChange={e => onChange({ config: { ...node.config, unit: e.target.value } })}
                  className="flex-1 h-8 px-2.5 rounded-md border border-[#DDE4ED] text-[11.5px] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
