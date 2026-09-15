"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface TemplatesTabProps {
  onOpenModal: (modal: string) => void;
}

const initialTemplates = [
  { id: 1, name: "event_reminder_v2", category: "Utility", lang: "English", status: "Approved", headerType: "Text", body: "Dear Rahul, this is a reminder for our upcoming World Water Day event on 22nd March at Varanasi Ghat. Please confirm your attendance by replying YES.", buttons: "Quick Reply", modified: "Apr 10, 2025" },
  { id: 2, name: "volunteer_signup_invite", category: "Marketing", lang: "English", status: "Approved", headerType: "Image", body: "Hi Priya! 🙌 We need volunteers for the Ganga Cleanup Drive happening on 5th April. Join us and make a difference. Click below to sign up now!", buttons: "Call to Action", modified: "Apr 8, 2025" },
  { id: 3, name: "donation_thanks_msg", category: "Utility", lang: "English", status: "Approved", headerType: "Text", body: "Thank you Amit for your generous donation of ₹2,500 to Namo Gange Trust. Your support means the world to us. 🙏 Receipt #NGT-2025-0483", buttons: "Quick Reply", modified: "Apr 5, 2025" },
  { id: 4, name: "campaign_progress_update", category: "Marketing", lang: "English", status: "Approved", headerType: "Video", body: "📢 Update: Clean Ganga campaign has achieved 72% of its ₹10,00,000 goal! Help us reach 100%. Share with friends and family.", buttons: "Call to Action", modified: "Apr 3, 2025" },
  { id: 5, name: "otp_verification_code", category: "Authentication", lang: "English", status: "Approved", headerType: "Text", body: "Your verification code is 482916. It expires in 10 minutes. Do not share this code with anyone. -Namo Gange Trust", buttons: "None", modified: "Mar 28, 2025" },
  { id: 6, name: "welcome_new_subscriber", category: "Marketing", lang: "English", status: "Approved", headerType: "Image", body: "Welcome Neha! 🎉 Thank you for joining Namo Gange Trust. You'll receive updates about river conservation and our community initiatives.", buttons: "Quick Reply", modified: "Mar 25, 2025" },
  { id: 7, name: "event_registration_confirm", category: "Utility", lang: "English", status: "Pending", headerType: "Text", body: "Hi Vikram, your registration for Tree Plantation Drive is confirmed! 📅 Date: 20th April ⏰ Time: 7:00 AM 📍 Venue: Assi Ghat, Varanasi. See you there!", buttons: "Quick Reply", modified: "Apr 12, 2025" },
  { id: 8, name: "feedback_survey_request", category: "Marketing", lang: "English", status: "Pending", headerType: "Text", body: "Hi Anjali, we'd love your feedback on the Water Conservation Workshop (held on 8th April). Your input helps us improve. Rate your experience 1-5.", buttons: "Quick Reply", modified: "Apr 11, 2025" },
  { id: 9, name: "monthly_newsletter_apr", category: "Marketing", lang: "English", status: "Rejected", headerType: "Document", body: "📰 Namo Gange Monthly Newsletter - April 2025. Top stories: 500 trees planted, 3 new water testing labs, volunteer stories. Read the full newsletter.", buttons: "Call to Action", modified: "Apr 7, 2025" },
  { id: 10, name: "emergency_flood_alert", category: "Utility", lang: "English", status: "Draft", headerType: "Text", body: "⚠️ URGENT: Heavy flood alert issued for Varanasi region. Please take immediate action. Helpline: 1800-180-1551 | Nearest shelter: Ramkund School", buttons: "Call to Action", modified: "Apr 14, 2025" },
];

const categoryColors: Record<string, string> = {
  Marketing: "bg-pink-50 text-pink-700 border-pink-200",
  Utility: "bg-blue-50 text-blue-700 border-blue-200",
  Authentication: "bg-purple-50 text-purple-700 border-purple-200",
};

const statusColors: Record<string, string> = {
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
};

