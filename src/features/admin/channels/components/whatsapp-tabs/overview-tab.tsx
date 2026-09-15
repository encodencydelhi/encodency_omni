"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  ChevronDown,
  MonitorPlay,
  Send,
  Eye,
  CornerUpLeft,
  XCircle,
  Plus,
  SendHorizontal,
  Settings2,
  BarChart3,
  Mail,
  Edit3,
  UsersRound,
  UserCheck,
  UserX,
  UserMinus,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Pencil,
  Zap,
  Globe,
  Clock,
  PhoneCall,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { WabaIntegrationDetails } from "../whatsapp-modals";

interface OverviewTabProps {
  onTabChange?: (tab: string) => void;
  onOpenModal?: (modal: string) => void;
  integrationDetails?: WabaIntegrationDetails;
}

const defaultIntegrationDetails: WabaIntegrationDetails = {
  provider: "AiSensy (WABA)",
  phoneNumber: "+91 98765 43210",
  businessName: "Namo Gange Trust",
  wabaStatus: "Active",
  qualityRating: "High",
  dailyLimit: "10,000 messages",
  timezone: "Asia/Kolkata",
  wabaId: "waba_namogange_2025",
};

const messageStats = [
  { label: "Total Messages", value: "12,482", trend: "↑ 28%", icon: MonitorPlay, color: "green", note: "vs last month" },
  { label: "Messages Sent", value: "11,230", trend: "↑ 32%", icon: SendHorizontal, color: "blue", note: "delivered & queued" },
  { label: "Delivered", value: "10,842", trend: "96.5%", icon: CheckCircle2, color: "green", note: "high delivery rate" },
  { label: "Read", value: "8,421", trend: "77.6%", icon: Eye, color: "blue", note: "open rate" },
  { label: "Replied", value: "2,845", trend: "26.2%", icon: CornerUpLeft, color: "purple", note: "inbound replies" },
  { label: "Failed", value: "388", trend: "3.5%", icon: XCircle, color: "red", note: "opt-out or invalid" },
];

const performanceData30d = [
  { d: "Mar 15", sent: 300, delivered: 280, read: 200, replied: 80 },
  { d: "Mar 20", sent: 500, delivered: 480, read: 350, replied: 150 },
  { d: "Mar 25", sent: 450, delivered: 420, read: 300, replied: 120 },
  { d: "Mar 30", sent: 800, delivered: 760, read: 550, replied: 200 },
  { d: "Apr 5", sent: 900, delivered: 880, read: 650, replied: 250 },
  { d: "Apr 10", sent: 1100, delivered: 1050, read: 800, replied: 300 },
  { d: "Apr 14", sent: 1200, delivered: 1150, read: 900, replied: 350 },
];

const performanceData7d = [
  { d: "Apr 8", sent: 980, delivered: 940, read: 720, replied: 280 },
  { d: "Apr 9", sent: 1050, delivered: 1010, read: 780, replied: 310 },
  { d: "Apr 10", sent: 1100, delivered: 1050, read: 800, replied: 300 },
  { d: "Apr 11", sent: 1120, delivered: 1070, read: 830, replied: 320 },
  { d: "Apr 12", sent: 1150, delivered: 1100, read: 860, replied: 330 },
  { d: "Apr 13", sent: 1180, delivered: 1130, read: 880, replied: 340 },
  { d: "Apr 14", sent: 1200, delivered: 1150, read: 900, replied: 350 },
];

const breakdownData = [
  { name: "Delivered", value: 10842, color: "#10B981" },
  { name: "Read", value: 8421, color: "#3B82F6" },
  { name: "Replied", value: 2845, color: "#8B5CF6" },
  { name: "Failed", value: 388, color: "#EF4444" },
];

const topCampaigns = [
  { name: "World Water Day 2025", sent: 2480, delivered: 2410, read: 1980, replied: 620 },
  { name: "Volunteer Drive", sent: 1920, delivered: 1870, read: 1420, replied: 480 },
  { name: "Event Reminder", sent: 1560, delivered: 1512, read: 1120, replied: 320 },
  { name: "Donation Appeal", sent: 1240, delivered: 1190, read: 980, replied: 410 },
  { name: "Community Updates", sent: 980, delivered: 950, read: 760, replied: 210 },
];

