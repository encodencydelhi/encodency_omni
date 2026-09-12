"use client";

import { useState, type ReactNode } from "react";
import {
  Search, ChevronDown, ChevronRight, MoreVertical, Plus,
  Pencil, MapPin, Link2,
  FileText, CalendarDays, Megaphone,
  Globe2, BarChart3,
  Settings, UserRound, UserPlus, Shield, Mail,
  Clock3, CheckCircle2, AlertTriangle, Heart,
  RefreshCw, Building2,
  Megaphone as CampaignIcon,
  Check, Workflow, UsersRound, FileCheck2, Gauge, Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  FaInstagram, FaLinkedin, FaWhatsapp, FaYoutube, FaGoogle
} from "react-icons/fa";
import type { IconType } from "react-icons";

type IconComp = LucideIcon | IconType;

const tabs = [
  "Overview",
  "Business Details",
  "Team & Permissions",
  "Channels & Integrations",
  "Activity",
] as const;

type StatRow = [IconComp, string, string, string, string, string];

const overviewStats: StatRow[] = [
  [UserRound, "Total Leads", "426", "↑ 24%", "+82 this month", "rose"],
  [CampaignIcon, "Active Campaigns", "5", "↑ 25%", "2 active campaigns", "pink"],
  [Gauge, "SEO Score", "86", "↑ 12 points", "Good", "green"],
  [Link2, "Connected Channels", "7", "↑ 40%", "6 active channels", "purple"],
  [BarChart3, "Website Visits", "12.4K", "↑ 32%", "+3.0K this month", "blue"],
  [UsersRound, "Monthly Reach", "86.5K", "↑ 28%", "Across all channels", "mint"],
];

const activityStats: StatRow[] = [
  [Zap, "Recent Actions", "32", "↑ 28%", "in last 30 days", "purple"],
  [FileText, "Published Posts", "12", "↑ 33%", "across all channels", "mint"],
  [UsersRound, "New Leads", "5", "↑ 25%", "this month", "blue"],
  [CheckCircle2, "Completed Audits", "3", "↑ 50%", "this month", "orange"],
  [AlertTriangle, "Unresolved Issues", "2", "↓ 0%", "require attention", "pink"],
];

const teamStats: StatRow[] = [
  [UserRound, "Total Assigned Members", "8", "↑ 33%", "+2 this month", "rose"],
  [Shield, "Roles", "6", "", "Active roles", "blue"],
  [Mail, "Pending Invites", "2", "", "Invitations sent", "orange"],
  [UsersRound, "Channel Owners", "4", "", "Primary owners", "purple"],
  [Workflow, "Approval Chain", "3", "", "Levels", "mint"],
];

const channelStats: StatRow[] = [
  [Link2, "Connected Channels", "7 / 8", "↑ 88%", "7 active integrations", "purple"],
  [Shield, "Sync Health", "6", "Healthy", "1 needs attention", "mint"],
  [Clock3, "Tokens Expiring", "1", "", "Within 30 days", "orange"],
  [RefreshCw, "Last Sync Status", "2 minutes ago", "", "All systems operational", "blue"],
];

const channels: Array<[string, string, string, string, string, string, string, string, IconComp, "connected" | "reauth"]> = [
  ["Meta & Instagram", "Social Media Marketing", "Moksha Sewa", "@mokshasewa", "2 minutes ago", "Posts, Insights, Ads", "Full Access", "Manish Sirohi", FaInstagram, "connected"],
  ["LinkedIn", "Professional Network", "Moksha Sewa", "Company Page", "12 minutes ago", "Posts, Analytics", "Manage Pages", "Priya Sharma", FaLinkedin, "connected"],
  ["Google Business", "Local Business", "Moksha Sewa", "Delhi, India", "1 hour ago", "Reviews, Business Info", "Full Access", "Rahul Verma", FaGoogle, "connected"],
  ["WhatsApp", "Messaging", "+91 98765 43210", "Business Number", "5 minutes ago", "Messages, Contacts", "Full Access", "Neha Gupta", FaWhatsapp, "connected"],
  ["YouTube", "Video Platform", "Moksha Sewa", "Channel", "3 hours ago", "Videos, Analytics", "Manage Channel", "Aman Yadav", FaYoutube, "connected"],
  ["Website", "Website & CMS", "https://mokshasewa.org", "WordPress", "6 minutes ago", "Form Submissions", "Read & Write", "Manish Sirohi", Globe2, "connected"],
  ["Google Search Console", "SEO & Search", "mokshasewa.org", "Property", "1 hour ago", "Search Performance", "Read Only", "Priya Sharma", BarChart3, "connected"],
  ["Google Analytics", "Web Analytics", "Moksha Sewa", "GA4 Property", "3 days ago", "Traffic, Events", "Read Only", "Manish Sirohi", BarChart3, "reauth"],
];

const teamMembers: Array<[string, string, string, string, string, string, string, string, string, string]> = [
  ["Manish Sirohi", "Workspace Admin", "manish@encodency.com", "+91 98765 43210", "Client Admin", "All Modules", "Full Access", "Active", "2 hours ago", "MS"],
  ["Anit Sharma", "Founder & Director", "amit@mokshasewa.org", "+91 98102 34567", "Client Owner", "Overview + 8", "Custom", "Active", "1 hour ago", "AS"],
  ["Priya Desai", "Operations Manager", "priya@mokshasewa.org", "+91 98765 43210", "Content Approver", "Content + 4", "Approve Only", "Active", "3 hours ago", "PS"],
  ["Rahul Kumar", "Volunteer Coordinator", "rahul@mokshasewa.org", "+91 98991 22334", "Campaign Manager", "Campaigns + 3", "Edit & Approve", "Active", "1 day ago", "RK"],
  ["Sneha Nair", "Communications Lead", "sneha@mokshasewa.org", "+91 98118 77665", "Social Media Manager", "Social Media + 4", "Create & Edit", "Active", "4 hours ago", "SN"],
  ["Arjun Mehta", "Content Executive", "arjun@mokshasewa.org", "+91 98712 33456", "Content Creator", "Content + 3", "Create Only", "Active", "6 hours ago", "AR"],
  ["Neha Patel", "SEO Specialist", "neha.p@mokshasewa.org", "+91 96543 21098", "SEO Manager", "SEO + 2", "Edit & Approve", "Active", "1 day ago", "NP"],
  ["Vikram Singh", "Community Manager", "vikram@mokshasewa.org", "+91 98765 67890", "Support & CRM", "Leads + 2", "View & Edit", "Away", "2 days ago", "VK"],
];

