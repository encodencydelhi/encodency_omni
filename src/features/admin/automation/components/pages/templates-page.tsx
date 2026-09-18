"use client";

import { useState, useMemo } from "react";
import {
  Search, LayoutDashboard, UserPlus, PhoneCall, Globe,
  MessageSquare, Star, ArrowRight, Activity, Clock, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { AutomationWorkflow } from "../../data/types";
import { WorkflowBuilder } from "../builder/workflow-builder";

interface TemplatesPageProps {
  onUseTemplate?: (workflow: AutomationWorkflow) => void;
}

interface TemplateItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  category: string;
  tags: string[];
  features?: string[];
  time: string;
  uses: string;
  c1?: React.ReactNode | string;
  c2?: React.ReactNode | string;
  featured?: boolean;
}

const ALL_TEMPLATES: TemplateItem[] = [
  {
    id: "tpl_1",
    icon: <UserPlus className="size-4 text-blue-500" />,
    title: "New Lead Follow-up",
    desc: "Automatically follow up with new leads across multiple channels.",
    category: "Sales",
    tags: ["Sales", "Popular"],
    features: ["Multi-channel", "Pre-built integrations", "Popular templates"],
    time: "12 min",
    uses: "1.2K",
    c1: "G",
    c2: <MessageSquare className="size-2.5" fill="currentColor" />,
    featured: true,
  },
  {
    id: "tpl_2",
    icon: <span className="text-orange-500 font-bold text-[14px]">G</span>,
    title: "Negative Review Alert",
    desc: "Get notified of negative reviews and respond quickly on Google Business.",
    category: "Reputation",
    tags: ["Reputation", "Essential"],
    features: ["AI-powered", "Conditional logic", "Pre-built integrations", "Popular templates"],
    time: "8 min",
    uses: "856",
    c1: "G",
    c2: <Globe className="size-2.5" />,
    featured: true,
  },
  {
    id: "tpl_3",
    icon: <Activity className="size-4 text-emerald-500" />,
    title: "Website Down Alert",
    desc: "Alert when your website is down and notify your team instantly via Slack/Email.",
    category: "Website",
    tags: ["Website", "Monitoring"],
    features: ["Multi-channel", "Conditional logic", "Pre-built integrations"],
    time: "5 min",
    uses: "642",
    c1: <MessageSquare className="size-2.5" />,
    c2: <LayoutDashboard className="size-2.5" />,
    featured: true,
  },
  {
    id: "tpl_4",
    icon: <MessageSquare className="size-4 text-emerald-500" fill="currentColor" />,
    title: "WhatsApp Re-engagement",
    desc: "Re-engage inactive leads with personalized WhatsApp messages.",
    category: "Sales",
    tags: ["Sales", "Re-engagement"],
    features: ["Multi-channel", "AI-powered", "Pre-built integrations", "Popular templates"],
    time: "10 min",
    uses: "934",
    c1: <MessageSquare className="size-2.5" fill="currentColor" />,
    c2: null,
  },
  {
    id: "tpl_5",
    icon: <Clock className="size-4 text-blue-500" />,
    title: "Appointment Reminder",
    desc: "Send automated appointment reminders to reduce no-shows.",
    category: "CRM",
    tags: ["CRM", "Engagement"],
    features: ["Multi-channel", "Pre-built integrations"],
    time: "8 min",
    uses: "721",
    c1: <MessageSquare className="size-2.5" fill="currentColor" />,
    c2: <UserPlus className="size-2.5" />,
  },
  {
    id: "tpl_6",
    icon: <BarChart3 className="size-4 text-yellow-500" />,
    title: "SEO Issue Assignment",
    desc: "Automatically assign SEO ranking drops to your optimization team.",
    category: "SEO",
    tags: ["SEO", "Automation"],
    features: ["AI-powered", "Conditional logic", "Pre-built integrations"],
    time: "10 min",
    uses: "512",
    c1: "G",
    c2: <LayoutDashboard className="size-2.5" />,
  },
  {
    id: "tpl_7",
    icon: <Star className="size-4 text-red-500" fill="currentColor" />,
    title: "Donation Follow-up",
    desc: "Thank donors and send follow-up receipts automatically.",
    category: "Custom",
    tags: ["Custom", "Non-Profit"],
    features: ["Multi-channel", "Conditional logic", "Pre-built integrations"],
    time: "7 min",
    uses: "423",
    c1: <MessageSquare className="size-2.5" />,
    c2: <MessageSquare className="size-2.5" fill="currentColor" />,
  },
  {
    id: "tpl_8",
    icon: <MessageSquare className="size-4 text-blue-600" />,
    title: "Abandoned Form Recovery",
    desc: "Recover lost leads from abandoned landing page forms with automated SMS.",
    category: "Sales",
    tags: ["Sales", "Conversion"],
    features: ["Multi-channel", "Conditional logic", "Pre-built integrations", "Popular templates"],
    time: "9 min",
    uses: "689",
    c1: <MessageSquare className="size-2.5" />,
    c2: "G",
  },
  {
    id: "tpl_9",
    icon: <UserPlus className="size-4 text-indigo-500" />,
    title: "Social Comment Escalation",
    desc: "Detect important high-intent comments on Meta Ads and escalate to sales reps.",
    category: "Social",
    tags: ["Social", "Support"],
    features: ["Multi-channel", "AI-powered", "Conditional logic", "Pre-built integrations"],
    time: "6 min",
    uses: "398",
    c1: "M",
    c2: "L",
  },
  {
    id: "tpl_10",
    icon: <PhoneCall className="size-4 text-emerald-600" />,
    title: "Missed Call Response",
    desc: "Instantly respond to missed calls with SMS or WhatsApp greeting.",
    category: "Support",
    tags: ["Support", "Response"],
    features: ["Multi-channel", "Pre-built integrations", "Popular templates"],
    time: "8 min",
    uses: "476",
    c1: <MessageSquare className="size-2.5" fill="currentColor" />,
    c2: <PhoneCall className="size-2.5" />,
  },
];