const recentCampaigns = [
  { name: "Earth Day Awareness", type: "Marketing", audience: "2,480", status: "Completed", date: "Apr 14, 2025 10:00 AM" },
  { name: "Volunteer Recruitment", type: "Marketing", audience: "1,920", status: "Completed", date: "Apr 12, 2025 02:30 PM" },
  { name: "Event Reminder", type: "Utility", audience: "1,560", status: "Completed", date: "Apr 10, 2025 11:00 AM" },
  { name: "Donation Appeal", type: "Marketing", audience: "1,240", status: "Completed", date: "Apr 8, 2025 05:00 PM" },
  { name: "Thank You Message", type: "Utility", audience: "980", status: "Completed", date: "Apr 5, 2025 09:00 AM" },
];

const messageTemplates = [
  { name: "event_reminder_v2", category: "Utility", lang: "English", status: "Approved" },
  { name: "volunteer_signup_invite", category: "Marketing", lang: "English", status: "Approved" },
  { name: "donation_thanks_msg", category: "Utility", lang: "English", status: "Approved" },
  { name: "campaign_progress_update", category: "Marketing", lang: "English", status: "Approved" },
  { name: "otp_verification_code", category: "Authentication", lang: "English", status: "Approved" },
];

const conversations = [
  { initial: "D", name: "Deepak Mishra", phone: "+91 98123 45670", msg: "Thank you for the information 🙏", time: "10:24 AM", status: "Replied", color: "bg-blue-100 text-blue-700" },
  { initial: "S", name: "Sunita Verma", phone: "+91 98234 56781", msg: "Can you share the event location?", time: "09:15 AM", status: "Replied", color: "bg-emerald-100 text-emerald-700" },
  { initial: "R", name: "Rohit Tiwari", phone: "+91 98345 67892", msg: "I would like to volunteer.", time: "Yesterday", status: "Open", color: "bg-amber-100 text-amber-800" },
  { initial: "K", name: "Komal Pandey", phone: "+91 98456 78903", msg: "Please send me the brochure.", time: "Yesterday", status: "Replied", color: "bg-purple-100 text-purple-700" },
];

const audienceGrowthData = [
  { d: "Mar 15", val: 320 }, { d: "Mar 20", val: 510 }, { d: "Mar 25", val: 720 },
  { d: "Mar 30", val: 890 }, { d: "Apr 5", val: 1100 }, { d: "Apr 10", val: 1350 },
  { d: "Apr 14", val: 1550 },
];