const activityRows: Array<[string, string, string, string, string, string, string, string, IconComp]> = [
  ["Jan 16, 2025", "11:24 AM", "Content Published", 'Published Instagram post: "Compassion in Action"', "Priya Sharma", "PS", "Instagram", "pink", FaInstagram],
  ["Jan 15, 2025", "04:10 PM", "SEO Audit Completed", "Moksha Sewa audit completed. Score: 86/100 (+12)", "Neha Gupta", "NG", "Website", "blue", Globe2],
  ["Jan 14, 2025", "02:35 PM", "WhatsApp Campaign Sent", 'Sent "End-of-Life Support" campaign to 1,248 contacts', "Rahul Verma", "RV", "WhatsApp", "green", FaWhatsapp],
  ["Jan 13, 2025", "11:20 AM", "Google Review Replied", "Replied to 5-star review from Anjali Mehta", "Manish Sirohi", "MS", "Google Business", "blue", FaGoogle],
  ["Jan 12, 2025", "03:45 PM", "Team Member Added", "Added Neha Gupta as Content Creator", "Manish Sirohi", "MS", "System", "gray", UsersRound],
  ["Jan 11, 2025", "01:10 PM", "Keyword Imported", "Imported 25 keywords for local SEO campaign", "Neha Gupta", "NG", "SEO", "purple", Search],
  ["Jan 10, 2025", "05:22 PM", "Settings Updated", "Updated WhatsApp integration settings", "Priya Sharma", "PS", "Settings", "gray", Settings],
  ["Jan 09, 2025", "12:18 PM", "Content Approved", "Client approved 3 social media posts", "Anit Sharma", "AS", "System", "gray", FileCheck2],
];

function IconBadge({ Icon, tone = "purple", size = 18 }: {
  Icon: LucideIcon | IconType;
  tone?: string;
  size?: number;
}) {
  const tones: Record<string, string> = {
    purple: "bg-[#f0ebff] text-[#6d35df]",
    rose: "bg-[#fff0f4] text-[#ef4b78]",
    pink: "bg-[#fff0f6] text-[#e83f88]",
    green: "bg-[#e8faf2] text-[#19a978]",
    mint: "bg-[#e7faf4] text-[#18ad7a]",
    blue: "bg-[#edf5ff] text-[#3485df]",
    orange: "bg-[#fff5e7] text-[#ef9b21]",
    gray: "bg-[#f0f3f7] text-[#64748b]",
  };
  return (
    <span className={`grid shrink-0 place-items-center rounded-full ${tones[tone] || tones.purple} h-10 w-10`}>
      <Icon size={size} strokeWidth={1.9} />
    </span>
  );
}

function StatCard({ item }: { item: [LucideIcon | IconType, string, string, string, string, string] }) {
  const [Icon, label, value, trend, note, tone] = item;
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-[8px] border border-[#e2e8f1] bg-white px-3.5 py-3 shadow-[0_1px_3px_rgba(20,35,65,.03)]">
      <IconBadge Icon={Icon} tone={tone} />
      <div className="min-w-0">
        <div className="truncate text-[10px] font-medium text-[#66738c]">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <strong className="text-[20px] font-extrabold leading-none tracking-[-.5px] text-[#101d49]">{value}</strong>
          {trend && <span className={`text-[9px] font-bold ${trend.includes("↓") ? "text-[#e84b64]" : "text-[#19aa79]"}`}>{trend}</span>}
        </div>
        <div className="mt-1 text-[9px] text-[#8994a8]">{note}</div>
      </div>
    </div>
  );
}

function ClientHeader({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  return (
    <>
      <div className="mb-2 text-[10px] text-[#6e7b94]">
        <span>Clients</span><ChevronRight className="mx-1 inline" size={10}/><b className="text-[#233050]">Moksha Sewa</b>
      </div>

      <section className="">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex h-[88px] w-[124px] shrink-0 items-center justify-center rounded-md border border-[#e1e5eb] bg-white p-2 shadow-sm">
              <img src="/brand/moksha-sewa-logo.png" alt="Moksha Sewa Logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="m-0 text-[23px] font-extrabold tracking-[-.7px] text-[#111d4a]">Moksha Sewa</h1>
                <span className="rounded-full bg-[#e2faf0] px-2.5 py-1 text-[9px] font-bold text-[#1aad7a]">● Active</span>
              </div>
              <p className="mt-1 text-[11px] text-[#66748d]">End-to-end support for dignified funeral services.</p>
              <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[9px] text-[#65728b]">
                <span className="flex items-center gap-2"><IconBadge Icon={Building2} tone="purple" size={18}/><span>NGO / Social Impact</span></span>
                <span className="flex items-center gap-2"><IconBadge Icon={MapPin} tone="blue" size={18}/><span>New Delhi, India</span></span>
                <span className="flex items-center gap-2"><IconBadge Icon={Link2} tone="purple" size={12}/><span className="font-semibold text-[#5c35d9]">https://mokshasewa.org</span></span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button className="flex h-9 items-center gap-1.5 rounded-md border border-[#dce3ed] bg-white px-3 text-[10px] font-semibold text-[#35415c]"><Pencil size={13}/>Edit Client</button>
            <button className="grid h-9 w-9 place-items-center rounded-md border border-[#dce3ed] bg-white"><MoreVertical size={15}/></button>
          </div>

          <div className="hidden h-[123px] w-[335px] shrink-0 overflow-hidden rounded-lg lg:block">
            <img src="/dignity.png" alt="Moksha Sewa" className="h-full w-full object-cover" />
          </div>

        </div>
      </section>

      <div className="mt-2 flex overflow-x-auto rounded-[8px] border border-[#dfe5ed] bg-white">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`relative flex h-[37px] min-w-[140px] shrink-0 items-center justify-center px-4 text-[10px] font-medium ${activeTab === tab ? "font-bold text-[#5632db] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-[#5a32e4]" : "text-[#5d6981]"}`}>
            {tab}
          </button>
        ))}
      </div>
    </>
  );
}

