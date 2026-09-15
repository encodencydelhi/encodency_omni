"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  CalendarDays,
  Pencil,
  Trash2,
  Copy,
  Play,
  Pause,
  Send,
  Megaphone,
  MessageCircle,
  IndianRupee,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface CampaignsTabProps {
  onOpenModal: (modal: string) => void;
}

const initialCampaigns = [
  { id: 1, name: "World Water Day 2025", type: "Marketing", audience: 2480, status: "Completed", sent: 2480, delivered: 2410, deliveredRate: "97.2%", read: 1980, readRate: "82.2%", replied: 620, repliedRate: "25.0%", created: "Mar 10, 2025" },
  { id: 2, name: "Volunteer Drive 2025", type: "Marketing", audience: 1920, status: "Completed", sent: 1920, delivered: 1870, deliveredRate: "97.4%", read: 1420, readRate: "75.9%", replied: 480, repliedRate: "25.0%", created: "Mar 8, 2025" },
  { id: 3, name: "Election Awareness Campaign", type: "Utility", audience: 3200, status: "Running", sent: 2800, delivered: 2720, deliveredRate: "97.1%", read: 2100, readRate: "77.2%", replied: 540, repliedRate: "19.3%", created: "Apr 1, 2025" },
  { id: 4, name: "Monsoon Health Alert", type: "Utility", audience: 1560, status: "Scheduled", sent: 0, delivered: 0, deliveredRate: "-", read: 0, readRate: "-", replied: 0, repliedRate: "-", created: "Apr 12, 2025" },
  { id: 5, name: "Donation Appeal - Clean Ganga", type: "Marketing", audience: 2100, status: "Completed", sent: 2100, delivered: 2040, deliveredRate: "97.1%", read: 1680, readRate: "82.4%", replied: 520, repliedRate: "25.5%", created: "Mar 20, 2025" },
  { id: 6, name: "Summer Camp Registration", type: "Marketing", audience: 980, status: "Draft", sent: 0, delivered: 0, deliveredRate: "-", read: 0, readRate: "-", replied: 0, repliedRate: "-", created: "Apr 14, 2025" },
  { id: 7, name: "Community Update - April", type: "Utility", audience: 1800, status: "Completed", sent: 1800, delivered: 1750, deliveredRate: "97.2%", read: 1340, readRate: "76.6%", replied: 380, repliedRate: "21.7%", created: "Apr 1, 2025" },
  { id: 8, name: "Tree Plantation Drive", type: "Marketing", audience: 1240, status: "Running", sent: 800, delivered: 780, deliveredRate: "97.5%", read: 620, readRate: "79.5%", replied: 180, repliedRate: "23.1%", created: "Apr 10, 2025" },
  { id: 9, name: "Women Empowerment Webinar", type: "Marketing", audience: 1650, status: "Scheduled", sent: 0, delivered: 0, deliveredRate: "-", read: 0, readRate: "-", replied: 0, repliedRate: "-", created: "Apr 13, 2025" },
  { id: 10, name: "Annual Report 2024 Sharing", type: "Utility", audience: 2800, status: "Completed", sent: 2800, delivered: 2730, deliveredRate: "97.5%", read: 2200, readRate: "80.6%", replied: 640, repliedRate: "23.4%", created: "Feb 28, 2025" },
];

const statusColors: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Running: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Completed: "bg-teal-50 text-teal-700 border-teal-200",
};

