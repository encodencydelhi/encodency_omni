"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone, Play, CalendarDays, CheckCircle2, Users, Database,
  Search, SlidersHorizontal, ArrowDownUp, Plus, MoreVertical,
  ArrowUpRight, Copy, Link2, BarChart3, ChevronDown,
  ChevronLeft, ChevronRight, Target, Leaf, HandHeart, Heart
} from "lucide-react";
const stats = [
  { icon: Megaphone, title: "Total Campaigns", value: "24", trend: "33%", note: "+6 new this month", tone: "red" },
  { icon: Play, title: "Active Campaigns", value: "8", trend: "14%", note: "33% of total", tone: "green" },
  { icon: CalendarDays, title: "Scheduled", value: "6", trend: "20%", note: "25% of total", tone: "purple" },
  { icon: CheckCircle2, title: "Completed", value: "7", trend: "40%", note: "29% of total", tone: "green" },
  { icon: Users, title: "Total Leads", value: "1,248", trend: "18%", note: "+186 this month", tone: "blue" },
  { icon: Database, title: "Total Spend", value: "₹48,250", trend: "8%", note: "−8% vs last month", tone: "orange", down: true },
];

const campaigns = [
  {
    id: "moksha-awareness",
    title: "Clean Ganga Awareness", desc: "A cleaner Ganga for a healthier India",
    project: "Moksha Sewa", channels: [FacebookIcon, InstagramIcon, LinkedinIcon], extra: "+2",
    status: "Active", statusTone: "active", dates: ["Mar 15, 2025", "Apr 30, 2025"],
    leads: "248", leadGrowth: "24%", spend: "₹12,400", conversions: "42", conversionGrowth: "18%",
    score: "78", scoreTone: "green", updated: ["2 hours ago", "by Ankit Verma"]
  },
  {
    id: "volunteer-drive",
    title: "Volunteer Drive", desc: "Be the change. Join the movement.",
    project: "Namo Gange Trust", channels: [InstagramIcon, YoutubeIcon], extra: "+1",
    status: "Scheduled", statusTone: "scheduled", dates: ["Apr 20, 2025", "May 10, 2025"],
    leads: "186", leadGrowth: "12%", spend: "₹8,600", conversions: "28", conversionGrowth: "8%",
    score: "65", scoreTone: "yellow", updated: ["5 hours ago", "by Priya Sharma"]
  },
  {
    id: "community-impact",
    title: "Save Rivers Save Lives", desc: "Healthy rivers. Brighter tomorrow.",
    project: "Ganga Clean Drive", channels: [FacebookIcon, InstagramIcon, GoogleBusinessIcon, YoutubeIcon], extra: "",
    status: "Active", statusTone: "active", dates: ["Mar 1, 2025", "Apr 25, 2025"],
    leads: "320", leadGrowth: "36%", spend: "₹15,200", conversions: "56", conversionGrowth: "28%",
    score: "82", scoreTone: "green", updated: ["1 day ago", "by Neha Verma"]
  },
  {
    id: "donate-for-change",
    title: "Earth Day Sustainability", desc: "Small actions. A cleaner tomorrow.",
    project: "Bharat Organic", channels: [LinkedinIcon, InstagramIcon, GoogleBusinessIcon], extra: "+1",
    status: "Completed", statusTone: "completed", dates: ["Apr 1, 2025", "Apr 22, 2025"],
    leads: "275", leadGrowth: "48%", spend: "₹6,800", conversions: "62", conversionGrowth: "42%",
    score: "88", scoreTone: "green", updated: ["2 days ago", "by Rohan Mehta"]
  },
  {
    id: "donation-for-change",
    title: "Donation for Change", desc: "Support a Cleaner, Greener India.",
    project: "Namo Gange Trust", channels: [FacebookIcon, YoutubeIcon], extra: "",
    status: "Draft", statusTone: "draft", dates: ["Apr 25, 2025", "May 15, 2025"],
    leads: "—", leadGrowth: "", spend: "—", conversions: "—", conversionGrowth: "",
    score: "—", scoreTone: "empty", updated: ["3 days ago", "by Ankit Verma"]
  }
];