function OverviewView() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-6">{overviewStats.map((x,i)=><StatCard item={x} key={i}/>)}</div>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 xl:grid-cols-[1.45fr_1fr_.8fr]">
        <Panel title="About Moksha Sewa" action="Edit">
          <p className="text-[10px] leading-[1.5] text-[#6c7890]">Moksha Sewa works towards providing dignified funeral services for the underprivileged and communities. Our mission is to serve humanity with compassion, respect and dignity. We organize cremation services, support families in need, and create awareness about the importance of dignified end-of-life care. Through volunteers and donations, we strive to ensure that every individual receives a respectful farewell, regardless of their socio-economic background.</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[["♡","Compassion","Care for every life"],["♧","Service","Support communities"],["⌁","Dignity","Respect in every farewell"],["☆","Awareness","A kinder, more humane society"]].map(x=><div key={x[1]} className="text-center"><span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-[#f3efff] text-[19px] text-[#6535dc]">{x[0]}</span><b className="mt-1 block text-[9px] text-[#33405d]">{x[1]}</b><small className="text-[9px] text-[#8993a5]">{x[2]}</small></div>)}
          </div>
        </Panel>
        <Panel title="Primary Contacts" action="+ Add Contact">
          <div className="overflow-hidden rounded border border-[#edf0f4]">
            {[
              ["AS","Amit Sharma","Founder & Director","amit@mokshasewa.org","+91 98102 34567"],
              ["PD","Priya Desai","Operations Manager","priya@mokshasewa.org","+91 98765 43210"],
              ["RK","Rahul Kumar","Volunteer Coordinator","rahul@mokshasewa.org","+91 98991 22334"],
              ["SN","Sneha Nair","Communications Lead","sneha@mokshasewa.org","+91 98118 77665"],
            ].map(r=><div key={r[0]} className="grid grid-cols-[34px_1fr_1fr_1.2fr] items-center border-b border-[#eef1f5] px-2 py-2 last:border-0">
              <Avatar text={r[0]!}/><b className="text-[9px]">{r[1]}</b><span className="text-[9px] text-[#7d8799]">{r[2]}</span><div className="flex flex-col"><span className="text-[9px] text-[#5e35d6]">{r[3]}</span><span className="text-[9px] text-[#7d8799]">{r[4]}</span></div>
            </div>)}
          </div>
        </Panel>
        <Panel title="Marketing Goals" action="Edit" className="max-h-[240px] overflow-y-auto">
          <Goal Icon={Heart} title="Increase Donations" desc="Drive consistent monthly donations" tone="rose"/>
          <Goal Icon={UsersRound} title="Build Awareness" desc="Reach more people about our mission" tone="purple"/>
          <Goal Icon={UserPlus} title="Recruit Volunteers" desc="Grow our volunteer community" tone="blue"/>
          <Goal Icon={BarChart3} title="Increase Website Traffic" desc="Improve organic and direct traffic" tone="green"/>
          <Goal Icon={MapPin} title="Improve Local Visibility" desc="Rank higher in Delhi NCR for relevant searches" tone="orange"/>
        </Panel>
      </div>

      <div className="mt-2.5 grid grid-cols-1 items-stretch gap-2.5 xl:grid-cols-[1.05fr_1.05fr_1fr]">
        <Panel title="Connected Channels" action="Manage Integrations"><ChannelMiniList/></Panel>
        <Panel title="Recent Activity" action="View All"><RecentActivity/></Panel>
        <Panel title="Brand Snapshot" action="Edit">
          <div className="flex gap-3">
            <div className="flex h-[128px] w-[120px] shrink-0 items-center justify-center rounded border border-[#e7ebf1] bg-white p-2"><img src="/brand/moksha-sewa-logo.png" alt="Moksha Sewa" className="max-h-full max-w-full object-contain" /></div>
            <div className="min-w-0 text-[9px] text-[#6e7890]">
              <div className="flex gap-4">
                <div><b className="text-[9px] text-[#394561]">Primary Color</b><div className="mt-1 flex items-center gap-2"><span className="h-5 w-5 rounded bg-[#2e7d32]"/><span>#2E7D32</span></div></div>
                <div><b className="text-[9px] text-[#394561]">Secondary Color</b><div className="mt-1 flex items-center gap-2"><span className="h-5 w-5 rounded border border-[#e1e5eb] bg-[#f8f1e7]"/><span>#F8F1E7</span></div></div>
              </div>
              <b className="mt-3 block text-[9px] text-[#394561]">Brand Tone</b><p className="mt-1">Compassionate, Trustworthy,<br/>Human-Centric</p>
              <b className="mt-3 block text-[9px] text-[#394561]">Call to Action</b><p className="mt-1">Donate. Volunteer. Spread Awareness.</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 rounded-md border border-[#d5e8da] bg-[#f1faf4] px-5 py-4">
            <span className="text-[40px] leading-none text-[#4caf50]">"</span>
            <p className="m-0 text-[11px] font-medium italic leading-relaxed text-[#2f5a3a]">A respectful farewell<br/>is every human's right.</p>
            <div className="mx-1 h-[2px] w-10 shrink-0 rounded bg-[#4caf50]"/>
            <svg className="h-[50px] w-[50px] shrink-0 text-[#81c784] opacity-50" viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/></svg>
          </div>
        </Panel>
      </div>
    </>
  );
}

function ActivityView() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">{activityStats.map((x,i)=><StatCard item={x} key={i}/>)}</div>
      <div className="mt-2.5 grid grid-cols-1 items-stretch gap-2.5 xl:grid-cols-[1.75fr_.75fr]">
        <Panel title="" className="mt-0">
          <div className="mb-2 flex items-center gap-2">
            <div className="min-w-0"><b className="text-[12px] font-extrabold tracking-[-.2px] text-[#182443]">Activity Timeline</b><p className="mt-0.5 text-[9px] text-[#8792a7]">Track all important actions, updates and progress for this client.</p></div>
            <div className="flex items-center gap-2 ml-auto">
              {["Last 30 Days","All Actions","All Team Members"].map(x=><button key={x} className="flex h-7 items-center gap-2 rounded-md border border-[#dfe5ed] bg-white px-2.5 text-[9px] text-[#4c5871]"><CalendarDays size={11}/>{x}<ChevronDown size={10}/></button>)}
              <button className="flex h-7 items-center gap-1.5 rounded-md border border-[#dfe5ed] bg-white px-3 text-[9px] font-semibold text-[#35415c]">Export</button>
            </div>
          </div>
          <div>
            {activityRows.map((r,i)=>{
              const Icon = r[8] as LucideIcon | IconType;
              const toneColors: Record<string, string> = {
                purple: "bg-[#f0ebff] text-[#6d35df]",
                rose: "bg-[#fff0f4] text-[#ef4b78]",
                pink: "bg-[#fff0f6] text-[#e83f88]",
                green: "bg-[#e8faf2] text-[#19a978]",
                mint: "bg-[#e7faf4] text-[#18ad7a]",
                blue: "bg-[#edf5ff] text-[#3485df]",
                orange: "bg-[#fff5e7] text-[#ef9b21]",
                gray: "bg-[#f0f3f7] text-[#64748b]",
              };
              const tone = r[7] as string;
              return <div key={i} className="grid grid-cols-[58px_32px_1fr_150px_105px_24px] items-center gap-2 border-b border-[#eef1f5] py-2">
                <div className="text-right text-[9px] text-[#8a94a6]"><b className="block text-[#6c7890]">{r[0]}</b>{r[1]}</div>
                <span className={`grid h-8 w-8 place-items-center rounded-full ${toneColors[tone] || toneColors.gray}`}><Icon size={15}/></span>
                <div><b className="block text-[9px] text-[#34415d]">{r[2]}</b><small className="text-[9px] text-[#8b95a6]">{r[3]}</small></div>
                <div className="flex items-center gap-2"><Avatar text={r[5]!}/><div><b className="block text-[9px]">{r[4]}</b><small className="text-[9px] text-[#8b95a6]">{r[4]==="Manish Sirohi"?"Workspace Admin":"Social Media Manager"}</small></div></div>
                <span className="justify-self-start rounded-full bg-[#f0edff] px-2 py-1 text-[9px] font-semibold text-[#5d39d2]">{r[6]}</span>
                <button><MoreVertical size={13} className="text-[#8993a5]"/></button>
              </div>
            })}
          </div>
        </Panel>
        <div className="space-y-2.5">
          <Panel title="Pending Tasks & Follow-ups" action="View All">
            {[
              ["Share monthly report with client","Due today, 5:00 PM","High","PS"],
              ["Get approval for upcoming campaign","Due tomorrow","Medium","RV"],
              ["Follow up on website content updates","Due Jan 18, 2025","Medium","NG"],
              ["Discuss new service page requirements","Due Jan 20, 2025","Low","MS"],
              ["Client feedback on audit recommendations","Due Jan 22, 2025","Low","AS"],
            ].map(x=><div key={x[0]} className="flex items-start gap-2 border-b border-[#eef1f5] py-2 last:border-0"><span className="mt-0.5 h-4 w-4 rounded border border-[#cdd6e3]"/><div className="min-w-0 flex-1"><b className="block text-[9px]">{x[0]}</b><small className="text-[9px] text-[#8b95a6]">{x[1]}</small></div><span className="rounded-full bg-[#fff0f4] px-2 py-1 text-[9px] font-semibold text-[#ef557d]">{x[2]}</span><Avatar text={x[3]!}/></div>)}
          </Panel>
          <Panel title="Client Notes" action="+ Add Note">
            <Note initials="MS" name="Manish Sirohi" time="Jan 15, 2025, 10:30 AM">Client is very happy with the recent campaign performance. Planning to expand to LinkedIn content next month.</Note>
            <Note initials="AS" name="Anit Sharma (Client)" time="Jan 12, 2025, 04:15 PM">Requested more focus on volunteer stories and community impact. Also interested in a testimonial video.</Note>
          </Panel>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 xl:grid-cols-3">
        <LogPanel title="User Actions Log" rows={["Published Content","Completed Audit","Sent Campaign","Replied to Review","Added Team Member"]}/>
        <LogPanel title="Content Approvals Log" rows={["Volunteer Story Post","Festival Awareness Post","Service Info Carousel","Community Impact Post","New Year Message"]}/>
        <LogPanel title="Integration Events Log" rows={["Campaign Sent","Review Replied","Keywords Imported","Settings Updated","Connection Sync"]}/>
      </div>
    </>
  );
}