export function TemplatesTab({ onOpenModal }: TemplatesTabProps) {
  const [templateList, setTemplateList] = useState(initialTemplates);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewTemplate, setPreviewTemplate] = useState<typeof initialTemplates[0] | null>(null);

  const filtered = templateList.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && t.category.toLowerCase() !== categoryFilter) return false;
    if (statusFilter !== "all" && t.status.toLowerCase() !== statusFilter) return false;
    return true;
  });

  const handleDelete = (id: number) => {
    const item = templateList.find((t) => t.id === id);
    setTemplateList(templateList.filter((t) => t.id !== id));
    toast.success(`Deleted template: "${item?.name}"`);
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search templates..."
              className="h-10 pl-9 text-xs border-slate-200 focus:border-emerald-500 rounded-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 w-36 text-xs border-slate-200 rounded-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="utility">Utility</SelectItem>
              <SelectItem value="authentication">Authentication</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-36 text-xs border-slate-200 rounded-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => onOpenModal("create-template")}
          className="h-10 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm shadow-md shadow-emerald-600/20 flex items-center gap-2"
        >
          <Plus className="size-4" /> Create Template
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: "Total Templates", value: templateList.length.toString(), icon: FileText, color: "bg-blue-50 text-blue-600 border-blue-100" },
          { label: "Approved", value: templateList.filter((t) => t.status === "Approved").length.toString(), icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
          { label: "Pending Meta", value: templateList.filter((t) => t.status === "Pending").length.toString(), icon: Clock, color: "bg-amber-50 text-amber-600 border-amber-100" },
          { label: "Rejected", value: templateList.filter((t) => t.status === "Rejected").length.toString(), icon: AlertTriangle, color: "bg-rose-50 text-rose-600 border-rose-100" },
          { label: "Draft", value: templateList.filter((t) => t.status === "Draft").length.toString(), icon: FileX, color: "bg-slate-100 text-slate-600 border-slate-200" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 rounded-sm border border-slate-200/90 bg-white p-3 shadow-xs">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-sm font-bold", s.color)}>
              <s.icon className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">{s.label}</p>
              <b className="text-lg font-bold text-slate-900">{s.value}</b>
            </div>
          </div>
        ))}
      </div>

      {/* Templates Table */}
      <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Template Name</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Language</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Header</th>
                <th className="px-3 py-3">Body Preview</th>
                <th className="px-3 py-3">Buttons</th>
                <th className="px-3 py-3">Modified</th>
                <th className="px-3 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{t.name}</td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-sm px-2 py-0.5 text-[11px] font-bold border", categoryColors[t.category])}>
                      {t.category}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 font-medium">{t.lang}</td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-sm px-2 py-0.5 text-[11px] font-bold border", statusColors[t.status])}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 font-medium">{t.headerType}</td>
                  <td className="px-3 py-3 max-w-[220px] text-slate-600 font-medium">
                    <span className="line-clamp-2">{t.body}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 font-medium">{t.buttons}</td>
                  <td className="px-3 py-3 text-slate-400 font-medium">{t.modified}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setPreviewTemplate(t)} className="rounded-sm p-1.5 hover:bg-blue-50 text-blue-600" title="Preview">
                        <Eye className="size-3.5" />
                      </button>
                      <button onClick={() => toast.success(`Editing template: ${t.name}`)} className="rounded-sm p-1.5 hover:bg-slate-100 text-slate-500" title="Edit">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="rounded-sm p-1.5 hover:bg-rose-50 text-rose-600" title="Delete">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <span className="text-xs text-slate-500 font-medium">Showing {filtered.length} of {templateList.length} templates</span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold px-2.5">
              <ChevronLeft className="size-3.5" /> Prev
            </Button>
            <Button size="sm" className="h-8 text-xs font-bold px-3 bg-emerald-600 text-white hover:bg-emerald-700">1</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold px-2.5">
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Live Phone Mockup Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs" onClick={() => setPreviewTemplate(null)}>
          <div className="w-[380px] rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-emerald-700/20 bg-emerald-600 px-4 py-3 text-white">
              <h3 className="text-sm font-bold text-white">Template Preview</h3>
              <button onClick={() => setPreviewTemplate(null)} className="rounded-sm p-1 hover:bg-white/10 text-emerald-100 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-100">
              <div className="rounded-sm bg-[#DCFCE7] border border-emerald-200 p-3.5 shadow-sm text-slate-800">
                <div className="mb-2 flex items-center gap-2 border-b border-emerald-200/60 pb-2">
                  <span className="grid size-7 place-items-center rounded-sm bg-emerald-600 text-xs font-bold text-white">NG</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Namo Gange Trust</p>
                    <p className="text-[10px] text-slate-500 font-medium">Verified WABA Account</p>
                  </div>
                </div>
                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{previewTemplate.body}</p>
                {previewTemplate.buttons !== "None" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => { toast.success("Template response simulated"); setPreviewTemplate(null); }} className="flex-1 rounded-sm border border-emerald-600 bg-white py-1.5 text-xs font-bold text-emerald-700 shadow-xs hover:bg-emerald-50">
                      Quick Reply
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 text-center text-xs text-slate-500 font-medium">
                Template: <b className="text-slate-800">{previewTemplate.name}</b> • Category: {previewTemplate.category}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