export function CampaignsTab({ onOpenModal }: CampaignsTabProps) {
  const [campaignList, setCampaignList] = useState(initialCampaigns);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = campaignList.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && c.status.toLowerCase() !== statusFilter) return false;
    if (typeFilter !== "all" && c.type.toLowerCase() !== typeFilter) return false;
    return true;
  });

  const handleClone = (id: number) => {
    const item = campaignList.find((c) => c.id === id);
    if (!item) return;
    const newItem = {
      ...item,
      id: Date.now(),
      name: `${item.name} (Copy)`,
      status: "Draft",
      sent: 0,
      delivered: 0,
      deliveredRate: "-",
      readRate: "-",
      repliedRate: "-",
    };
    setCampaignList([newItem, ...campaignList]);
    toast.success(`Cloned campaign: "${item.name}"`);
  };

  const handleDelete = (id: number) => {
    const item = campaignList.find((c) => c.id === id);
    setCampaignList(campaignList.filter((c) => c.id !== id));
    toast.success(`Deleted campaign: "${item?.name}"`);
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search broadcast campaigns..."
              className="h-10 pl-9 text-xs border-slate-200 focus:border-emerald-500 rounded-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-36 text-xs border-slate-200 rounded-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 w-36 text-xs border-slate-200 rounded-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="utility">Utility</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => onOpenModal("create-campaign")}
          className="h-10 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm shadow-md shadow-emerald-600/20 flex items-center gap-2"
        >
          <Plus className="size-4" /> Create Broadcast Campaign
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Campaigns", value: "24", icon: Send, color: "bg-blue-50 text-blue-600 border-blue-100", trend: "+6 this month" },
          { label: "Active Running", value: "3", icon: Play, color: "bg-emerald-50 text-emerald-600 border-emerald-100", trend: "Running now" },
          { label: "Scheduled", value: "5", icon: CalendarDays, color: "bg-purple-50 text-purple-600 border-purple-100", trend: "Upcoming queue" },
          { label: "Completed", value: "16", icon: Pause, color: "bg-teal-50 text-teal-600 border-teal-100", trend: "↑ 28% vs last month" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3.5 rounded-sm border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-sm font-bold", s.color)}>
              <s.icon className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">{s.label}</p>
              <div className="flex items-baseline gap-1.5">
                <b className="text-xl font-bold text-slate-900">{s.value}</b>
                <span className="text-[11px] font-medium text-slate-400">{s.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Campaigns Table */}
      <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Campaign Name</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3 text-right">Audience</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Sent</th>
                <th className="px-3 py-3 text-right">Delivered</th>
                <th className="px-3 py-3 text-right">Read</th>
                <th className="px-3 py-3 text-right">Replied</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-flex items-center justify-center w-[74px] text-center rounded-sm py-0.5 text-[11px] font-bold border shrink-0", c.type === "Marketing" ? "bg-pink-50 text-pink-700 border-pink-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600 font-semibold">{c.audience.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-flex items-center justify-center w-[74px] text-center rounded-sm py-0.5 text-[11px] font-bold border shrink-0", statusColors[c.status])}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600 font-medium">{c.sent.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right text-slate-600 font-medium">{c.deliveredRate}</td>
                  <td className="px-3 py-3 text-right text-slate-600 font-medium">{c.readRate}</td>
                  <td className="px-3 py-3 text-right text-slate-600 font-medium">{c.repliedRate}</td>
                  <td className="px-3 py-3 text-slate-400 font-medium">{c.created}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => toast.success(`Editing campaign details: ${c.name}`)} className="rounded-sm p-1.5 hover:bg-slate-100 text-slate-500" title="Edit">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={() => handleClone(c.id)} className="rounded-sm p-1.5 hover:bg-slate-100 text-slate-500" title="Clone">
                        <Copy className="size-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="rounded-sm p-1.5 hover:bg-rose-50 text-rose-600" title="Delete">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <span className="text-xs text-slate-500 font-medium">Showing {filtered.length} of {campaignList.length} campaigns</span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs font-semibold px-2.5"
            >
              <ChevronLeft className="size-3.5" /> Prev
            </Button>
            <Button size="sm" className="h-8 text-xs font-bold px-3 bg-emerald-600 text-white hover:bg-emerald-700">
              {currentPage}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-8 text-xs font-semibold px-2.5"
            >
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Click-to-WhatsApp (CTWA) Ads Section */}
      <section className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Click-to-WhatsApp (CTWA) Ads</h3>
            <p className="text-xs text-slate-500">Drive instant WhatsApp chats directly from Meta Ads on Facebook & Instagram.</p>
          </div>
          <Button
            onClick={() => onOpenModal("create-ctwa")}
            className="h-9 px-3.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-sm shadow-xs flex items-center gap-1.5"
          >
            <Plus className="size-3.5" /> Create CTWA Ad
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Active Ads", value: "3", icon: Megaphone, color: "bg-blue-50 text-blue-600 border-blue-100" },
            { label: "Total Conversations", value: "4,821", icon: MessageCircle, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
            { label: "Cost per Conversation", value: "₹12.40", icon: IndianRupee, color: "bg-amber-50 text-amber-600 border-amber-100" },
            { label: "Conversion Rate", value: "18.2%", icon: TrendingUp, color: "bg-purple-50 text-purple-600 border-purple-100" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded-sm border border-slate-200/90 bg-slate-50/50 p-3">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-sm font-bold", s.color)}>
                <s.icon className="size-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">{s.label}</p>
                <b className="text-sm font-bold text-slate-900">{s.value}</b>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          {[
            { name: "Ganga Cleanup Drive - Lead Gen", platform: "Facebook", status: "Active", conversations: 2140, cost: "₹11.80", ctr: "3.2%", budget: "₹25,000", spent: "₹18,400" },
            { name: "Volunteer Recruitment - Awareness", platform: "Instagram", status: "Active", conversations: 1650, cost: "₹13.20", ctr: "2.8%", budget: "₹20,000", spent: "₹14,200" },
            { name: "Donation Appeal - Festival Season", platform: "Facebook", status: "Active", conversations: 1031, cost: "₹12.90", ctr: "3.5%", budget: "₹15,000", spent: "₹11,100" },
          ].map((ad, i) => (
            <div key={i} className="flex items-center gap-4 rounded-sm border border-slate-200/80 bg-slate-50/30 p-3 hover:bg-slate-50 transition-colors">
              <div className="grid size-9 shrink-0 place-items-center rounded-sm bg-blue-600 text-white text-xs font-bold shadow-xs">
                {ad.platform === "Facebook" ? "f" : "IG"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-900">{ad.name}</p>
                  <span className="rounded-sm bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{ad.status}</span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-500">
                  <span>Conversations: <b className="text-slate-900">{ad.conversations.toLocaleString()}</b></span>
                  <span>Cost/Conv: <b className="text-slate-900">{ad.cost}</b></span>
                  <span>CTR: <b className="text-slate-900">{ad.ctr}</b></span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-500 font-medium">Budget: {ad.budget}</p>
                <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-sm bg-slate-200">
                  <div className="h-full rounded-sm bg-blue-600" style={{ width: `${(parseInt(ad.spent.replace(/[₹,]/g, "")) / parseInt(ad.budget.replace(/[₹,]/g, ""))) * 100}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Spent: {ad.spent}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