function TeamView() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">{teamStats.map((x,i)=><StatCard item={x} key={i}/>)}</div>
      <Panel title="" className="mt-2.5">
        <div className="mb-2 flex items-center justify-between gap-2"><b className="text-[12px] font-extrabold tracking-[-.2px] text-[#182443]">Team Members (8)</b><div className="flex items-center gap-2"><div className="flex h-8 w-[180px] items-center gap-2 rounded border border-[#dfe5ed] px-2 text-[9px] text-[#8a94a6]"><Search size={11}/>Search team members...</div><button className="flex h-8 items-center gap-2 rounded border border-[#dfe5ed] px-3 text-[9px]">All Status<ChevronDown size={10}/></button><button className="flex h-8 items-center gap-1.5 rounded-md bg-[#5a32e4] px-3 text-[9px] font-semibold text-white"><Plus size={13}/>Invite Member</button></div></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] border-collapse text-[9px]">
            <thead><tr className="bg-[#f7f9fc] text-left text-[#64728b]">{["#","Name","Designation","Email","Phone","Role","Modules","Permissions","Status","Last Activity","Actions"].map(x=><th key={x} className="border-y border-[#e8edf3] px-2 py-2 font-semibold">{x}</th>)}</tr></thead>
            <tbody>{teamMembers.map((r,i)=><tr key={r[0]} className="border-b border-[#eef1f5]">
              <td className="px-2 py-2 text-[#8190a5]">{i+1}</td><td className="px-2 py-2"><div className="flex items-center gap-2"><Avatar text={r[9]!}/><b>{r[0]}</b></div></td><td className="px-2 text-[#7c8799]">{r[1]}</td><td className="px-2 text-[#5d36d6]">{r[2]}</td><td className="px-2 text-[#7c8799]">{r[3]}</td><td className="px-2"><Badge text={r[4]} tone={({"Client Owner":"pink","Workspace Admin":"purple","Content Approver":"blue","Campaign Manager":"green","Social Media Manager":"orange","Content Creator":"mint","SEO Manager":"blue","Support & CRM":"purple"} as Record<string,string>)[r[4]]||"blue"}/></td><td className="px-2"><Badge text={r[5]} tone="blue"/></td><td className="px-2"><Badge text={r[6]} tone="purple"/></td><td className="px-2"><Badge text={r[7]} tone={r[7]==="Away"?"orange":"green"} dot/></td><td className="px-2 text-[#7c8799]">{r[8]}</td><td className="px-2 text-right"><MoreVertical size={13}/></td>
            </tr>)}</tbody>
          </table>
        </div>
      </Panel>
      <div className="mt-2.5 grid grid-cols-1 items-stretch gap-2.5 xl:grid-cols-[1.15fr_1.15fr_.85fr_.85fr]">
        <Panel title="Module Access & Permissions" action="Edit Access"><ModuleGrid/></Panel>
        <Panel title="Approval Workflows" action="Edit Workflow"><WorkflowCard title="Content Approval" tone="purple"/><WorkflowCard title="Campaign Approval" tone="pink"/></Panel>
        <Panel title="Channel Owners" action="Edit"><OwnerList/></Panel>
        <div className="space-y-2.5"><Panel title="Escalation Contacts" action="Edit"><ContactMini initials="AS" name="Anit Sharma" role="Founder & Director"/><ContactMini initials="PS" name="Priya Desai" role="Operations Manager"/></Panel><Panel title="Invited Users (2)" action="View All"><ContactMini initials="DT" name="Deepak Tiwari" role="Marketing Associate"/></Panel></div>
      </div>
    </>
  );
}

