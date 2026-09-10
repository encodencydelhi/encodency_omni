"use client";

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
  CalendarDays,
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
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// --- Mock Data ---

const messageStats = [
  { label: "Total Messages", value: "12,482", trend: "↑ 28%", icon: MonitorPlay, color: "green", note: "vs last month" },
  { label: "Messages Sent", value: "11,230", trend: "↑ 32%", icon: SendHorizontal, color: "blue", note: "" },
  { label: "Delivered", value: "10,842", trend: "96.5%", icon: CheckCircle2, color: "green", note: "" },
  { label: "Read", value: "8,421", trend: "77.6%", icon: Eye, color: "blue", note: "" },
  { label: "Replied", value: "2,845", trend: "26.2%", icon: CornerUpLeft, color: "purple", note: "" },
  { label: "Failed", value: "388", trend: "3.5%", icon: XCircle, color: "red", note: "" },
];

const performanceData = [
  { d: "Mar 15", sent: 300, delivered: 280, read: 200, replied: 80 },
  { d: "Mar 20", sent: 500, delivered: 480, read: 350, replied: 150 },
  { d: "Mar 25", sent: 450, delivered: 420, read: 300, replied: 120 },
  { d: "Mar 30", sent: 800, delivered: 760, read: 550, replied: 200 },
  { d: "Apr 5", sent: 900, delivered: 880, read: 650, replied: 250 },
  { d: "Apr 10", sent: 1100, delivered: 1050, read: 800, replied: 300 },
  { d: "Apr 14", sent: 1200, delivered: 1150, read: 900, replied: 350 },
];

const breakdownData = [
  { name: "Delivered", value: 10842, color: "#00A66A" },
  { name: "Read", value: 8421, color: "#3186F3" },
  { name: "Replied", value: 2845, color: "#805AD5" },
  { name: "Failed", value: 388, color: "#EA111B" },
];

const topCampaigns = [
  { name: "World Water Day 2025", sent: 2480, delivered: 2410, read: 1980, replied: 620 },
  { name: "Volunteer Drive", sent: 1920, delivered: 1870, read: 1420, replied: 480 },
  { name: "Event Reminder", sent: 1560, delivered: 1512, read: 1120, replied: 320 },
  { name: "Donation Appeal", sent: 1240, delivered: 1190, read: 980, replied: 410 },
  { name: "Community Updates", sent: 980, delivered: 950, read: 760, replied: 210 },
];

const recentCampaigns = [
  { name: "Earth Day Awareness", type: "Marketing", audience: "2,480", status: "Completed", date: "Apr 14, 2025\n10:00 AM" },
  { name: "Volunteer Recruitment", type: "Marketing", audience: "1,920", status: "Completed", date: "Apr 12, 2025\n02:30 PM" },
  { name: "Event Reminder", type: "Utility", audience: "1,560", status: "Completed", date: "Apr 10, 2025\n11:00 AM" },
  { name: "Donation Appeal", type: "Marketing", audience: "1,240", status: "Completed", date: "Apr 8, 2025\n05:00 PM" },
  { name: "Thank You Message", type: "Utility", audience: "980", status: "Completed", date: "Apr 5, 2025\n09:00 AM" },
];

const messageTemplates = [
  { name: "event_reminder", category: "Utility", lang: "English", status: "Approved" },
  { name: "volunteer_invite", category: "Marketing", lang: "English", status: "Approved" },
  { name: "donation_thanks", category: "Utility", lang: "English", status: "Approved" },
  { name: "campaign_update", category: "Marketing", lang: "English", status: "Approved" },
  { name: "otp_verification", category: "Authentication", lang: "English", status: "Approved" },
];

const conversations = [
  { initial: "R", name: "Rahul Mehta", phone: "+91 98765 43210", msg: "Thank you for the information 🙏", time: "10:24 AM", status: "Replied", color: "bg-[#EAF2FF] text-[#286CB7]" },
  { initial: "P", name: "Priya Sharma", phone: "+91 98765 43211", msg: "Can you share the event location?", time: "09:15 AM", status: "Replied", color: "bg-[#DDF8E9] text-[#16A16C]" },
  { initial: "A", name: "Amit Singh", phone: "+91 98765 43212", msg: "I would like to volunteer.", time: "Yesterday", status: "Open", color: "bg-[#FFF0DC] text-[#F28C28]" },
  { initial: "N", name: "Neha Gupta", phone: "+91 98765 43213", msg: "Please send me the brochure.", time: "Yesterday", status: "Replied", color: "bg-[#E7F0FF] text-[#3478DB]" },
];