const topCampaigns = [
  ["Save Rivers Save Lives", "320 leads | 56 conversions", "82", "green"],
  ["Earth Day Sustainability", "275 leads | 62 conversions", "88", "green"],
  ["Clean Ganga Awareness", "248 leads | 42 conversions", "78", "green"],
  ["Volunteer Drive", "186 leads | 28 conversions", "65", "yellow"],
  ["Donation for Change", "48 leads | 12 conversions", "45", "red"]
];

const milestones = [
  ["Volunteer Drive Launch", "Apr 20, 2025 · 3 days left", "red"],
  ["Donation for Change", "Apr 25, 2025 · 8 days left", "red"],
  ["World Environment Day", "Jun 5, 2025 · 49 days left", "green"],
  ["Monsoon Clean-Up Drive", "Jun 15, 2025 · 59 days left", "green"]
];

const channelNames = [
  ["Facebook", 32, "bg-[#398be8]"],
  ["Instagram", 24, "bg-[#e983b0]"],
  ["LinkedIn", 16, "bg-[#547fe8]"],
  ["Google Business", 12, "bg-[#64a7dd]"],
  ["WhatsApp", 10, "bg-[#1cb17c]"],
  ["YouTube", 6, "bg-[#e3262e]"],
] as const;

function FacebookIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.099 4.388 23.094 10.125 24v-8.438H7.078v-3.49h3.047V9.413c0-3.022 1.792-4.693 4.533-4.693 1.313 0 2.686.235 2.686.235v2.969H15.83c-1.491 0-1.956.927-1.956 1.878v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.099 24 12.073Z"/>
      <path fill="#fff" d="M16.671 15.562l.532-3.49h-3.328V9.803c0-.953.465-1.879 1.956-1.879h1.514V4.955s-1.373-.235-2.686-.235c-2.741 0-4.533 1.671-4.533 4.693v2.659H7.078v3.49h3.047V24a12.1 12.1 0 003.75 0v-8.438h2.796Z"/>
    </svg>
  );
}

function InstagramIcon({ size = 22 }) {
  const id = React.useId();
  const gradientId = `instagram-gradient-${id.replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F58529"/>
          <stop offset="35%" stopColor="#DD2A7B"/>
          <stop offset="70%" stopColor="#8134AF"/>
          <stop offset="100%" stopColor="#515BD4"/>
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${gradientId})`}/>
      <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="2"/>
      <circle cx="12" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="2"/>
      <circle cx="17.5" cy="6.5" r="1.15" fill="#fff"/>
    </svg>
  );
}

function LinkedinIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#0A66C2"/>
      <path fill="#fff" d="M6.5 9H9v9H6.5V9ZM7.75 5.5A1.5 1.5 0 119.25 7 1.5 1.5 0 017.75 5.5ZM11 9h2.4v1.2h.1c.33-.63 1.14-1.3 2.35-1.3 2.5 0 2.95 1.64 2.95 3.77V18h-2.5v-4.4c0-1.05-.02-2.4-1.46-2.4-1.46 0-1.68 1.14-1.68 2.32V18H11V9Z"/>
    </svg>
  );
}

export function WhatsappIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#25D366"/>
      <path
        fill="#fff"
        d="M12 3.5A8.5 8.5 0 0 0 4.07 15.8L3.2 20.5l4.84-1.27A8.5 8.5 0 1 0 12 3.5Zm4.96 12.07c-.12.34-.7 1.02-1.18 1.17-.33.1-.76.08-2.15-.42-1.82-.66-3.17-2.44-3.27-2.56-.11-.12-1.65-2.2-1.65-4.19 0-1.99 1.05-2.97 1.42-3.36.3-.3.7-.38 1-.38h.06c.19 0 .35.02.51.02.38 0 .5.1.66.4.23.42.78 1.75.85 1.88.07.14.14.3.04.47-.08.18-.13.3-.26.46-.12.15-.27.36-.38.49-.13.14-.27.3-.12.57.15.27.68 1.1 1.46 1.77.98.86 1.8 1.11 2.08 1.25.3.15.47.13.64-.08.2-.24.85-.97 1.08-1.31.23-.35.46-.29.79-.17.33.12 2.03 1 2.39 1.22.35.23.58.28.76.28.18 0 .42-.04.68-.2.24-.14 1.47-.86 1.68-1.62.2-.77.2-1.42.14-1.55Z"
      />
    </svg>
  );
}

function YoutubeIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#FF0000"/>
      <path fill="#fff" d="M10 8.5L16 12L10 15.5V8.5Z"/>
    </svg>
  );
}

function GoogleBusinessIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#fff" stroke="#E5E7EB"/>
      <path fill="#4285F4" d="M12 5a7 7 0 106.9 8h-6.9v3h3.9A4 4 0 1112 8a3.8 3.8 0 012.7 1.1l2.2-2.2A7 7 0 0012 5Z"/>
    </svg>
  );
}

function ChannelIcon({ Icon: IconComponent, size = 22 }: { Icon: React.ComponentType<{ size?: number }>; size?: number }) {
  return (
    <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center">
      <IconComponent size={size} />
    </span>
  );
}

function SectionHeader({ title, action = "View all" }: { title: string; action?: string }) {
  return (
    <div className="flex h-10 items-start justify-between px-3 pt-2.5">
      <h2 className="m-0 text-[11px] font-[750] leading-[1.2] text-[#17223d]">{title}</h2>
      <button className="flex items-center gap-[3px] border-0 bg-transparent p-0 text-[9px] font-bold text-[#df2832]">
        {action}<ArrowUpRight size={11} />
      </button>
    </div>
  );
}

function StatCard({ item }: { item: { icon: React.ComponentType<{ size?: number }>; title: string; value: string; trend: string; note: string; tone: string; down?: boolean } }) {
  const Icon = item.icon;
  const iconTone = {
    red: "bg-[#fff0f1] text-[#e32937]",
    green: "bg-[#e4f9ef] text-[#16a16c]",
    purple: "bg-[#f1eaff] text-[#8054d5]",
    blue: "bg-[#e9f3ff] text-[#347fd3]",
    orange: "bg-[#fff3e1] text-[#d99018]"
  }[item.tone];

  return (
    <div className="flex h-[82px] items-center gap-3 rounded-[7px] border border-[#e6eaf0] bg-white px-[13px] py-3 shadow-[0_2px_8px_rgba(25,39,65,.025)]">
      <div className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full ${iconTone}`}>
        <Icon size={18} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-[9px] font-semibold text-[#536078]">{item.title}</span>
        <div className="mt-0.5 flex items-baseline gap-[5px]">
          <strong className="text-[20px] leading-none tracking-[-.4px] text-[#13203e]">{item.value}</strong>
          <em className={`text-[9px] font-bold not-italic ${item.down ? "text-[#df3440]" : "text-[#13a16b]"}`}>
            {item.down ? "↓" : "↑"} {item.trend}
          </em>
        </div>
        <small className="mt-1 whitespace-nowrap text-[9px] text-[#8b95a6]">{item.note}</small>
      </div>
    </div>
  );
}

function PerformanceChart() {
  const redPoints = [[0,92],[36,68],[72,80],[108,49],[144,59],[180,43],[216,52],[252,46],[288,27],[324,33],[360,36],[396,23],[432,15],[468,19],[504,8],[540,14],[578,5],[620,1]];
  return (
    <div className="relative h-[136px] px-3 pb-0 pl-[34px]">
      <div className="absolute left-[11px] top-0.5 flex h-[105px] flex-col justify-between text-[9px] text-[#8a94a5]">
        <span>400</span><span>300</span><span>200</span><span>100</span><span>0</span>
      </div>
      <svg viewBox="0 0 620 155" preserveAspectRatio="none" className="block h-[111px] w-full">
        {[14,49,84,119,154].map(y => <line key={y} x1="0" y1={y} x2="620" y2={y} stroke="#eef1f5" strokeWidth="1" />)}
        {[0,104,208,312,416,520,620].map(x => <line key={x} x1={x} y1="0" x2={x} y2="154" stroke="#f3f5f8" strokeWidth="1" />)}
        <polyline fill="none" stroke="#e4252e" strokeWidth="2.1" points="0,92 36,68 72,80 108,49 144,59 180,43 216,52 252,46 288,27 324,33 360,36 396,23 432,15 468,19 504,8 540,14 578,5 620,1"/>
        <polyline fill="none" stroke="#3389e7" strokeWidth="2" points="0,118 36,108 72,111 108,103 144,108 180,96 216,99 252,94 288,87 324,79 360,91 396,82 432,76 468,83 504,71 540,66 578,58 620,51"/>
        <polyline fill="none" stroke="#e887ae" strokeWidth="2" points="0,105 36,96 72,100 108,89 144,94 180,82 216,86 252,77 288,68 324,71 360,67 396,62 432,55 468,59 504,47 540,45 578,35 620,28"/>
        {redPoints.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.5" fill="#e4252e"/>)}
      </svg>
      <div className="flex justify-between px-0.5 text-[9px] text-[#8a94a5]">
        <span>Mar 15</span><span>Mar 22</span><span>Mar 29</span><span>Apr 5</span><span>Apr 12</span><span>Apr 19</span>
      </div>
    </div>
  );
}

function CampaignThumb({ index }: { index: number }) {
  const themes = [
    "bg-gradient-to-br from-[#1a6da0] to-[#5ab3d9]",   // Clean Ganga - water blue
    "bg-gradient-to-br from-[#c87a3a] to-[#e8b87a]",   // Volunteer Drive - warm orange
    "bg-gradient-to-br from-[#2d7a4f] to-[#6aba85]",   // Save Rivers - nature green
    "bg-gradient-to-br from-[#4a7a3c] to-[#8fc072]",   // Earth Day - earth green
    "bg-gradient-to-br from-[#9e3a3a] to-[#d98a8a]",   // Donation - warm red
  ];
  return (
    <div className={`grid h-9 w-[45px] shrink-0 place-items-center overflow-hidden rounded-[5px] text-white ${themes[index] || themes[0]}`}>
      {index === 0 ? <span className="text-[9px] font-extrabold leading-[1.05]">CLEAN<br/>GANGA</span> :
       index === 1 ? <HandHeart size={19}/> :
       index === 2 ? <span className="text-[9px] font-extrabold leading-[1.05]">RIVERS<br/>LIVES</span> :
       index === 3 ? <Leaf size={19}/> : <Heart size={18}/>}
    </div>
  );
}

export function CampaignsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full overflow-auto bg-[#f6f8fb] font-sans text-[#13203e]">
      <div className="mx-auto w-full max-w-[1500px]">
        {/* Header */}
        <header className="mb-2.5 grid grid-cols-1 items-center gap-3 lg:h-16 lg:grid-cols-[minmax(0,1fr)_580px]">
          <div>
            <div className="mb-0.5 flex items-center gap-2 text-[10px] text-[#758198]">
              <span>Dashboard</span><ChevronRight size={10}/><b className="text-[#26314a]">Campaigns</b>
            </div>
            <h1 className="m-0 text-[24px] font-[780] leading-[1.05] tracking-[-.7px]">Campaigns</h1>
            <p className="mt-[5px] text-[11px] text-[#718097]">Plan, manage and track multi-channel marketing campaigns.</p>
          </div>

          <div className="relative flex h-16 items-center justify-between overflow-hidden rounded-[7px] border border-[#e8ebf1] bg-gradient-to-r from-white via-white to-[#fff7f7] px-[18px] lg:block lg:flex">
            <div className="relative z-10 flex h-full flex-col justify-center">
              <b className="block text-[11px]">Turn Campaign Ideas Into Impact</b>
              <span className="text-[9px] text-[#7b8598]">Reach more people. Drive action. Create a cleaner, greener tomorrow.</span>
              <div className="mt-[7px] h-[3px] w-12 rounded bg-[#df2029]"/>
            </div>
            <Target className="relative z-10 text-[#e42b34]" size={62} strokeWidth={1.3}/>
            <div className="absolute inset-y-0 right-0 w-[55%] bg-[radial-gradient(circle_at_78%_38%,rgba(227,30,39,.13)_0_17px,transparent_18px),radial-gradient(circle_at_89%_58%,rgba(227,30,39,.08)_0_28px,transparent_29px)]"/>
          </div>
        </header>

        {/* Stats */}
        <section className="mb-2.5 grid grid-cols-2 gap-[9px] lg:grid-cols-6">
          {stats.map(item => <StatCard key={item.title} item={item}/>)}
        </section>

        {/* Tabs / toolbar */}
        <section className="flex min-h-[42px] items-center gap-5 rounded-t-[7px] border border-[#e5e9ef] bg-white px-3.5 lg:gap-7">
          {["All Campaigns (24)","Active (8)","Scheduled (6)","Completed (7)","Draft (2)","Archived (1)"].map((tab,i) => (
            <button key={tab} className={`relative h-[42px] shrink-0 border-0 bg-transparent px-0 text-[10px] text-[#5f6c83] ${i===0 ? "font-[750] text-[#19233e] after:absolute after:bottom-0 after:left-[-6px] after:right-[-6px] after:h-0.5 after:bg-[#e62c36]" : ""}`}>
              {tab}
            </button>
          ))}
          <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
            <label className="flex h-[29px] w-[198px] items-center gap-1.5 rounded-[6px] border border-[#e0e5ec] bg-[#fbfcfe] px-2.5 text-[#8791a4]">
              <Search size={13}/><input className="w-full border-0 bg-transparent text-[9px] text-[#27334e] outline-none" placeholder="Search campaigns..." />
            </label>
            <button className="flex h-[29px] items-center gap-1.5 rounded-[6px] border border-[#dfe4eb] bg-white px-2.5 text-[9px] font-semibold text-[#29354e]"><SlidersHorizontal size={12}/>Filter</button>
            <button className="flex h-[29px] items-center gap-1.5 rounded-[6px] border border-[#dfe4eb] bg-white px-2.5 text-[9px] font-semibold text-[#29354e]"><ArrowDownUp size={12}/>Sort<ChevronDown size={10}/></button>
            <button onClick={() => router.push("/admin/campaigns/new")} className="flex h-[29px] items-center gap-1.5 rounded-[6px] border border-[#e51e28] bg-[#e51e28] px-3.5 text-[9px] font-semibold text-white"><Plus size={13}/>Create Campaign</button>
          </div>
        </section>

        {/* Table */}
        <section className="rounded-b-[7px] border border-t-0 border-[#e5e9ef] bg-white">
          <div>
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-8"/><col className="w-[235px]"/><col className="w-[105px]"/><col className="w-[135px]"/>
                <col className="w-[90px]"/><col className="w-[110px]"/><col className="w-[70px]"/><col className="w-[82px]"/>
                <col className="w-[95px]"/><col className="w-[78px]"/><col className="w-[125px]"/><col className="w-[85px]"/>
              </colgroup>
              <thead>
                <tr className="h-[31px] bg-[#f7f9fc] text-left text-[9px] font-semibold text-[#637088]">
                  {["","Campaign","Project","Channels","Status","Date Range","Leads","Spend","Conversions","Performance","Last Updated","Actions"].map((h,i)=>
                    <th key={i} className="border-y border-[#e8ecf2] px-2.5 font-semibold">{i===0?<input className="h-[13px] w-[13px] accent-[#e5222b]" type="checkbox"/>:h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c,i)=>(
                  <tr
                    key={c.id}
                    className="h-[49px] cursor-pointer border-b border-[#edf0f4] text-[9px] text-[#44516a] transition-colors hover:bg-[#f9fafc]"
                    onClick={() => router.push(`/admin/campaigns/${c.id}`)}
                  >
                    <td className="px-2.5" onClick={(event) => event.stopPropagation()}><input className="h-[13px] w-[13px] accent-[#e5222b]" type="checkbox"/></td>
                    <td className="px-2.5" onClick={(event) => event.stopPropagation()}>
                      <div className="flex min-w-0 items-center gap-[9px]">
                        <CampaignThumb index={i}/>
                        <div className="min-w-0">
                          <b className="block overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-[#26334d] hover:text-[#e62c36]">{c.title}</b>
                          <small className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-[#8a94a6]">{c.desc}</small>
                        </div>
                      </div>
                    </td>
                    <td className="px-2.5 font-semibold text-[#556178]">{c.project}</td>
                    <td className="px-2.5">
                      <div className="flex items-center gap-[5px]">
                        {c.channels.map((Icon,j)=><ChannelIcon key={j} Icon={Icon}/>)}{c.extra&&<span className="text-[9px] font-semibold text-[#647088]">{c.extra}</span>}
                      </div>
                    </td>
                    <td className="px-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-lg px-[7px] py-1 text-[9px] font-bold ${
                        c.statusTone==="active" ? "bg-[#e4f8ee] text-[#16a16d]" :
                        c.statusTone==="scheduled" ? "bg-[#e8f2ff] text-[#397fd4]" :
                        c.statusTone==="completed" ? "bg-[#e6f8ee] text-[#16a16d]" : "bg-[#eef2f6] text-[#66748a]"
                      }`}><i className="h-[5px] w-[5px] rounded-full bg-current"/>{c.status}</span>
                    </td>
                    <td className="px-2.5 leading-[1.3]"><span className="block">{c.dates[0]}</span><span className="block text-[#5c687d]">- {c.dates[1]}</span></td>
                    <td className="px-2.5"><strong className="block text-[9px] text-[#26334d]">{c.leads}</strong>{c.leadGrowth&&<em className="text-[9px] font-bold not-italic text-[#13a16b]">↑ {c.leadGrowth}</em>}</td>
                    <td className="px-2.5"><strong className="text-[9px] text-[#26334d]">{c.spend}</strong></td>
                    <td className="px-2.5"><strong className="block text-[9px] text-[#26334d]">{c.conversions}</strong>{c.conversionGrowth&&<em className="text-[9px] font-bold not-italic text-[#13a16b]">↑ {c.conversionGrowth}</em>}</td>
                    <td className="px-2.5">
                      <div className="relative grid h-9 w-9 place-items-center text-[9px] font-[750] text-[#27354d]">
                        <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#edf1f5" strokeWidth="3.5" />
                          {c.score !== "—" && <circle cx="18" cy="18" r="14" fill="none"
                            stroke={c.scoreTone==="yellow"?"#efbd25":c.scoreTone==="red"?"#ed3742":"#21b47b"}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeDasharray={`${(Number(c.score)/100)*87.96} 87.96`}
                          />}
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-[750]">{c.score}</span>
                      </div>
                    </td>
                    <td className="px-2.5 leading-[1.35]"><b className="block text-[9px] font-medium">{c.updated[0]}</b><small className="text-[9px] text-[#8b95a6]">{c.updated[1]}</small></td>
                    <td className="px-2.5" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="h-[29px] rounded-[6px] border border-[#e1e6ed] bg-white px-[13px] text-[9px] font-semibold text-[#35415a] hover:bg-[#f7f9fc]"
                          onClick={() => router.push(`/admin/campaigns/${c.id}`)}
                        >
                          Open
                        </button>
                        <button type="button" className="grid h-[29px] w-[29px] place-items-center rounded-[6px] border border-[#e1e6ed] bg-white text-[#6d7890]"><MoreVertical size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex h-8 items-center justify-between px-3.5 text-[9px] text-[#69758b]">
            <span>Showing 1 to 5 of 24 campaigns</span>
            <div className="hidden items-center gap-1 sm:flex">
              <button className="grid h-[25px] w-[25px] place-items-center rounded-[5px] border border-[#e1e6ed] bg-white"><ChevronLeft size={11}/></button>
              {[2,3,4].map(n=><button key={n} className="grid h-[25px] w-[25px] place-items-center rounded-[5px] border border-[#e1e6ed] bg-white text-[9px]">{n}</button>)}
              <button className="grid h-[25px] w-[25px] place-items-center rounded-[5px] border border-[#e5252e] bg-[#e5252e] text-[9px] text-white">5</button>
              <button className="grid h-[25px] w-[25px] place-items-center rounded-[5px] border border-[#e1e6ed] bg-white"><ChevronRight size={11}/></button>
              <button className="flex h-[25px] w-[78px] items-center justify-center gap-1 rounded-[5px] border border-[#e1e6ed] bg-white text-[9px]">10 per page<ChevronDown size={10}/></button>
            </div>
          </div>
        </section>

        {/* Bottom panels */}
        <section className="mt-2.5 grid grid-cols-1 gap-[9px] md:grid-cols-2 xl:grid-cols-[1.1fr_1.25fr_.92fr_1fr]">
          <article className="h-[200px] overflow-y-auto rounded-[7px] border border-[#e5e9ef] bg-white">
            <SectionHeader title="Campaign Performance Overview"/>
            <div className="flex justify-end gap-3.5 px-3 pb-0.5 text-[9px] text-[#657189]">
              <span className="flex items-center gap-1"><i className="h-[7px] w-[7px] rounded-full bg-[#e4252e]"/>Leads</span>
              <span className="flex items-center gap-1"><i className="h-[7px] w-[7px] rounded-full bg-[#3389e7]"/>Conversions</span>
              <span className="flex items-center gap-1"><i className="h-[7px] w-[7px] rounded-full bg-[#e887ae]"/>Spend</span>
              <button className="flex h-6 items-center gap-1 rounded border border-[#dfe4eb] bg-white px-[7px] text-[9px]">Last 30 days<ChevronDown size={9}/></button>
            </div>
            <PerformanceChart/>
          </article>

          <article className="h-[200px] overflow-y-auto rounded-[7px] border border-[#e5e9ef] bg-white">
            <SectionHeader title="Top Performing Campaigns"/>
            <div className="px-3 pt-1">
              {topCampaigns.map(([name,meta,score,tone],i)=>(
                <div className="grid min-h-8 grid-cols-[22px_1fr_32px] items-center gap-2 border-b border-[#f0f2f5] py-1.5 last:border-0" key={name}>
                  <span className="grid h-[21px] w-[21px] place-items-center rounded-full bg-[#f0f3f7] text-[9px] font-[750] text-[#5d6a80]">{i+1}</span>
                  <div className="min-w-0"><b className="block overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-[#35415a]">{name}</b><small className="text-[9px] text-[#8993a5]">{meta}</small></div>
                  <div className="relative grid h-[30px] w-[30px] place-items-center text-[9px] font-bold">
                    <svg className="h-[30px] w-[30px] -rotate-90" viewBox="0 0 30 30">
                      <circle cx="15" cy="15" r="12" fill="none" stroke="#edf1f5" strokeWidth="3" />
                      <circle cx="15" cy="15" r="12" fill="none"
                        stroke={tone==="yellow"?"#efbd25":tone==="red"?"#ed3742":"#21b47b"}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${(Number(score)/100)*75.4} 75.4`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#27354d]">{score}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="h-[200px] overflow-y-auto rounded-[7px] border border-[#e5e9ef] bg-white">
            <SectionHeader title="Channel Contribution"/>
            <div className="flex h-[142px] items-center justify-center gap-[15px]">
              <div className="relative h-[118px] w-[118px] shrink-0">
                <svg
                  className="h-full w-full -rotate-90"
                  viewBox="0 0 118 118"
                  aria-label="Channel contribution"
                >
                  <circle
                    cx="59"
                    cy="59"
                    r="46"
                    fill="none"
                    stroke="#edf1f5"
                    strokeWidth="13"
                  />

                  {(() => {
                    const radius = 46;
                    const circumference = 2 * Math.PI * radius;
                    let offset = 0;

                    const colors = [
                      "#398be8",
                      "#e983b0",
                      "#547fe8",
                      "#64a7dd",
                      "#1cb17c",
                      "#e3262e",
                    ];

                    return channelNames.map(([name, percentage], index) => {
                      const dash = (percentage / 100) * circumference;
                      const gap = 2;
                      const visibleDash = Math.max(dash - gap, 0);
                      const currentOffset = offset;

                      offset += dash;

                      return (
                        <circle
                          key={name}
                          cx="59"
                          cy="59"
                          r={radius}
                          fill="none"
                          stroke={colors[index]}
                          strokeWidth="13"
                          strokeLinecap="butt"
                          strokeDasharray={`${visibleDash} ${circumference - visibleDash}`}
                          strokeDashoffset={-currentOffset}
                        />
                      );
                    });
                  })()}
                </svg>

                <div className="absolute inset-[25px] flex flex-col items-center justify-center rounded-full bg-white text-center">
                  <strong className="text-[16px] leading-none">1,248</strong>
                  <span className="mt-0.5 text-[9px] text-[#8a94a6]">
                    Total Leads
                  </span>
                </div>
              </div>

              <div className="w-[100px]">
                {channelNames.map(([name, value, color]) => (
                  <div
                    key={name}
                    className="grid h-[18px] grid-cols-[8px_1fr_auto] items-center text-[9px]"
                  >
                    <i className={`h-[7px] w-[7px] rounded-[2px] ${color}`} />
                    <span>{name}</span>
                    <b>{value}%</b>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="h-[200px] overflow-y-auto rounded-[7px] border border-[#e5e9ef] bg-white">
            <SectionHeader title="Upcoming Campaign Milestones"/>
            <div className="px-3">
              {milestones.map(([title,meta,tone])=>(
                <div key={title} className="grid min-h-[34px] grid-cols-[23px_1fr] items-center gap-[7px] border-b border-[#f0f2f5] last:border-0">
                  <span className={`grid h-[21px] w-[21px] place-items-center rounded-full border-2 ${tone==="green"?"border-[#18a773] text-[#18a773]":"border-[#e6303a] text-[#e6303a]"}`}><CalendarDays size={11}/></span>
                  <div><b className="block text-[9px]">{title}</b><small className="mt-0.5 block text-[9px] text-[#8b95a6]">{meta}</small></div>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* Quick actions */}
        <section className="mt-[9px] grid grid-cols-1 gap-[9px] sm:grid-cols-2 xl:grid-cols-4">
          {([
            [Plus,"Create Campaign","Plan and launch a new marketing","campaign across multiple channels.","Create Campaign","red"],
            [Copy,"Duplicate Campaign","Save time by duplicating an existing","campaign.","Duplicate Campaign","blue"],
            [Link2,"Connect Channels","Connect your social media, website","and other channels.","Manage Integrations","blue"],
            [BarChart3,"View Reports","See detailed analytics and performance","reports for your campaigns.","View Reports","purple"]
          ] as [React.ComponentType<{size?:number}>, string, string, string, string, string][]).map(([Icon,title,p1,p2,button,tone])=>(
            <div key={title} className="flex h-[63px] items-center gap-2.5 rounded-[7px] border border-[#e5e9ef] bg-white px-3">
              <span className={`grid h-[31px] w-[31px] shrink-0 place-items-center rounded-full ${tone==="red"?"bg-[#fff0f1] text-[#e42a35]":tone==="purple"?"bg-[#f0eaff] text-[#8156d7]":"bg-[#e8f2ff] text-[#3582da]"}`}><Icon size={17}/></span>
              <div className="min-w-0"><b className="block text-[9px]">{title}</b><p className="mt-0.5 text-[9px] leading-[1.2] text-[#8b95a6]">{p1} {p2}</p></div>
              <button className="ml-auto shrink-0 whitespace-nowrap rounded-[5px] border border-[#dfe4eb] bg-white px-2 py-1.5 text-[9px] font-semibold text-[#35415a]">{button}</button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default CampaignsPage;