function BusinessView() {
  return (
    <>
      <div className="grid grid-cols-1 items-stretch gap-2.5 xl:grid-cols-[1.1fr_.9fr_.9fr_1.05fr]">
        <Panel title="Legal & Company Information" action="Edit"><InfoRows rows={[["Legal Name","Moksha Sewa Foundation"],["Operating Name","Moksha Sewa"],["Organization Type","Non-Profit Organization (NGO)"],["Industry","Social Impact / Funeral Services"],["Founded","2021"],["Team Size","11 - 50 Members"],["PAN","AAATM1234F"],["Address","B-122, Lajpat Nagar, New Delhi - 110024 Delhi, India"]]}/></Panel>
        <Panel title="Registration Details" action="Edit"><InfoRows rows={[["Registration Number","S/RS/2021/045678"],["Registered As","Trust (Public Charitable)"],["Registration Date","14 Mar 2021"],["12A Registration","Yes (AAATM1234FE2021)"],["80G Registration","Yes (AAATM1234FF2021)"],["FCRA Registered","No"],["CSR Eligible","Yes"]]}/></Panel>
        <Panel title="Website & Domain" action="Edit"><InfoRows rows={[["Website URL","https://mokshasewa.org"],["Domain Name","mokshasewa.org"],["Domain Since","Mar 2021"],["Hosting Provider","Hostinger"],["SSL Certificate","● Active"],["Website Status","● Live"],["Last Updated","12 Oct 2024"]]}/></Panel>
        <BrandGuidelines/>
      </div>
      <div className="mt-2.5 grid grid-cols-1 items-stretch gap-2.5 xl:grid-cols-3">
        <div className="space-y-2.5"><Panel title="Service Areas" action="Edit"><CheckList items={["Funeral & Last Rites Support","Mortal Remains Transport","Cremation / Burial Arrangements","Documentation Assistance","Grief Counseling & Family Support","NGO Partnerships & Community Support"]}/></Panel><Panel title="Mission Statement" action="Edit"><QuoteBox text="To provide dignified, compassionate and accessible funeral services, support grieving families in their time of need, and create a more humane and inclusive society."/></Panel><Panel title="Target Locations" action="Edit"><InfoRows rows={[["Primary","Delhi NCR (Delhi, Noida, Gurugram, Ghaziabad)"],["Secondary","Other cities in North India"],["Expansion Plan","Pan India (2025-2026)"]]}/></Panel></div>
        <div className="space-y-2.5"><Panel title="Primary Contact" action="Edit"><InfoRows rows={[["Name","Amit Sharma"],["Role","Founder & Director"],["Email","amit@mokshasewa.org"],["Phone","+91 98102 34567"],["WhatsApp","+91 98102 34567"]]}/></Panel><Panel title="Services Offered (Detailed)" action="Edit"><BulletList items={["End-to-end funeral arrangement support","Last rites and cremation/burial services","Mortal remains transportation (local & interstate)","Documentation and government process assistance","Grief counseling and emotional support","Community awareness and end-of-life planning","Support for underprivileged families","Corporate CSR partnership programs"]}/></Panel><Panel title="Communication Language" action="Edit"><div className="flex flex-wrap gap-2">{["English","Hindi","Punjabi","Hinglish"].map((x,i)=><Badge key={x} text={x} tone={["blue","orange","pink","green"][i]}/>)}</div></Panel></div>
        <div className="space-y-2.5"><Panel title="Secondary Contact" action="Edit"><InfoRows rows={[["Name","Priya Desai"],["Role","Operations Manager"],["Email","priya@mokshasewa.org"],["Phone","+91 98765 43210"],["WhatsApp","+91 98765 43210"]]}/></Panel><Panel title="Target Audience" action="Edit"><BulletList items={["Individuals and families in need of funeral services","Underprivileged and low-income families","Senior citizens and their dependents","Hospitals, old age homes and care centers","Corporate CSR partners","Community and religious organizations"]}/></Panel><Panel title="Business Hours" action="Edit"><InfoRows rows={[["Service Availability","24/7 (Emergency Support)"],["Office Hours","Mon - Sat, 9:00 AM - 6:00 PM"],["Response Time","Within 30 minutes"]]}/></Panel></div>
      </div>
      <div className="mt-2.5 grid grid-cols-1 items-stretch gap-2.5 xl:grid-cols-[1.1fr_1fr_.9fr]">
        <Panel title="Competitor List" action="Edit"><div className="flex flex-wrap gap-2">{["Antim Sewa","Shanti Sewa","Final Journey","Moksh Dham Sewa","Cremation Care","HinduHelp"].map(x=><Badge key={x} text={x} tone="blue"/>)}</div></Panel>
        <Panel title="Client Notes" action="Edit"><p className="text-[9px] leading-[1.5] text-[#6c7890]">Very responsive team. Passionate about their mission. Prefer community-focused messaging and real stories. Avoid overly promotional tone. Open to innovative campaigns and CSR collaborations.</p></Panel>
        <Panel title="Approval Preferences" action="Edit"><InfoRows rows={[["Content Approval","Required (Client Review)"],["Campaign Approval","Required"],["Ad Spend Approval","Required"],["Report Frequency","Monthly"],["Preferred Contact","Email / WhatsApp"]]}/></Panel>
      </div>
    </>
  );
}