export function TemplatesPage({ onUseTemplate }: TemplatesPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Templates");
  const [selectedFeatureFilter, setSelectedFeatureFilter] = useState<string | null>(null);
  const [internalEditingWorkflow, setInternalEditingWorkflow] = useState<AutomationWorkflow | null>(null);

  const categories = useMemo(() => [
    { label: "All Templates", icon: <LayoutDashboard className="size-3.5" />, count: ALL_TEMPLATES.length },
    { label: "Sales", icon: <UserPlus className="size-3.5" />, count: ALL_TEMPLATES.filter(t => t.category === "Sales").length },
    { label: "Support", icon: <PhoneCall className="size-3.5" />, count: ALL_TEMPLATES.filter(t => t.category === "Support").length },
    { label: "Reputation", icon: <Star className="size-3.5" />, count: ALL_TEMPLATES.filter(t => t.category === "Reputation").length },
    { label: "SEO", icon: <Search className="size-3.5" />, count: ALL_TEMPLATES.filter(t => t.category === "SEO").length },
    { label: "Website", icon: <Globe className="size-3.5" />, count: ALL_TEMPLATES.filter(t => t.category === "Website").length },
    { label: "CRM", icon: <UserPlus className="size-3.5" />, count: ALL_TEMPLATES.filter(t => t.category === "CRM").length },
    { label: "Social", icon: <MessageSquare className="size-3.5" />, count: ALL_TEMPLATES.filter(t => t.category === "Social").length },
    { label: "Custom", icon: <Clock className="size-3.5" />, count: ALL_TEMPLATES.filter(t => t.category === "Custom").length },
  ], []);

  const featureCounts = useMemo(() => ({
    "Multi-channel": ALL_TEMPLATES.filter(t => t.features?.includes("Multi-channel")).length,
    "AI-powered": ALL_TEMPLATES.filter(t => t.features?.includes("AI-powered")).length,
    "Conditional logic": ALL_TEMPLATES.filter(t => t.features?.includes("Conditional logic")).length,
    "Pre-built integrations": ALL_TEMPLATES.filter(t => t.features?.includes("Pre-built integrations")).length,
    "Popular templates": ALL_TEMPLATES.filter(t => t.features?.includes("Popular templates")).length,
  }), []);

  const filteredTemplates = useMemo(() => {
    return ALL_TEMPLATES.filter((tpl) => {
      if (selectedCategory !== "All Templates" && tpl.category !== selectedCategory) {
        return false;
      }
      if (selectedFeatureFilter && !tpl.features?.includes(selectedFeatureFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = tpl.title.toLowerCase().includes(q);
        const matchesDesc = tpl.desc.toLowerCase().includes(q);
        const matchesTag = tpl.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesTag) return false;
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedFeatureFilter]);

  const handleUseTemplate = (tpl: TemplateItem) => {
    const workflow: AutomationWorkflow = {
      id: `wf_${Date.now()}`,
      clientId: "client_1",
      name: tpl.title,
      status: "Active",
      version: 1,
      trigger: { type: "webhook", label: tpl.title },
      channels: ["whatsapp", "meta"],
      runs: 0,
      successRate: 100,
      failures: 0,
      lastRunAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        { id: "node_1", type: "trigger", label: `${tpl.title} Trigger`, status: "configured", config: {} },
        { id: "node_2", type: "action", actionId: "send_whatsapp", label: "Send Automated Reply", status: "configured", config: {} },
        { id: "node_3", type: "delay", label: "Wait 15 Minutes", status: "configured", config: { duration: 15, unit: "minutes" } },
        { id: "node_4", type: "action", actionId: "assign_user", label: "Assign to Sales Rep", status: "configured", config: {} },
      ],
      edges: [
        { id: "e1", source: "node_1", target: "node_2" },
        { id: "e2", source: "node_2", target: "node_3" },
        { id: "e3", source: "node_3", target: "node_4" },
      ],
    };

    toast.success(`Template loaded: "${tpl.title}"`, {
      description: "Opening interactive workflow builder...",
    });

    if (onUseTemplate) {
      onUseTemplate(workflow);
    } else {
      setInternalEditingWorkflow(workflow);
    }
  };

  if (internalEditingWorkflow) {
    return (
      <WorkflowBuilder
        workflow={internalEditingWorkflow}
        onBack={() => setInternalEditingWorkflow(null)}
      />
    );
  }

  return (
    <div className="space-y-2 pb-12">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search templates by name, use case, or channel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-[#E2E8F0] bg-white rounded-lg px-3 py-2 text-[12px] font-medium text-[#334155] cursor-pointer hover:bg-slate-50 focus:outline-none focus:border-blue-500 shadow-2xs"
          >
            {categories.map((c) => (
              <option key={c.label} value={c.label}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-2 items-start">

        {/* LEFT COLUMN (Categories & Feature filters) */}
        <div className="w-full lg:w-[220px] shrink-0 space-y-2">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <h3 className="text-[13px] font-bold text-[#111C3A] mb-3">Browse by Use Case</h3>
            <div className="space-y-0.5">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.label;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setSelectedCategory(cat.label)}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-md cursor-pointer transition-colors text-left ${
                      isActive
                        ? "bg-blue-50 text-[#2563EB] font-bold shadow-2xs"
                        : "text-[#64748B] hover:bg-slate-50 hover:text-[#111C3A] font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {cat.icon}
                      <span className="text-[12px]">{cat.label}</span>
                    </div>
                    <span className={`text-[11px] ${isActive ? "font-bold text-[#2563EB]" : "text-[#94A3B8]"}`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <h3 className="text-[13px] font-bold text-[#111C3A] mb-3">Template Features</h3>
            <div className="space-y-2">
              {[
                { label: "Multi-channel" as const },
                { label: "AI-powered" as const },
                { label: "Conditional logic" as const },
                { label: "Pre-built integrations" as const },
                { label: "Popular templates" as const },
              ].map((feat) => {
                const isChecked = selectedFeatureFilter === feat.label;
                return (
                  <label
                    key={feat.label}
                    onClick={() => setSelectedFeatureFilter(isChecked ? null : feat.label)}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 size-3.5"
                      />
                      <span className="text-[12px] font-medium text-[#64748B] group-hover:text-[#111C3A]">
                        {feat.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#94A3B8]">{featureCounts[feat.label]}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN (Template Cards Grid) */}
        <div className="flex-1 space-y-2 min-w-0">

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-bold text-[#111C3A]">Template Library</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Showing {filteredTemplates.length} ready-to-use omnichannel automation blueprints.
                </p>
              </div>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-[#94A3B8] space-y-2">
                <Search className="size-8 mx-auto opacity-40" />
                <p className="text-[13px]">No templates found matching "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setSelectedCategory("All Templates"); }}
                  className="text-blue-600 text-[12px] font-bold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col hover:border-[#CBD5E1] hover:shadow-xs transition-all bg-[#FAFBFD] hover:bg-white group justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="size-8 bg-white rounded-lg border border-[#E2E8F0] flex items-center justify-center shadow-2xs">
                          {tpl.icon}
                        </div>
                        <div className="flex gap-1">
                          {tpl.tags.map((t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded text-[#2563EB] bg-blue-50 font-bold text-[9px] border border-blue-100">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <h4 className="text-[12.5px] font-bold text-[#111C3A] mb-1">{tpl.title}</h4>
                      <p className="text-[10px] text-[#64748B] mb-3 leading-snug line-clamp-2">
                        {tpl.desc}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[9.5px] text-[#64748B] mb-3 font-medium border-t border-[#F1F5F9] pt-2">
                        <span className="flex items-center gap-1"><Clock className="size-3" /> {tpl.time} setup</span>
                        <span className="flex items-center gap-1"><ArrowRight className="size-3" /> {tpl.uses} deploys</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUseTemplate(tpl)}
                        className="w-full text-center py-2 rounded-lg bg-white hover:bg-blue-600 hover:text-white border border-[#BFDBFE] text-[#2563EB] text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (Sidebar: Recently Deployed & Recommendations) */}
        <div className="w-full lg:w-[240px] shrink-0 space-y-2">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <h3 className="text-[13px] font-bold text-[#111C3A] mb-3">Popular Blueprints</h3>
            <div className="space-y-2">
              {ALL_TEMPLATES.slice(0, 4).map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleUseTemplate(tpl)}
                  className="flex gap-2.5 items-start p-2 -mx-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="size-7 shrink-0 rounded-md border border-[#E2E8F0] bg-white flex items-center justify-center shadow-2xs">
                    {tpl.icon}
                  </div>
                  <div className="truncate">
                    <h4 className="text-[11px] font-bold text-[#111C3A] leading-tight mb-0.5 truncate">{tpl.title}</h4>
                    <p className="text-[9px] text-[#64748B]">{tpl.uses} live runs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