const audienceGrowth = [
  { d: "Mar 15", val: 320 }, { d: "Mar 16", val: 380 }, { d: "Mar 17", val: 410 },
  { d: "Mar 18", val: 450 }, { d: "Mar 19", val: 490 }, { d: "Mar 20", val: 510 },
  { d: "Mar 21", val: 550 }, { d: "Mar 22", val: 580 }, { d: "Mar 23", val: 620 },
  { d: "Mar 24", val: 680 }, { d: "Mar 25", val: 720 }, { d: "Mar 26", val: 750 },
  { d: "Mar 27", val: 780 }, { d: "Mar 28", val: 820 }, { d: "Mar 29", val: 860 },
  { d: "Mar 30", val: 890 }, { d: "Mar 31", val: 920 }, { d: "Apr 1", val: 950 },
  { d: "Apr 2", val: 980 }, { d: "Apr 3", val: 1020 }, { d: "Apr 4", val: 1050 },
  { d: "Apr 5", val: 1100 }, { d: "Apr 6", val: 1150 }, { d: "Apr 7", val: 1200 },
  { d: "Apr 8", val: 1250 }, { d: "Apr 9", val: 1300 }, { d: "Apr 10", val: 1350 },
  { d: "Apr 11", val: 1400 }, { d: "Apr 12", val: 1450 }, { d: "Apr 13", val: 1500 },
  { d: "Apr 14", val: 1550 },
];

// --- Components ---