function ChannelsView() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">{channelStats.map((x,i)=><StatCard item={x} key={i}/>)}</div>
      <Panel title="" className="mt-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0"><b className="text-[12px] font-extrabold tracking-[-.2px] text-[#182443]">Connected Channels & Integrations</b><p className="mt-0.5 text-[9px] text-[#8792a7]">Manage all your connected marketing channels, data sync settings and permissions.</p></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-[180px] items-center gap-2 rounded border border-[#dfe5ed] px-2 text-[9px] text-[#8a94a6]"><Search size={11}/>Search integrations...</div>
            <button className="flex h-8 items-center gap-2 rounded border border-[#dfe5ed] px-3 text-[9px]">All Statuses<ChevronDown size={10}/></button>
            <button className="flex h-8 items-center gap-1.5 rounded-md bg-[#5a32e4] px-3 text-[9px] font-semibold text-white"><Plus size={13}/>Add Integration</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[9px]">
            <thead><tr className="bg-[#f7f9fc] text-left text-[#64728b]">{["Channel","Status","Connected Account / Page","Last Sync","Data Synced","Permission Scope","Owner","Actions"].map(x=><th key={x} className="border-y border-[#e8edf3] px-2 py-2 font-semibold">{x}</th>)}</tr></thead>
            <tbody>{channels.map((r,i)=>{
              const I=r[8] as LucideIcon | IconType;
              const platformColors: Record<string, { bg: string; text: string }> = {
                "Meta & Instagram": { bg: "bg-[#fce4f0]", text: "text-[#e1306c]" },
                "LinkedIn": { bg: "bg-[#e8f0fe]", text: "text-[#0a66c2]" },
                "Google Business": { bg: "bg-[#e8f5e9]", text: "text-[#34a853]" },
                "WhatsApp": { bg: "bg-[#e8f5e9]", text: "text-[#25d366]" },
                "YouTube": { bg: "bg-[#ffe9e9]", text: "text-[#ff0000]" },
                "Website": { bg: "bg-[#e8f0fe]", text: "text-[#4285f4]" },
                "Google Search Console": { bg: "bg-[#e8f0fe]", text: "text-[#4285f4]" },
                "Google Analytics": { bg: "bg-[#e8f0fe]", text: "text-[#f9ab00]" },
              };
              const pc = platformColors[r[0]] || { bg: "bg-[#f0f3f7]", text: "text-[#64748b]" };
              return <tr key={r[0]} className="border-b border-[#eef1f5]">
              <td className="px-2 py-2"><div className="flex items-center gap-2"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${pc.bg} ${pc.text}`}><I size={15}/></span><div><b className="block text-[9px]">{r[0]}</b><small className="text-[9px] text-[#8b95a6]">{r[1]}</small></div></div></td>
              <td className="px-2"><Badge text={r[9]==="reauth"?"Needs Reauth":"Connected"} tone={r[9]==="reauth"?"orange":"green"} dot/></td>
              <td className="px-2"><b className="block">{r[2]}</b><small className="text-[9px] text-[#8993a5]">{r[3]}</small></td>
              <td className="px-2"><span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${r[9]==="reauth"?"bg-[#e52f42]":"bg-[#15ad77]"}`}/>{r[4]}</td>
              <td className="px-2"><b className="block font-medium">{r[5]}</b><small className="text-[9px] text-[#8993a5]">{i%2?"Page Insights":"Audience, Messages"}</small></td>
              <td className="px-2">{r[6]}</td>
              <td className="px-2"><div className="flex items-center gap-1.5"><Avatar text={r[7]!.split(" ").map((x:string)=>x[0]).join("").slice(0,2)}/>{r[7]}</div></td>
              <td className="px-2"><div className="flex gap-1.5"><button className="rounded border border-[#dfe5ed] px-3 py-1.5 text-[9px] font-semibold">Manage</button><button className="rounded border border-[#dfe5ed] bg-[#f2f5ff] px-3 py-1.5 text-[9px] font-semibold text-[#5332d7]">{r[9]==="reauth"?"Reconnect":"Sync Now"}</button><MoreVertical size={13}/></div></td>
            </tr>})}</tbody>
          </table>
        </div>
      </Panel>
      <div className="mt-2.5 grid grid-cols-1 items-stretch gap-2.5 xl:grid-cols-4">
        <Panel title="Action Required"><div className="flex items-start gap-2 text-[9px] text-[#6d7890]"><IconBadge Icon={AlertTriangle} tone="orange"/><p className="m-0">Google Analytics connection needs to be reauthorized. Your access token has expired. Please reconnect to continue syncing data.</p></div><div className="mt-3 flex gap-2"><button className="rounded-md bg-[#ed202d] px-3 py-2 text-[9px] font-bold text-white">Reconnect Google Analytics</button><button className="rounded-md border border-[#dfe5ed] px-3 py-2 text-[9px] font-semibold">Learn More</button></div></Panel>
        <Panel title="Publishing Preferences" action="Edit"><InfoRows rows={[["Default Timezone","Asia/Kolkata (IST)"],["Preferred Posting Times","9:00 AM - 6:00 PM"],["Content Approval","Required (Client)"],["Auto-Publish","● Enabled"],["Default Hashtags","#MokshaSewa #DignityForAll"],["Content Categories","Awareness, Stories, Updates"]]}/></Panel>
        <Panel title="Sync Preferences" action="Edit"><InfoRows rows={[["Auto Sync Frequency","Every 1 hour"],["Sync Historical Data","Last 12 months"],["Sync Contacts/Leads","Enabled"],["Sync Campaign Data","Enabled"],["Data Retention","24 months"],["Sync Notifications","Email alerts (Errors only)"]]}/></Panel>
        <Panel title="Webhooks & Inbound Forms" action="Edit"><InfoRows rows={[["Website Form Webhook","● Active"],["Lead Notification Email","leads@mokshasewa.org"],["Webhook URL","https://api.encodency.com/webhooks/..."],["Inbound Form Sync","● Enabled"],["Last Received","2 hours ago (3 leads)"],["Status","● Healthy"]]}/></Panel>
      </div>
    </>
  );
}

function Panel({ title, subtitle, action, children, className="" }: {
  title: string;
  subtitle?: string;
  action?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-[8px] border border-[#e1e7ef] bg-white shadow-[0_1px_3px_rgba(20,35,65,.025)] ${className}`}>
      <div className="flex items-start justify-between px-3.5 pb-1 pt-2">
        <div><h2 className="m-0 text-[12px] font-extrabold tracking-[-.2px] text-[#182443]">{title}</h2>{subtitle&&<p className="mt-0.5 text-[9px] text-[#8792a7]">{subtitle}</p>}</div>
        {action&&<button className="rounded border border-[#dfe5ed] bg-white px-2.5 py-1.5 text-[9px] font-semibold text-[#38445f]">{action}</button>}
      </div>
      <div className="px-3.5 pb-2">{children}</div>
    </section>
  );
}

function Avatar({ text }: { text: string }) {
  const colors = ["bg-[#6737dc]","bg-[#347fe0]","bg-[#a950b9]","bg-[#27354c]","bg-[#ef9b21]"];
  const n = (text || "").charCodeAt(0) % colors.length;
  return <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white ${colors[n]}`}>{text}</span>;
}

function Badge({ text, tone="blue", dot=false }: { text: string; tone?: string; dot?: boolean }) {
  const map: Record<string, string> = {
    blue:"bg-[#eef5ff] text-[#4674b5]", purple:"bg-[#f0edff] text-[#6240c9]",
    green:"bg-[#e4f8ef] text-[#18a978]", orange:"bg-[#fff2dc] text-[#d98b17]",
    pink:"bg-[#ffeaf3] text-[#df5b92]"
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${map[tone]}`}>{dot&&<i className="h-1.5 w-1.5 rounded-full bg-current"/>}{text}</span>;
}

