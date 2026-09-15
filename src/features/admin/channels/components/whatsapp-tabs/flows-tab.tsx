"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Copy,
  FormInput,
  ShoppingCart,
  BarChart3,
  Zap,
  Workflow,
  Users,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

const initialFlows = [
  { id: 1, name: "Volunteer Registration", type: "Form", status: "Published", submissions: 1247, completionRate: "82%", screens: 4, lastModified: "Apr 10, 2025", category: "Lead Generation" },
  { id: 2, name: "Event RSVP", type: "Form", status: "Published", submissions: 892, completionRate: "91%", screens: 3, lastModified: "Apr 8, 2025", category: "Events" },
  { id: 3, name: "Donation Form", type: "Form", status: "Published", submissions: 634, completionRate: "76%", screens: 5, lastModified: "Apr 5, 2025", category: "Donations" },
  { id: 4, name: "Feedback Survey", type: "Survey", status: "Published", submissions: 423, completionRate: "88%", screens: 6, lastModified: "Apr 3, 2025", category: "Feedback" },
  { id: 5, name: "Product Catalog Browse", type: "Catalog", status: "Draft", submissions: 0, completionRate: "—", screens: 2, lastModified: "Apr 12, 2025", category: "Commerce" },
  { id: 6, name: "Membership Application", type: "Form", status: "Paused", submissions: 156, completionRate: "69%", screens: 7, lastModified: "Mar 28, 2025", category: "Membership" },
];

const typeIcons: Record<string, typeof FormInput> = {
  Form: FormInput,
  Survey: BarChart3,
  Catalog: ShoppingCart,
};