function Box({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-md border border-[#DDE4ED] bg-white shadow-sm flex flex-col", className)}>
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-[#E8EDF3] px-3">
        <h2 className="text-[12px] font-bold text-[#172044]">{title}</h2>
        {action && (
          <div className="text-[9px] font-semibold text-[#71809D] flex items-center gap-1">
            {action}
          </div>
        )}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">{children}</div>
    </section>
  );
}

export function WhatsappChannelPage() {
  return (
    <div className="space-y-3 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-[#DDE4ED] bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded bg-[#25D366] text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-7"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.662-2.062-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          </span>
          <div>
            <h1 className="text-[20px] font-bold text-[#172044]">WhatsApp</h1>
            <p className="text-[10px] text-[#71809D]">Manage your WhatsApp Business, campaigns, templates and customer conversations.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 border-r border-[#E8EDF3] pr-3 mr-1">
            <div className="text-right">
              <p className="text-[10px] font-bold text-[#38444D]">WhatsApp Business API</p>
              <p className="flex items-center justify-end gap-1 text-[9px] text-[#71809D]"><i className="size-1.5 rounded-full bg-[#25D366]" /> Connected<span className="ml-1 opacity-60">Last sync: 5 mins ago</span></p>
            </div>
          </div>
          <button className="flex h-9 items-center gap-1.5 rounded border border-[#DDE4ED] bg-white px-3 text-[11px] font-semibold text-[#38444D] shadow-sm hover:bg-[#FAFBFC]">
            <Send className="size-3.5" /> 
            Send Test
          </button>
          <button className="flex h-9 items-center gap-2.5 rounded border border-[#DDE4ED] bg-white px-3 text-[11px] font-semibold text-[#38444D] shadow-sm hover:bg-[#FAFBFC]">
            <CalendarDays className="size-4 text-[#182A58]" />
            <div className="text-left">
              <span className="block leading-tight">Last 30 days</span>
              <span className="block mt-0.5 text-[9px] font-normal text-[#71809D]">Mar 15, 2025 – Apr 14, 2025</span>
            </div>
            <ChevronDown className="size-3.5" />
          </button>
          <button className="flex h-9 items-center gap-2 rounded border border-[#DDE4ED] bg-white px-3.5 text-[11px] font-semibold text-[#172044] shadow-sm hover:bg-[#FAFBFC]">
            <Download className="size-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[#DDE4ED] px-2">
        {["Overview", "Campaigns", "Templates", "Conversations", "Contacts", "Automation", "Analytics", "Settings"].map((tab, i) => (
          <button key={tab} className={cn("pb-2 text-[10px] font-bold", i === 0 ? "border-b-2 border-[#172044] text-[#172044]" : "text-[#71809D] hover:text-[#38444D]")}>{tab}</button>
        ))}
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-6 gap-2">
        {messageStats.map((stat, i) => {
          const c: Record<string, string> = {
            green: "bg-[#EAF5EF] text-[#25D366]",
            blue: "bg-[#EAF2FF] text-[#3186F3]",
            purple: "bg-[#F2EAFF] text-[#805AD5]",
            red: "bg-[#FFE8EA] text-[#EA111B]",
          };
          return (
            <div key={i} className="flex min-h-[70px] items-center gap-3 rounded-lg border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_3px_rgb(47_44_42/0.035)]">
              <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-full", c[stat.color])}><stat.icon className="size-[18px]" /></span>
              <div className="min-w-0">
                <p className="truncate text-[9.5px] font-bold text-[#52617D]">{stat.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <b className="text-[20px] font-bold tracking-[-0.02em] text-[#142044]">{stat.value}</b>
                  <span className={cn("text-[9px] font-bold whitespace-nowrap", stat.trend.includes("↑") || stat.trend.includes("9") ? "text-[#00A66A]" : "text-[#EA111B]")}>{stat.trend}</span>
                </div>
                {stat.note && <p className="text-[8px] text-[#71809D]">{stat.note}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2 */}
      <div className="grid h-[240px] grid-cols-[1.5fr_1fr_1.2fr] gap-2">
        <Box title="Message Performance" action={
          <button className="flex h-6 items-center gap-1 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5 text-[8.5px] font-semibold text-[#52617D]">Last 30 days <ChevronDown className="size-2.5"/></button>
        }>
          <div className="flex h-full flex-col px-3 py-1">
            <div className="mb-2 flex shrink-0 gap-4 text-[9px] font-semibold text-[#52617D]">
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#00A66A]"/>Sent</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#3186F3]"/>Delivered</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#805AD5]"/>Read</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#EAB308]"/>Replied</span>
            </div>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer>
                <LineChart data={performanceData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#E8EDF3" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 10,
                      borderRadius: 6,
                      border: "1px solid #DDE4ED",
                      padding: "4px 8px",
                    }}
                    labelStyle={{ fontSize: 10, fontWeight: 700, color: "#172044" }}
                    itemStyle={{ fontSize: 10, padding: 0 }}
                  />
                  <Line type="monotone" dataKey="sent" stroke="#00A66A" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="delivered" stroke="#3186F3" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="read" stroke="#805AD5" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="replied" stroke="#EAB308" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Box>

        <Box title="Message Breakdown">
          <div className="flex h-full items-center px-4">
            <div className="relative size-[130px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={breakdownData} dataKey="value" innerRadius={45} outerRadius={65} strokeWidth={0}>
                    {breakdownData.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <b className="block text-[18px] text-[#172044]">11,230</b>
                  <small className="text-[8px] text-[#71809D]">Messages Sent</small>
                </span>
              </div>
            </div>
            <div className="ml-4 flex-1 space-y-2.5">
              {breakdownData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-[9px] font-semibold">
                  <span className="flex items-center gap-1.5 text-[#52617D]"><i className="size-2 rounded-full" style={{ backgroundColor: d.color }}/>{d.name}</span>
                  <div className="text-right">
                    <span className="block text-[#172044]">{d.value.toLocaleString()}</span>
                    <span className={cn("block text-[7.5px]", i === 3 ? "text-[#EA111B]" : "text-[#00A66A]")}>{["96.5%", "77.6%", "26.2%", "3.5%"][i]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Box>

        <Box title="Top Campaigns" action={<span className="text-[#EB0711] cursor-pointer">View All →</span>}>
          <div className="px-2">
            <div className="grid grid-cols-[1.5fr_.5fr_.6fr_.5fr_.5fr] py-1.5 text-[8.5px] font-bold text-[#71809D]">
              <span>Campaign</span>
              <span className="text-right">Sent</span>
              <span className="text-right">Delivered</span>
              <span className="text-right">Read</span>
              <span className="text-right">Replied</span>
            </div>
            {topCampaigns.map((c) => (
              <div key={c.name} className="grid grid-cols-[1.5fr_.5fr_.6fr_.5fr_.5fr] border-t border-[#EDF1F5] py-2 text-[9px]">
                <span className="truncate font-semibold text-[#172044]">{c.name}</span>
                <span className="text-right text-[#52617D]">{c.sent}</span>
                <span className="text-right text-[#52617D]">{c.delivered}</span>
                <span className="text-right text-[#52617D]">{c.read}</span>
                <span className="text-right text-[#52617D]">{c.replied}</span>
              </div>
            ))}
          </div>
        </Box>
      </div>

      {/* Row 3 */}
      <div className="grid h-[240px] grid-cols-[1.25fr_1.1fr_.55fr] gap-2">
        <Box title="Recent Campaigns" action={<span className="text-[#EB0711] cursor-pointer">View All →</span>}>
          <div className="px-2">
            <div className="grid grid-cols-[1.4fr_.6fr_.6fr_.6fr_.8fr] py-1.5 text-[8.5px] font-bold text-[#71809D]">
              <span>Campaign</span>
              <span>Type</span>
              <span>Audience</span>
              <span>Status</span>
              <span>Sent On</span>
            </div>
            {recentCampaigns.map((c) => (
              <div key={c.name} className="grid grid-cols-[1.4fr_.6fr_.6fr_.6fr_.8fr] items-center border-t border-[#EDF1F5] py-1.5 text-[9px]">
                <span className="truncate font-semibold text-[#172044]">{c.name}</span>
                <span><i className={cn("rounded px-1.5 py-0.5 text-[8px] font-bold", c.type === "Marketing" ? "bg-[#FCE7F3] text-[#BE185D]" : "bg-[#DCFCE7] text-[#15803D]")}>{c.type}</i></span>
                <span className="text-[#52617D]">{c.audience}</span>
                <span><i className="rounded bg-[#DCFCE7] px-1.5 py-0.5 text-[8px] font-bold text-[#15803D]">{c.status}</i></span>
                <span className="whitespace-pre-line text-[#71809D] leading-[1.2]">{c.date}</span>
              </div>
            ))}
          </div>
        </Box>

        <Box title="Message Templates" action={<button className="flex h-6 items-center gap-1 rounded bg-[#EA111B] px-2 text-[8.5px] font-bold text-white"><Plus className="size-3"/> Add Template</button>}>
          <div className="px-2">
            <div className="grid grid-cols-[1.2fr_.7fr_.5fr_.5fr] py-1.5 text-[8.5px] font-bold text-[#71809D]">
              <span>Template Name</span>
              <span>Category</span>
              <span>Language</span>
              <span>Status</span>
            </div>
            {messageTemplates.map((t) => (
              <div key={t.name} className="grid grid-cols-[1.2fr_.7fr_.5fr_.5fr] items-center border-t border-[#EDF1F5] py-2 text-[9px]">
                <span className="truncate font-semibold text-[#172044]">{t.name}</span>
                <span><i className={cn("rounded px-1.5 py-0.5 text-[8px] font-bold", t.category === "Marketing" ? "bg-[#FCE7F3] text-[#BE185D]" : t.category === "Utility" ? "bg-[#DBEAFE] text-[#1D4ED8]" : "bg-[#F3E8FF] text-[#7E22CE]")}>{t.category}</i></span>
                <span className="text-[#52617D]">{t.lang}</span>
                <span><i className="rounded bg-[#DCFCE7] px-1.5 py-0.5 text-[8px] font-bold text-[#15803D]">{t.status}</i></span>
              </div>
            ))}
          </div>
        </Box>

        <Box title="Quick Actions">
          <div className="p-1.5">
            {[
              { icon: Send, label: "Create Campaign" },
              { icon: Mail, label: "Send Template Message" },
              { icon: Edit3, label: "Manage Templates" },
              { icon: UsersRound, label: "Import Contacts" },
              { icon: BarChart3, label: "View Reports" },
              { icon: Settings2, label: "Automation Rules" },
              { icon: Settings2, label: "WhatsApp Settings" },
            ].map((a, i) => (
              <button key={i} className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[9.5px] font-bold text-[#172044] hover:bg-[#F8FAFC]">
                <a.icon className="size-3.5 text-[#3186F3]" />
                {a.label}
              </button>
            ))}
          </div>
        </Box>
      </div>

      {/* Row 4 */}
      <div className="grid h-[240px] grid-cols-[1.2fr_1fr_.7fr] gap-2">
        <Box title="Recent Conversations" action={<span className="text-[#EB0711] cursor-pointer">View All →</span>}>
          <div className="px-2">
            <div className="grid grid-cols-[1.5fr_2fr_.5fr_.5fr] py-1.5 text-[8.5px] font-bold text-[#71809D]">
              <span>Contact</span>
              <span>Last Message</span>
              <span>Time</span>
              <span>Status</span>
            </div>
            {conversations.map((c, i) => (
              <div key={i} className="grid grid-cols-[1.5fr_2fr_.5fr_.5fr] items-center border-t border-[#EDF1F5] py-2 text-[9px]">
                <div className="flex items-center gap-2 overflow-hidden pr-2">
                  <span className={cn("grid size-[26px] shrink-0 place-items-center rounded-full font-bold", c.color)}>{c.initial}</span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[#172044]">{c.name}</p>
                    <p className="truncate text-[8px] text-[#71809D]">{c.phone}</p>
                  </div>
                </div>
                <span className="truncate text-[#38444D] pr-2">{c.msg}</span>
                <span className="text-[#71809D]">{c.time}</span>
                <span><i className={cn("rounded px-1.5 py-0.5 text-[8px] font-bold", c.status === "Replied" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF9C3] text-[#A16207]")}>{c.status}</i></span>
              </div>
            ))}
          </div>
        </Box>

        <Box title="Audience Growth" action={<button className="flex items-center gap-1 text-[#38444D] text-[9px] font-bold border rounded px-1.5 py-0.5"><ChevronDown className="size-2.5"/> Last 30 days</button>}>
          <div className="flex h-full flex-col p-3">
            <div className="min-h-0 flex-1">
              <ResponsiveContainer>
                <BarChart data={audienceGrowth} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#E8EDF3" vertical={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 10,
                      borderRadius: 6,
                      border: "1px solid #DDE4ED",
                      padding: "4px 8px",
                    }}
                    labelStyle={{ fontSize: 10, fontWeight: 700, color: "#172044" }}
                    itemStyle={{ fontSize: 10, padding: 0 }}
                  />
                  <Bar dataKey="val" fill="#00A66A" radius={[2, 2, 0, 0]} barSize={4} isAnimationActive={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} ticks={["Mar 15", "Mar 20", "Mar 25", "Mar 30", "Apr 5", "Apr 10", "Apr 14"]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-auto grid grid-cols-3 gap-2">
              <div><p className="text-[9px] text-[#71809D]">Total Contacts</p><p className="flex items-baseline gap-1.5"><b className="text-[18px] text-[#172044]">3,842</b><span className="text-[9px] font-bold text-[#00A66A]">↑ 18%</span></p></div>
              <div><p className="text-[9px] text-[#71809D]">New Contacts</p><p className="flex items-baseline gap-1.5"><b className="text-[18px] text-[#172044]">624</b><span className="text-[9px] font-bold text-[#00A66A]">↑ 32%</span></p></div>
              <div><p className="text-[9px] text-[#71809D]">Blocked</p><p className="flex items-baseline gap-1.5"><b className="text-[18px] text-[#172044]">48</b><span className="text-[9px] font-bold text-[#EA111B]">↓ 12%</span></p></div>
            </div>
          </div>
        </Box>

        <Box title="Integration Details" action={<span className="text-[#3186F3] cursor-pointer">Edit</span>}>
          <div className="flex h-full flex-col justify-between p-3">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#71809D]">Provider</span>
              <b className="text-[#172044]">AiSensy (WABA)</b>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#71809D]">Phone Number</span>
              <b className="text-[#172044]">+91 98765 43210</b>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#71809D]">Business Name</span>
              <b className="text-[#172044]">Namo Gange Trust</b>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#71809D]">WABA Status</span>
              <b className="rounded bg-[#E5F7EF] px-1.5 py-0.5 text-[8.5px] text-[#078359]">Active</b>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#71809D]">Quality Rating</span>
              <b className="rounded bg-[#E5F7EF] px-1.5 py-0.5 text-[8.5px] text-[#078359]">High</b>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#71809D]">Daily Limit</span>
              <b className="text-[#172044]">10,000 messages</b>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[#71809D]">Timezone</span>
              <b className="text-[#172044]">Asia/Kolkata</b>
            </div>
          </div>
        </Box>
      </div>
    </div>
  );
}