function Goal({ Icon, title, desc, tone = "purple" }: { Icon: LucideIcon | IconType; title: string; desc: string; tone?: string }) {
  return <div className="mb-3 flex items-center gap-3 last:mb-0"><IconBadge Icon={Icon} tone={tone} size={16}/><div><b className="block text-[9px] text-[#38435e]">{title}</b><small className="text-[9px] text-[#8993a5]">{desc}</small></div></div>;
}

function ChannelMiniList() {
  const channels: [string, LucideIcon | IconType, string, string][] = [
    ["Meta & Instagram", FaInstagram, "@mokshasewa", "#E1306C"],
    ["LinkedIn", FaLinkedin, "Moksha Sewa", "#0A66C2"],
    ["Google Business", FaGoogle, "Moksha Sewa (Delhi)", "#4285F4"],
    ["WhatsApp", FaWhatsapp, "+91 98765 43210", "#25D366"],
    ["YouTube", FaYoutube, "@MokshaSewa", "#FF0000"],
    ["Website", Globe2, "https://mokshasewa.org", "#60708d"],
    ["Google Search Console", BarChart3, "Connected", "#4285F4"],
  ];
  return <div>{channels.map(([n, I, a, color]) => <div key={n} className="grid h-8 grid-cols-[25px_1fr_1fr_16px] items-center gap-2 border-b border-[#eef1f5] text-[9px] last:border-0"><I className="shrink-0" style={{ color }} size={15}/><b>{n}</b><span className="truncate text-[#7f899d]">{a}</span><MoreVertical size={16}/></div>)}</div>;
}

function RecentActivity() {
  const activities = [
    { title: "Posted on Instagram", desc: "Every life matters. ❤️ #MokshaSewa", time: "3 hours ago", Icon: FaInstagram, bg: "bg-[#fce4f0]", color: "text-[#e1306c]" },
    { title: "New Lead Received", desc: "Donation inquiry from Rakesh Mehta", time: "6 hours ago", Icon: UsersRound, bg: "bg-[#edf5ff]", color: "text-[#3485df]" },
    { title: "SEO Audit Completed", desc: "Site health score improved to 86", time: "1 day ago", Icon: BarChart3, bg: "bg-[#e8faf2]", color: "text-[#19a978]" },
    { title: "Replied to Google Review", desc: "Thanked user for their kind words", time: "2 days ago", Icon: FaGoogle, bg: "bg-[#e8f5e9]", color: "text-[#34a853]" },
    { title: "Campaign Published", desc: "Dignity for Every Life campaign is live", time: "3 days ago", Icon: CampaignIcon, bg: "bg-[#fff5e7]", color: "text-[#ef9b21]" },
  ];
  return <div>{activities.map((a) => <div key={a.title} className="flex items-center gap-2 border-b border-[#eef1f5] py-2 last:border-0"><span className={`grid h-7 w-7 place-items-center rounded-full ${a.bg} ${a.color}`}><a.Icon size={13}/></span><div className="min-w-0 flex-1"><b className="block text-[9px]">{a.title}</b><small className="block truncate text-[9px] text-[#8993a5]">{a.desc}</small></div><small className="text-[9px] text-[#8993a5]">{a.time}</small></div>)}</div>;
}

function Note({ initials, name, time, children }: { initials: string; name: string; time: string; children: ReactNode }) {
  return <div className="flex gap-2 border-b border-[#eef1f5] py-2 last:border-0"><Avatar text={initials}/><div><b className="text-[9px]">{name}</b><small className="ml-2 text-[9px] text-[#8993a5]">{time}</small><p className="mt-1 text-[9px] leading-[1.45] text-[#707c91]">{children}</p></div></div>;
}

function LogPanel({ title, rows }: { title: string; rows: string[] }) {
  return <Panel title={title} action="View All"><div className="overflow-hidden rounded border border-[#eef1f5]">{rows.map((x,i)=><div key={x} className="grid grid-cols-[110px_40px_1fr_1fr] items-center border-b border-[#eef1f5] px-2 py-1.5 text-[9px] last:border-0"><span>Jan {16-i}, 11:24 AM</span><Avatar text={["PS","NG","RV","MS","AS"][i]!}/><b>{x}</b><span className="text-[#7f899d]">{i%2?"SEO score: 86":"Instagram post"}</span></div>)}</div></Panel>;
}