function Box({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col transition-all hover:shadow-md", className)}>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-800 uppercase">{title}</h2>
        {action && <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">{action}</div>}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">{children}</div>
    </section>
  );
}

export function OverviewTab({
  onTabChange = () => { },
  onOpenModal = () => { },
  integrationDetails = defaultIntegrationDetails,
}: OverviewTabProps) {
  const [perfDateRange, setPerfDateRange] = useState("30d");
  const [growthRange, setGrowthRange] = useState("30d");

  const perfData = perfDateRange === "7d" ? performanceData7d : performanceData30d;
  const details = integrationDetails || defaultIntegrationDetails;

  return (
    <div className="space-y-4 pt-1 bg-slate-50/30 p-1 rounded-2xl">
      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {messageStats.map((stat, i) => {
          const colorStyles: Record<string, { bg: string; iconBg: string; text: string }> = {
            green: { bg: "bg-emerald-50/80 border-emerald-200/80", iconBg: "bg-emerald-600 text-white shadow-xs", text: "text-emerald-700" },
            blue: { bg: "bg-blue-50/80 border-blue-200/80", iconBg: "bg-blue-600 text-white shadow-xs", text: "text-blue-700" },
            purple: { bg: "bg-purple-50/80 border-purple-200/80", iconBg: "bg-purple-600 text-white shadow-xs", text: "text-purple-700" },
            red: { bg: "bg-rose-50/80 border-rose-200/80", iconBg: "bg-rose-600 text-white shadow-xs", text: "text-rose-700" },
          };
          const style = colorStyles[stat.color] || colorStyles.green;

          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3.5 bg-white shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md",
                style.bg
              )}
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-sm font-bold", style.iconBg)}>
                <stat.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <b className="text-xl font-extrabold tracking-tight text-slate-900">{stat.value}</b>
                  <span className={cn("text-xs font-bold whitespace-nowrap", style.text)}>{stat.trend}</span>
                </div>
                {stat.note && <p className="text-[10px] text-slate-400 font-semibold truncate">{stat.note}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: Performance, Breakdown, Top Campaigns */}
      <div className="grid min-h-[290px] grid-cols-1 lg:grid-cols-3 gap-3">
        <Box
          title="Message Performance"
          action={
            <Select value={perfDateRange} onValueChange={setPerfDateRange}>
              <SelectTrigger className="h-7 border-slate-200 text-xs px-2 bg-white rounded-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="flex h-full flex-col px-3.5 py-3">
            <div className="mb-2 flex shrink-0 gap-3 text-[11px] font-bold text-slate-600">
              <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-emerald-500" />Sent</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-blue-500" />Delivered</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-purple-500" />Read</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-amber-500" />Replied</span>
            </div>
            <div className="min-h-[190px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perfData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #E2E8F0", padding: "6px 10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                    labelStyle={{ fontSize: 11, fontWeight: 700, color: "#0F172A" }}
                  />
                  <Line type="monotone" dataKey="sent" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="delivered" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="read" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="replied" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Box>

        <Box title="Delivery Breakdown">
          <div className="flex h-full items-center px-4 py-3">
            <div className="relative size-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={breakdownData} dataKey="value" innerRadius={48} outerRadius={68} strokeWidth={0}>
                    {breakdownData.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <b className="block text-xl font-extrabold text-slate-900 leading-none">11,230</b>
                  <small className="text-[10px] font-bold text-slate-400 uppercase">Messages</small>
                </div>
              </div>
            </div>
            <div className="ml-4 flex-1 space-y-2.5">
              {breakdownData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <i className="size-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                    {d.name}
                  </span>
                  <div className="text-right">
                    <span className="block text-slate-900 font-extrabold">{d.value.toLocaleString()}</span>
                    <span className={cn("block text-[10px] font-bold", i === 3 ? "text-rose-600" : "text-emerald-600")}>
                      {["96.5%", "77.6%", "26.2%", "3.5%"][i]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Box>

        <Box
          title="Top Campaigns"
          action={
            <button
              onClick={() => onTabChange("Campaigns")}
              className="text-emerald-600 hover:text-emerald-700 text-xs font-bold hover:underline flex items-center gap-0.5 transition-all"
            >
              View All <ArrowUpRight className="size-3" />
            </button>
          }
        >
          <div className="px-3 py-1">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-1 py-2 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100">
              <span>Campaign</span>
              <span className="text-right">Sent</span>
              <span className="text-right">Delivered</span>
              <span className="text-right">Read</span>
              <span className="text-right">Replied</span>
            </div>
            {topCampaigns.map((c) => (
              <div key={c.name} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-1 border-b border-slate-50 py-2 text-xs hover:bg-slate-50/80 transition-colors items-center">
                <span className="truncate font-bold text-slate-800">{c.name}</span>
                <span className="text-right text-slate-600 font-semibold">{c.sent}</span>
                <span className="text-right text-slate-600 font-semibold">{c.delivered}</span>
                <span className="text-right text-slate-600 font-semibold">{c.read}</span>
                <span className="text-right text-slate-600 font-semibold">{c.replied}</span>
              </div>
            ))}
          </div>
        </Box>
      </div>

      {/* Row 3: Recent Campaigns, Message Templates, Quick Actions */}
      <div className="grid min-h-[310px] grid-cols-1 lg:grid-cols-3 gap-3">
        <Box
          title="Recent Campaigns"
          action={
            <button
              onClick={() => onTabChange("Campaigns")}
              className="text-emerald-600 hover:text-emerald-700 text-xs font-bold hover:underline flex items-center gap-0.5 transition-all"
            >
              View All <ArrowUpRight className="size-3" />
            </button>
          }
        >
          <div className="px-3 py-1">
            <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1.4fr] gap-2 py-2 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100">
              <span>Campaign</span>
              <span>Type</span>
              <span>Audience</span>
              <span>Status</span>
              <span>Sent On</span>
            </div>
            {recentCampaigns.map((c) => (
              <div key={c.name} className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1.4fr] gap-2 items-center border-b border-slate-50 py-2.5 text-xs hover:bg-slate-50/80 transition-colors">
                <span className="truncate font-bold text-slate-900">{c.name}</span>
                <span>
                  <i className={cn("inline-flex items-center justify-center w-[74px] rounded-sm py-0.5 text-[10px] font-bold not-italic border text-center shrink-0", c.type === "Marketing" ? "bg-pink-50 text-pink-700 border-pink-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                    {c.type}
                  </i>
                </span>
                <span className="text-slate-600 font-bold">{c.audience}</span>
                <span>
                  <i className="inline-flex items-center justify-center w-[74px] rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 py-0.5 text-[10px] font-bold not-italic text-center shrink-0">
                    {c.status}
                  </i>
                </span>
                <span className="text-slate-500 text-[10.5px] font-semibold leading-tight">{c.date}</span>
              </div>
            ))}
          </div>
        </Box>

        <Box
          title="Message Templates"
          action={
            <button
              onClick={() => onOpenModal("create-template")}
              className="flex h-7 items-center gap-1 rounded-sm bg-emerald-600 hover:bg-emerald-700 px-2.5 text-[11px] font-bold text-white shadow-xs transition-all"
            >
              <Plus className="size-3.5" /> Add Template
            </button>
          }
        >
          <div className="px-3 py-1">
            <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr] gap-2 py-2 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100">
              <span>Template Name</span>
              <span>Category</span>
              <span>Language</span>
              <span>Status</span>
            </div>
            {messageTemplates.map((t) => (
              <div key={t.name} className="grid grid-cols-[1.8fr_1fr_1fr_1fr] gap-2 items-center border-b border-slate-50 py-2.5 text-xs hover:bg-slate-50/80 transition-colors">
                <span className="truncate font-bold text-slate-900">{t.name}</span>
                <span>
                  <i className={cn("inline-flex items-center justify-center w-[84px] rounded-sm py-0.5 text-[10px] font-bold not-italic border text-center shrink-0", t.category === "Marketing" ? "bg-pink-50 text-pink-700 border-pink-200" : t.category === "Utility" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200")}>
                    {t.category}
                  </i>
                </span>
                <span className="text-slate-500 font-semibold">{t.lang}</span>
                <span>
                  <i className="inline-flex items-center justify-center w-[74px] rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 py-0.5 text-[10px] font-bold not-italic text-center shrink-0">
                    {t.status}
                  </i>
                </span>
              </div>
            ))}
          </div>
        </Box>

        <Box title="Quick Actions">
          <div className="p-3 space-y-1.5">
            {[
              { icon: Send, label: "Create Campaign", modal: "create-campaign", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
              { icon: Mail, label: "Send Template Message", modal: "send-template", color: "text-blue-700 bg-blue-50 border-blue-200" },
              { icon: Edit3, label: "Manage Templates", tab: "Templates", color: "text-purple-700 bg-purple-50 border-purple-200" },
              { icon: UsersRound, label: "Import Contacts", modal: "import-contacts", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
              { icon: BarChart3, label: "View Reports", tab: "Analytics", color: "text-amber-700 bg-amber-50 border-amber-200" },
              { icon: Settings2, label: "Automation Rules", tab: "Automation", color: "text-teal-700 bg-teal-50 border-teal-200" },
              { icon: Settings2, label: "WhatsApp Settings", tab: "Settings", color: "text-slate-700 bg-slate-100 border-slate-200" },
            ].map((a, i) => (
              <button
                key={i}
                onClick={() => (a.modal ? onOpenModal(a.modal) : a.tab && onTabChange(a.tab))}
                className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-100/80 transition-all border border-transparent hover:border-slate-200 group"
              >
                <span className={cn("p-1.5 rounded-sm border transition-transform group-hover:scale-105", a.color)}>
                  <a.icon className="size-3.5" />
                </span>
                {a.label}
              </button>
            ))}
          </div>
        </Box>
      </div>

      {/* Row 4: Recent Conversations, Audience Growth, Integration Details */}
      <div className="grid min-h-[340px] grid-cols-1 lg:grid-cols-3 gap-3">
        <Box
          title="Recent Conversations"
          action={
            <button
              onClick={() => onTabChange("Conversations")}
              className="text-emerald-600 hover:text-emerald-700 text-xs font-bold hover:underline flex items-center gap-0.5 transition-all"
            >
              View All <ArrowUpRight className="size-3" />
            </button>
          }
        >
          <div className="px-3 py-1">
            <div className="grid grid-cols-[1.6fr_1.8fr_1fr_1fr] gap-2 py-2 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100">
              <span>Contact</span>
              <span>Last Message</span>
              <span>Time</span>
              <span>Status</span>
            </div>
            {conversations.map((c, i) => (
              <div key={i} className="grid grid-cols-[1.6fr_1.8fr_1fr_1fr] gap-2 items-center border-b border-slate-50 py-2.5 text-xs hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center gap-2 overflow-hidden pr-1">
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-sm text-xs font-bold shadow-xs", c.color)}>
                    {c.initial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{c.name}</p>
                    <p className="truncate text-[10px] text-slate-400 font-semibold">{c.phone}</p>
                  </div>
                </div>
                <span className="truncate text-slate-600 pr-1 font-semibold">{c.msg}</span>
                <span className="text-slate-400 text-[11px] font-semibold">{c.time}</span>
                <span>
                  <i className={cn("inline-flex items-center justify-center w-[64px] rounded-sm py-0.5 text-[10px] font-bold not-italic border text-center shrink-0", c.status === "Replied" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                    {c.status}
                  </i>
                </span>
              </div>
            ))}
          </div>
        </Box>

        <Box
          title="Audience Growth"
          action={
            <Select value={growthRange} onValueChange={setGrowthRange}>
              <SelectTrigger className="h-7 border-slate-200 text-xs px-2 bg-white rounded-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="flex h-full flex-col p-3.5 justify-between">
            <div className="h-[145px] w-full flex-none">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={audienceGrowthData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #E2E8F0" }} />
                  <Bar dataKey="val" fill="#10B981" radius={[4, 4, 0, 0]} barSize={12} isAnimationActive={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 p-1.5 rounded-sm bg-blue-50/60 border border-blue-100 min-w-0">
                <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-blue-600 text-white font-bold"><UsersRound className="size-3" /></span>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-500 font-bold uppercase truncate">Total</p>
                  <p className="flex items-baseline gap-1"><b className="text-xs text-slate-900 font-extrabold">3,842</b><span className="text-[9px] font-bold text-emerald-600">↑18%</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-sm bg-emerald-50/60 border border-emerald-100 min-w-0">
                <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-emerald-600 text-white font-bold"><UserCheck className="size-3" /></span>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-500 font-bold uppercase truncate">Active</p>
                  <p className="flex items-baseline gap-1"><b className="text-xs text-slate-900 font-extrabold">3,612</b><span className="text-[9px] font-bold text-emerald-600">↑20%</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-sm bg-rose-50/60 border border-rose-100 min-w-0">
                <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-rose-600 text-white font-bold"><UserX className="size-3" /></span>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-500 font-bold uppercase truncate">Blocked</p>
                  <p className="flex items-baseline gap-1"><b className="text-xs text-slate-900 font-extrabold">48</b><span className="text-[9px] font-bold text-rose-600">↓12%</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-sm bg-amber-50/60 border border-amber-100 min-w-0">
                <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-amber-600 text-white font-bold"><UserMinus className="size-3" /></span>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-500 font-bold uppercase truncate">Opt-out</p>
                  <p className="flex items-baseline gap-1"><b className="text-xs text-slate-900 font-extrabold">182</b><span className="text-[9px] font-bold text-emerald-600">↑5%</span></p>
                </div>
              </div>
            </div>
          </div>
        </Box>

        <Box
          title="Integration Details"
          action={
            <button
              onClick={() => onOpenModal("edit-integration")}
              className="text-emerald-600 hover:text-emerald-700 text-xs font-bold hover:underline flex items-center gap-1"
            >
              <Pencil className="size-3" /> Edit
            </button>
          }
        >
          <div className="flex h-full flex-col justify-between p-4 space-y-2">
            {[
              ["Provider", details.provider],
              ["Phone Number", details.phoneNumber],
              ["Business Name", details.businessName],
              ["WABA Status", details.wabaStatus],
              ["Quality Rating", details.qualityRating],
              ["Daily Limit", details.dailyLimit],
              ["Timezone", details.timezone],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-xs border-b border-slate-50 pb-1.5 last:border-0 last:pb-0">
                <span className="text-slate-500 font-semibold">{label}</span>
                {label === "WABA Status" || label === "Quality Rating" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                    <span className="size-1.5 rounded-sm bg-emerald-500 animate-pulse" />
                    {value}
                  </span>
                ) : (
                  <b className="text-slate-900 font-extrabold">{value}</b>
                )}
              </div>
            ))}
          </div>
        </Box>
      </div>
    </div>
  );
}
