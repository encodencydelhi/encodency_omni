"use client";

import { useState } from "react";
import { AutomationNode } from "../../data/types";
import { Settings, Database, Sliders, Copy, ChevronDown, ChevronRight, Webhook, FileText, Users, Filter, GitBranch, Mail, CheckSquare, UserPlus, Clock3, Zap, Flag, Bot } from "lucide-react";
import { FaFacebookF, FaWhatsapp } from "react-icons/fa";

function getNodeIcon(label: string, type: string) {
  const map: Record<string, any> = {
    "Inbound Webhook": Webhook,
    "New Meta Lead": FaFacebookF,
    "Website Down": Zap,
    "Form Submission": FileText,
    "New Customer": Users,
    "Send WhatsApp": FaWhatsapp,
    "WhatsApp Reply": FaWhatsapp,
    "Send Email": Mail,
    "Assign User": UserPlus,
    "Update Record": Database,
    "Create Task": CheckSquare,
    "Filter Condition": Filter,
    "If / Else": GitBranch,
    "Wait / Delay": Clock3,
    "End Workflow": Flag,
    "Parse Data": () => <span className="text-[11px] font-bold font-mono">{"{ }"}</span>,
  };
  return map[label] || (type === "trigger" ? Zap : type === "delay" ? Clock3 : type === "condition" ? Filter : Bot);
}

function getNodeBadge(label: string, type: string) {
  if (type === "trigger") return { bg: "bg-[#DBEAFE]", text: "text-[#2563EB]", label: "TRIGGER" };
  if (type === "delay") return { bg: "bg-[#FEF3C7]", text: "text-[#D97706]", label: "DELAY" };
  if (type === "condition") return { bg: "bg-[#FEE2E2]", text: "text-[#EF4444]", label: "CONDITION" };
  if (label === "End Workflow") return { bg: "bg-[#FEE2E2]", text: "text-[#EF4444]", label: "END" };
  return { bg: "bg-[#DBEAFE]", text: "text-[#2563EB]", label: "ACTION" };
}

function CollapsibleSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-[11.5px] font-semibold text-[#111C3A] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
      >
        <span>{title}</span>
        {open ? <ChevronDown className="size-3.5 text-[#94A3B8]" /> : <ChevronRight className="size-3.5 text-[#94A3B8]" />}
      </button>
      {open && <div className="px-3 pb-3 space-y-3 border-t border-[#E2E8F0]">{children}</div>}
    </div>
  );
}