function ModuleGrid() {
  const modules: { name: string; icon: LucideIcon | IconType; color: string; colorText: string }[] = [
    { name: "SEO", icon: Search, color: "bg-[#e8f0fe]", colorText: "text-[#4285f4]" },
    { name: "Meta & Instagram", icon: FaInstagram, color: "bg-[#fce4f0]", colorText: "text-[#e1306c]" },
    { name: "LinkedIn", icon: FaLinkedin, color: "bg-[#e8f0fe]", colorText: "text-[#0a66c2]" },
    { name: "Google Business", icon: FaGoogle, color: "bg-[#e8f5e9]", colorText: "text-[#34a853]" },
    { name: "WhatsApp", icon: FaWhatsapp, color: "bg-[#e8f5e9]", colorText: "text-[#25d366]" },
    { name: "YouTube", icon: FaYoutube, color: "bg-[#ffe9e9]", colorText: "text-[#ff0000]" },
    { name: "Website", icon: Globe2, color: "bg-[#e8f0fe]", colorText: "text-[#4285f4]" },
    { name: "Campaigns", icon: Megaphone, color: "bg-[#f0ebff]", colorText: "text-[#6d35df]" },
    { name: "Leads", icon: UserPlus, color: "bg-[#fff0f4]", colorText: "text-[#ef4b78]" },
    { name: "Reports", icon: BarChart3, color: "bg-[#eef5ff]", colorText: "text-[#3485df]" },
  ];
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{modules.map((m,i)=><div key={m.name} className="rounded border border-[#e7ebf1] p-2"><div className="flex items-center gap-2"><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${m.color} ${m.colorText}`}><m.icon size={12}/></span><b className="text-[9px]">{m.name}</b></div><small className="mt-1 block text-[9px] text-[#8993a5]">{i+4} members</small><Badge text="Enabled" tone="green" dot/></div>)}</div>;
}

function WorkflowCard({ title, tone }: { title: string; tone: string }) {
  return <div className="mb-2 rounded border border-[#e8ecf2] p-2 last:mb-0"><div className="flex items-center gap-2"><IconBadge Icon={tone==="pink"?Megaphone:FileText} tone={tone==="pink"?"pink":"purple"} size={14}/><div><b className="text-[9px]">{title}</b><small className="block text-[9px] text-[#8993a5]">{tone==="pink"?"Paid campaigns, major initiatives":"Social media posts, blogs, website content"}</small></div></div><div className="mt-2 space-y-1.5 text-[9px]"><div><b>1</b>　Content Creator　 <span className="text-[#8993a5]">Creates content</span></div><div><b>2</b>　Content Approver　 <span className="text-[#8993a5]">Reviews & approves</span></div><div><b>3</b>　Client Owner　 <span className="text-[#8993a5]">Final approval</span></div></div></div>;
}

function OwnerList() {
  const owners: { channel: string; name: string; initials: string; icon: LucideIcon | IconType; color: string }[] = [
    { channel: "Meta & Instagram", name: "Sneha Nair", initials: "SN", icon: FaInstagram, color: "text-[#e1306c]" },
    { channel: "LinkedIn", name: "Sneha Nair", initials: "SN", icon: FaLinkedin, color: "text-[#0a66c2]" },
    { channel: "Google Business", name: "Rahul Kumar", initials: "RK", icon: FaGoogle, color: "text-[#34a853]" },
    { channel: "YouTube", name: "Arjun Mehta", initials: "AR", icon: FaYoutube, color: "text-[#ff0000]" },
    { channel: "Website", name: "Priya Desai", initials: "PS", icon: Globe2, color: "text-[#4285f4]" },
    { channel: "WhatsApp", name: "Vikram Singh", initials: "VK", icon: FaWhatsapp, color: "text-[#25d366]" },
  ];
  return <div>{owners.map((o)=><div key={o.channel} className="flex items-center gap-2 border-b border-[#eef1f5] py-1.5 last:border-0"><o.icon size={14} className={o.color}/><b className="flex-1 text-[9px]">{o.channel}</b><span className="text-[9px]">{o.name}</span><Avatar text={o.initials}/><MoreVertical size={11}/></div>)}</div>;
}

function ContactMini({ initials, name, role }: { initials: string; name: string; role: string }) {
  return <div className="flex gap-2 border-b border-[#eef1f5] py-1.5 last:border-0"><Avatar text={initials}/><div><b className="block text-[9px]">{name}</b><small className="text-[9px] text-[#8993a5]">{role}</small><small className="mt-1 block text-[9px] text-[#5d36d6]">+91 98102 34567</small></div></div>;
}

function InfoRows({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
  return <div>{rows.map(([a, b]) => <div key={a} className="grid grid-cols-[42%_58%] gap-2 border-b border-[#f0f2f6] py-1.5 last:border-0"><span className="text-[9px] text-[#778399]">{a}</span><b className={`text-[9px] font-medium ${String(b).includes("●") ? "text-[#18a978]" : "text-[#45516b]"}`}>{b}</b></div>)}</div>;
}

function CheckList({ items }: { items: string[] }) {
  return <div>{items.map(x=><div key={x} className="mb-2 flex items-center gap-2 text-[9px] text-[#56627b] last:mb-0"><span className="grid h-4 w-4 place-items-center rounded bg-[#dff7ea] text-[#13a874]"><Check size={10}/></span>{x}</div>)}</div>;
}

function BulletList({ items }: { items: string[] }) {
  return <ul className="m-0 space-y-1.5 pl-4 text-[9px] text-[#626e84]">{items.map(x=><li key={x}>{x}</li>)}</ul>;
}

function QuoteBox({ text }: { text: string }) {
  return <div className="rounded-md bg-[#f4f0ff] px-3 py-2 text-[9px] leading-[1.45] text-[#59647b]">“ {text} ”</div>;
}

function BrandGuidelines() {
  return <Panel title="Brand Guidelines" action="Edit">
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <div className="grid h-[105px] place-items-center rounded border border-[#e7ebf1] p-2"><img src="/brand/moksha-sewa-logo.png" alt="Moksha Sewa" className="max-h-full max-w-full object-contain" /></div>
      <div className="text-[9px] text-[#67738b]"><b>Brand Colors</b><div className="mt-2 flex gap-2"><span className="h-5 w-5 rounded bg-[#7b3f98]"/><span className="h-5 w-5 rounded bg-[#f57373]"/><span className="h-5 w-5 rounded bg-[#2e7d32]"/><span className="h-5 w-5 rounded bg-[#f8f9fa] border"/></div><b className="mt-3 block">Brand Tone</b><div className="mt-1 flex flex-wrap gap-1"><Badge text="Compassionate" tone="purple"/><Badge text="Trustworthy" tone="blue"/><Badge text="Human-Centric" tone="green"/></div></div>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded bg-[#f7f2ff] p-2 text-center text-[9px] font-bold">“Support a Dignified Goodbye”<button className="mt-2 block mx-auto rounded bg-[#6030d8] px-3 py-1.5 text-white">Donate Now →</button></div><div><b className="text-[9px]">Uploaded Assets</b><p className="text-[9px] text-[#798499]">MokshaSewa_Logo.png<br/>Brand_Guidelines.pdf<br/>Banner_Image.jpg</p></div></div>
  </Panel>;
}

function App({ projectId: _projectId }: { projectId?: string } = {}) {
  const [activeTab, setActiveTab] = useState("Overview");

  const content = {
    "Overview": <OverviewView/>,
    "Business Details": <BusinessView/>,
    "Team & Permissions": <TeamView/>,
    "Channels & Integrations": <ChannelsView/>,
    "Activity": <ActivityView/>,
  }[activeTab];

  return (
    <div className="bg-[#f4f7fb] font-sans text-[#26324d]">
      <div className="">
        <ClientHeader activeTab={activeTab} setActiveTab={setActiveTab}/>
        <div className="mt-2.5 space-y-2.5">{content}</div>
      </div>
    </div>
  );
}

export { App as ProjectDetailPage };
export default App;