const typeColors: Record<string, string> = {
  Form: "bg-blue-50 text-blue-700 border-blue-200",
  Survey: "bg-purple-50 text-purple-700 border-purple-200",
  Catalog: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const statusColors: Record<string, string> = {
  Published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Paused: "bg-amber-50 text-amber-700 border-amber-200",
};

const categoryColors: Record<string, string> = {
  "Lead Generation": "bg-blue-50 text-blue-700 border-blue-200",
  Events: "bg-amber-50 text-amber-700 border-amber-200",
  Donations: "bg-pink-50 text-pink-700 border-pink-200",
  Feedback: "bg-purple-50 text-purple-700 border-purple-200",
  Commerce: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Membership: "bg-teal-50 text-teal-700 border-teal-200",
};

const flowScreens = [
  { id: 1, title: "Welcome Screen", type: "text", description: "Introduction and opt-in statement" },
  { id: 2, title: "Personal Details", type: "form", description: "Name, phone & email inputs" },
  { id: 3, title: "Preferences", type: "selection", description: "Interest selection checklist" },
  { id: 4, title: "Confirmation", type: "confirmation", description: "Submission confirmation" },
];

export function FlowsTab() {
  const [flowList, setFlowList] = useState(initialFlows);
  const [previewFlow, setPreviewFlow] = useState<typeof initialFlows[0] | null>(null);

  const handleDuplicate = (id: number) => {
    const item = flowList.find((f) => f.id === id);
    if (!item) return;
    const newItem = {
      ...item,
      id: Date.now(),
      name: `${item.name} (Copy)`,
      status: "Draft",
      submissions: 0,
      completionRate: "—",
    };
    setFlowList([newItem, ...flowList]);
    toast.success(`Duplicated flow: "${item.name}"`);
  };

  const handleDelete = (id: number) => {
    const item = flowList.find((f) => f.id === id);
    setFlowList(flowList.filter((f) => f.id !== id));
    toast.success(`Deleted flow: "${item?.name}"`);
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">WhatsApp Native Flows (Interactive Forms)</h3>
          <p className="text-xs text-slate-500">Create multi-screen interactive forms, surveys and catalogs natively inside WhatsApp chats.</p>
        </div>
        <Button
          onClick={() => toast.success("Opening Interactive Flow Builder...")}
          className="h-10 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
        >
          <Plus className="size-4" /> Create WhatsApp Flow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: "Total Flows", value: flowList.length.toString(), icon: Workflow, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
          { label: "Published", value: flowList.filter((f) => f.status === "Published").length.toString(), icon: Zap, color: "bg-blue-50 text-blue-600 border-blue-100" },
          { label: "Total Submissions", value: "3,352", icon: FormInput, color: "bg-purple-50 text-purple-600 border-purple-100" },
          { label: "Avg Completion", value: "81%", icon: BarChart3, color: "bg-teal-50 text-teal-600 border-teal-100" },
          { label: "Active Form Users", value: "1,847", icon: Users, color: "bg-amber-50 text-amber-600 border-amber-100" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl font-bold", s.color)}>
              <s.icon className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">{s.label}</p>
              <b className="text-lg font-bold text-slate-900">{s.value}</b>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Flow Name</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Submissions</th>
                <th className="px-3 py-3 text-right">Completion</th>
                <th className="px-3 py-3 text-right">Screens</th>
                <th className="px-3 py-3">Modified</th>
                <th className="px-3 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flowList.map((f) => {
                const TypeIcon = typeIcons[f.type] || FormInput;
                return (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg font-bold border", typeColors[f.type])}>
                          <TypeIcon className="size-3.5" />
                        </span>
                        <span className="font-bold text-slate-900">{f.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold border", typeColors[f.type])}>
                        {f.type}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold border", categoryColors[f.category])}>
                        {f.category}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold border", statusColors[f.status])}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900">{f.submissions.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-slate-600 font-medium">{f.completionRate}</td>
                    <td className="px-3 py-3 text-right text-slate-600 font-medium">{f.screens}</td>
                    <td className="px-3 py-3 text-slate-400 font-medium">{f.lastModified}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setPreviewFlow(f)} className="rounded-lg p-1.5 hover:bg-blue-50 text-blue-600" title="Preview">
                          <Eye className="size-3.5" />
                        </button>
                        <button onClick={() => toast.success(`Editing flow: ${f.name}`)} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500" title="Edit">
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => handleDuplicate(f.id)} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500" title="Duplicate">
                          <Copy className="size-3.5" />
                        </button>
                        <button onClick={() => handleDelete(f.id)} className="rounded-lg p-1.5 hover:bg-rose-50 text-rose-600" title="Delete">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Screen Sequence Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Flow Screen Builder Structure</h3>
          <div className="space-y-2.5">
            {flowScreens.map((screen, i) => (
              <div key={screen.id} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="grid size-6 place-items-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-xs">
                    {i + 1}
                  </span>
                  {i < flowScreens.length - 1 && <div className="mt-1 h-4 w-0.5 bg-slate-200" />}
                </div>
                <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">{screen.title}</p>
                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                      {screen.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{screen.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Active Flow Completion Rates</h3>
          <div className="space-y-3 pt-1">
            {flowList.filter((f) => f.status === "Published").map((f) => (
              <div key={f.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-900">{f.name}</span>
                  <span className="text-emerald-700 font-bold">{f.completionRate}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: f.completionRate }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Preview Modal */}
      {previewFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs" onClick={() => setPreviewFlow(null)}>
          <div className="w-[380px] rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-4 py-3 text-white">
              <h3 className="text-sm font-bold text-white">Flow Preview: {previewFlow.name}</h3>
              <button onClick={() => setPreviewFlow(null)} className="rounded-lg p-1 hover:bg-white/10 text-slate-400 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-100">
              <div className="rounded-xl bg-[#DCFCE7] border border-emerald-200 p-4 shadow-sm text-slate-800">
                <div className="mb-3 flex items-center gap-2 border-b border-emerald-200/60 pb-2">
                  <span className="grid size-8 place-items-center rounded-full bg-emerald-600 text-xs font-bold text-white">NG</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Namo Gange Trust</p>
                    <p className="text-[10px] text-slate-500 font-medium">Interactive Flow</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {flowScreens.slice(0, previewFlow.screens).map((screen) => (
                    <div key={screen.id} className="rounded-lg bg-white p-3 shadow-xs border border-slate-200/60">
                      <p className="text-xs font-bold text-slate-900">{screen.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{screen.description}</p>
                    </div>
                  ))}
                </div>
                <Button onClick={() => setPreviewFlow(null)} className="mt-4 w-full h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                  Submit Flow Response
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