export function NodeConfigPanel({
  node,
  onChange,
}: {
  node: AutomationNode;
  onChange: (updates: Partial<AutomationNode>) => void;
}) {
  const [activeTab, setActiveTab] = useState<"configure" | "data" | "settings">("configure");
  const Icon = getNodeIcon(node.label, node.type);
  const badge = getNodeBadge(node.label, node.type);

  const tabs = [
    { id: "configure" as const, label: "Configure", icon: Settings },
    { id: "data" as const, label: "Data", icon: Database },
    { id: "settings" as const, label: "Settings", icon: Sliders },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "text-[#2563EB] border-b-2 border-[#2563EB]"
                : "text-[#6B7A94] hover:text-[#111C3A] hover:bg-[#F8FAFC]"
            }`}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "configure" && (
        <div className="flex-1 overflow-y-auto">
          {/* Node Header */}
          <div className="p-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3 mb-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F1F5F9] text-[#64748B]">
                <Icon className="size-5" />
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-[#111C3A]">{node.label}</h3>
                <span className={`inline-block mt-0.5 text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
              </div>
            </div>
            {node.description && (
              <p className="text-[10.5px] text-[#6B7A94] leading-relaxed">{node.description}</p>
            )}
          </div>

          {/* Form Fields */}
          <div className="p-4 space-y-4">
            {node.type === "trigger" && node.label === "Inbound Webhook" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11.5px] font-semibold text-[#111C3A]">
                    Webhook Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    value={node.label}
                    onChange={e => onChange({ label: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11.5px] font-semibold text-[#111C3A]">Webhook URL</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-9 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[11px] text-[#6B7A94] flex items-center truncate font-mono">
                      https://api.omniplatform.com/webhooks/abc123
                    </div>
                    <button type="button" className="size-9 grid place-items-center rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] transition-colors cursor-pointer">
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-[#6B7A94]">Use this URL in your external system to send data.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11.5px] font-semibold text-[#111C3A]">HTTP Method</label>
                  <select className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] focus:outline-none focus:border-[#2563EB] bg-white cursor-pointer">
                    <option>POST</option>
                    <option>GET</option>
                    <option>PUT</option>
                  </select>
                </div>

                <CollapsibleSection title="Headers (Optional)">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#111C3A]">Header Key</label>
                    <input
                      type="text"
                      placeholder="Authorization"
                      className="w-full h-8 px-2.5 rounded-md border border-[#E2E8F0] text-[11px] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#111C3A]">Header Value</label>
                    <input
                      type="text"
                      placeholder="Bearer token..."
                      className="w-full h-8 px-2.5 rounded-md border border-[#E2E8F0] text-[11px] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Response Settings">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#111C3A]">Response Code</label>
                    <select className="w-full h-8 px-2.5 rounded-md border border-[#E2E8F0] text-[11px] focus:outline-none focus:border-[#2563EB] bg-white cursor-pointer">
                      <option>200 OK</option>
                      <option>201 Created</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#111C3A]">Response Body</label>
                    <textarea
                      rows={3}
                      placeholder='{"status": "received"}'
                      className="w-full px-2.5 py-2 rounded-md border border-[#E2E8F0] text-[11px] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] resize-none font-mono"
                    />
                  </div>
                </CollapsibleSection>
              </>
            )}

            {node.type === "trigger" && node.label !== "Inbound Webhook" && (
              <div className="space-y-1.5">
                <label className="text-[11.5px] font-semibold text-[#111C3A]">Trigger Name</label>
                <input
                  type="text"
                  value={node.label}
                  onChange={e => onChange({ label: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
                />
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
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
                  />
                </div>

                {(node.label.includes("WhatsApp") || node.actionId === "send_whatsapp") && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11.5px] font-semibold text-[#111C3A]">Template Message</label>
                      <select className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] focus:outline-none focus:border-[#2563EB] bg-white cursor-pointer">
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
                        className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] bg-[#F8FAFC] text-[#6B7A94]"
                      />
                      <p className="text-[10px] text-[#6B7A94]">This field will be mapped automatically.</p>
                    </div>
                  </div>
                )}

                {node.label.includes("Email") && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11.5px] font-semibold text-[#111C3A]">Recipient</label>
                      <input
                        type="text"
                        placeholder="{{lead.email}}"
                        className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11.5px] font-semibold text-[#111C3A]">Subject</label>
                      <input
                        type="text"
                        placeholder="Welcome to our platform"
                        className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {node.type === "delay" && (
              <div className="space-y-1.5">
                <label className="text-[11.5px] font-semibold text-[#111C3A]">Delay Duration</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={node.config.duration || 2}
                    onChange={e => onChange({ config: { ...node.config, duration: e.target.value } })}
                    className="w-20 h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] focus:outline-none focus:border-[#2563EB]"
                  />
                  <select
                    value={node.config.unit || "hours"}
                    onChange={e => onChange({ config: { ...node.config, unit: e.target.value } })}
                    className="flex-1 h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] focus:outline-none focus:border-[#2563EB] bg-white cursor-pointer"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
            )}

            {node.type === "condition" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11.5px] font-semibold text-[#111C3A]">Condition Field</label>
                  <select className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] focus:outline-none focus:border-[#2563EB] bg-white cursor-pointer">
                    <option>lead.source</option>
                    <option>lead.status</option>
                    <option>lead.score</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11.5px] font-semibold text-[#111C3A]">Operator</label>
                  <select className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] focus:outline-none focus:border-[#2563EB] bg-white cursor-pointer">
                    <option>equals</option>
                    <option>contains</option>
                    <option>greater than</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11.5px] font-semibold text-[#111C3A]">Value</label>
                  <input
                    type="text"
                    placeholder="Enter value..."
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] text-[11.5px] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="p-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              className="w-full h-9 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11.5px] font-semibold transition-colors cursor-pointer shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {activeTab === "data" && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <Database className="size-8 text-[#CBD5E1] mx-auto mb-2" />
            <p className="text-[11.5px] text-[#6B7A94]">Data mappings will appear here once the workflow is configured.</p>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <Sliders className="size-8 text-[#CBD5E1] mx-auto mb-2" />
            <p className="text-[11.5px] text-[#6B7A94]">Advanced settings for this node.</p>
          </div>
        </div>
      )}
    </div>
  );
}
