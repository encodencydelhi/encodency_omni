"use client";

import React, { useMemo, useState } from "react";
import IndiaMap from "./components/india-map";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  FolderKanban,
  Heart,
  Info,
  Link2,
  List,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";

/**
 * CampaignPage
 * ---------------------------------------------------------------------------
 * Drop this component into the existing application layout.
 *
 * IMPORTANT:
 * - No sidebar
 * - No topbar
 * - No footer
 * - No outer application shell
 *
 * The screenshots are 1600 x 900. This page is intentionally built as the
 * inner workspace that sits inside the existing layout.
 *
 * Dependency:
 *   npm i lucide-react
 *
 * Tailwind CSS is used for all layout/styling.
 */

type Tab =
  | "Overview"
  | "Performance"
  | "Content & Schedule"
  | "Leads"
  | "Audience"
  | "Budget"
  | "Activity Log";

const tabs: Tab[] = [
  "Overview",
  "Performance",
  "Content & Schedule",
  "Leads",
  "Audience",
  "Budget",
  "Activity Log",
];

const campaignImage = "/campaign.png";

const platformMeta = {
  instagram: { label: "Instagram", color: "#E1306C" },
  facebook: { label: "Facebook", color: "#1877F2" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  youtube: { label: "YouTube", color: "#FF0000" },
  google: { label: "Google Business", color: "#4285F4" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  website: { label: "Website", color: "#2563EB" },
};

function BrandIcon({
  platform,
  size = 16,
}: {
  platform: keyof typeof platformMeta;
  size?: number;
}) {
  const c = platformMeta[platform].color;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  } as React.SVGProps<SVGSVGElement>;

  if (platform === "instagram") {
    return (
      <svg {...common}>
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" stroke={c} strokeWidth="2.2" />
        <circle cx="12" cy="12" r="4.1" stroke={c} strokeWidth="2.2" />
        <circle cx="17.7" cy="6.6" r="1.1" fill={c} />
      </svg>
    );
  }
  if (platform === "facebook") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" fill={c} />
        <path d="M13.3 20v-7h2.4l.36-2.7H13.3V8.57c0-.78.22-1.3 1.38-1.3h1.48V4.86c-.26-.04-1.16-.11-2.22-.11-2.2 0-3.7 1.34-3.7 3.8v1.75H7.75V13h2.49v7h3.06Z" fill="white" />
      </svg>
    );
  }
  if (platform === "linkedin") {
    return (
      <svg {...common}>
        <rect x="2" y="2" width="20" height="20" rx="4" fill={c} />
        <path d="M7 9.1V17H4.5V9.1H7ZM5.75 5.2a1.48 1.48 0 1 1 0 2.96 1.48 1.48 0 0 1 0-2.96ZM9.1 9.1h2.4v1.08h.04c.33-.62 1.15-1.28 2.37-1.28 2.53 0 3 1.66 3 3.82V17h-2.5v-3.8c0-.91-.02-2.08-1.27-2.08-1.27 0-1.46.99-1.46 2.01V17H9.1V9.1Z" fill="white" />
      </svg>
    );
  }
  if (platform === "youtube") {
    return (
      <svg {...common}>
        <rect x="2" y="5.3" width="20" height="13.4" rx="4.2" fill={c} />
        <path d="m10.3 9.1 5.1 2.9-5.1 2.9V9.1Z" fill="white" />
      </svg>
    );
  }
  if (platform === "whatsapp") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" fill={c} />
        <path d="M8.3 7.8c.22-.28.52-.31.81-.2l1.05.44c.28.12.45.35.52.65l.25 1.03c.06.27-.02.55-.22.74l-.55.53c.78 1.38 1.85 2.45 3.23 3.23l.53-.55c.19-.2.47-.28.74-.22l1.03.25c.3.07.53.24.65.52l.44 1.05c.11.29.08.59-.2.81-.42.34-1.03.75-1.72.72-1.4-.07-3.25-1.05-4.9-2.7-1.65-1.65-2.63-3.5-2.7-4.9-.03-.69.38-1.3.72-1.72Z" fill="white" />
      </svg>
    );
  }
  if (platform === "google") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" fill="white" stroke="#D9E1EF" />
        <path d="M19.9 12.2c0-.58-.05-1.02-.16-1.49H12v2.82h4.53c-.09.7-.65 1.76-1.86 2.47l-.02.09 2.33 1.8.16.02c1.55-1.43 2.76-3.54 2.76-5.71Z" fill="#4285F4" />
        <path d="M12 20c2.22 0 4.08-.73 5.44-1.99l-2.59-2c-.69.48-1.63.82-2.85.82-2.17 0-4.01-1.43-4.67-3.41l-.08.01-2.42 1.87-.03.08C6.15 18.11 8.78 20 12 20Z" fill="#34A853" />
        <path d="M7.33 13.42A4.93 4.93 0 0 1 7.06 12c0-.49.09-.97.25-1.42l-.01-.1-2.45-1.9-.08.04A8 8 0 0 0 4 12c0 1.21.29 2.35.79 3.38l2.54-1.96Z" fill="#FBBC05" />
        <path d="M12 7.17c1.55 0 2.61.67 3.21 1.23l2.34-2.28C16.07 4.79 14.22 4 12 4 8.78 4 6.15 5.89 4.77 8.62l2.54 1.96C7.99 8.6 9.83 7.17 12 7.17Z" fill="#EA4335" />
      </svg>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-[5px] font-bold"
      style={{ color: c, width: size, height: size, fontSize: Math.max(9, size * 0.65) }}
    >
      W
    </span>
  );
}

const iconTone: Record<string, string> = {
  blue: "bg-[#eff6ff] text-[#1677e8]",
  purple: "bg-[#f4efff] text-[#7c3aed]",
  green: "bg-[#edfff7] text-[#17a86b]",
  red: "bg-[#fff0f1] text-[#ef4444]",
  orange: "bg-[#fff7ed] text-[#f59e0b]",
};

function SoftIcon({
  icon: Icon,
  tone = "blue",
  size = 34,
}: {
  icon: React.ElementType;
  tone?: keyof typeof iconTone;
  size?: number;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${iconTone[tone]}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.max(15, size * 0.45)} strokeWidth={1.8} />
    </span>
  );
}

function StatusPill({
  children,
  tone = "green",
  fixed = false,
}: {
  children: React.ReactNode;
  tone?: "green" | "blue" | "red" | "orange" | "gray" | "purple";
  fixed?: boolean;
}) {
  const map = {
    green: "bg-[#e9fbf2] text-[#0da765]",
    blue: "bg-[#edf5ff] text-[#1976e8]",
    red: "bg-[#fff0f1] text-[#e53e3e]",
    orange: "bg-[#fff5df] text-[#d99000]",
    gray: "bg-[#f2f4f7] text-[#64748b]",
    purple: "bg-[#f4efff] text-[#7642d7]",
  };
  return (
    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[9px] font-semibold ${map[tone]} ${fixed ? "min-w-[72px]" : ""}`}>
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-[10px] border border-[#e5ebf3] bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-[#edf1f6] px-3 py-2">
          <h3 className="text-[12px] font-bold text-[#12234a]">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function MetricCard({
  icon,
  tone,
  label,
  value,
  change,
  sub,
  down = false,
}: {
  icon: React.ElementType;
  tone: keyof typeof iconTone;
  label: string;
  value: string;
  change?: string;
  sub?: string;
  down?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[10px] border border-[#e7edf5] bg-white px-2.5 py-2">
      <SoftIcon icon={icon} tone={tone} size={32} />
      <div className="min-w-0">
        <div className="text-[9px] font-medium text-[#74819a]">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold tracking-[-0.02em] text-[#142653]">{value}</span>
          {change && (
            <span className={`text-[9px] font-bold ${down ? "text-[#ef4444]" : "text-[#16a66b]"}`}>
              {down ? <ArrowDownRight className="mr-0.5 inline" size={10} /> : <ArrowUpRight className="mr-0.5 inline" size={10} />}
              {change}
            </span>
          )}
        </div>
        {sub && <div className="mt-0.5 text-[9px] text-[#8792a7]">{sub}</div>}
      </div>
    </div>
  );
}

function MiniLine({
  values,
  stroke = "#2d78e8",
  fill = false,
  height = 60,
}: {
  values: number[];
  stroke?: string;
  fill?: boolean;
  height?: number;
}) {
  const w = 300;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = 7 + ((max - v) / Math.max(1, max - min)) * (height - 14);
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${height} ${points} ${w},${height}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-full w-full">
      {fill && <polygon points={area} fill={stroke} opacity="0.08" />}
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MultiLineChart({
  series,
  labels,
  height = 145,
}: {
  series: { name: string; color: string; values: number[] }[];
  labels: string[];
  height?: number;
}) {
  const w = 690;
  const h = height;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all);
  const min = 0;
  const grid = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
        {grid.map((r) => {
          const y = 8 + r * (h - 28);
          return <line key={r} x1="0" x2={w} y1={y} y2={y} stroke="#e8edf4" strokeWidth="1" />;
        })}
        {series.map((s) => {
          const pts = s.values.map((v, i) => {
            const x = (i / (s.values.length - 1)) * w;
            const y = 8 + ((max - v) / Math.max(max - min, 1)) * (h - 28);
            return `${x},${y}`;
          }).join(" ");
          return <polyline key={s.name} points={pts} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-[9px] text-[#8994a7]">
        {labels.map((x) => <span key={x}>{x}</span>)}
      </div>
    </div>
  );
}

function Donut({
  segments,
  center,
  centerSub,
}: {
  segments: { value: number; color: string; label?: string }[];
  center: string;
  centerSub?: string;
}) {
  let cursor = 0;
  const stops: string[] = [];
  for (const s of segments) {
    const start = cursor;
    const end = cursor + s.value;
    stops.push(`${s.color} ${start}% ${end}%`);
    cursor = end;
  }
  return (
    <div className="relative h-[118px] w-[118px] shrink-0 rounded-full" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
      <div className="absolute inset-[17px] flex flex-col items-center justify-center rounded-full bg-white">
        <span className="text-[17px] font-extrabold text-[#172754]">{center}</span>
        {centerSub && <span className="text-[9px] text-[#7b879b]">{centerSub}</span>}
      </div>
    </div>
  );
}

function BarList({
  rows,
  max,
}: {
  rows: { label: string; value: string; pct: number }[];
  max?: number;
}) {
  const m = max || Math.max(...rows.map((x) => x.pct));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="w-[30px] shrink-0 truncate text-[10px] font-medium text-[#475674]">{r.label.slice(0, 2)}</span>
          <div className="h-[7px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#edf1f6]">
            <div className="h-full rounded-full bg-[#4b90ea]" style={{ width: `${(r.pct / m) * 100}%` }} />
          </div>
          <span className="w-[50px] shrink-0 text-right text-[10px] font-semibold text-[#6b7890]">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function TopHeader() {
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-[#edf1f5] pb-2.5">
        <div className="flex min-w-0 items-center gap-2 text-[9px] text-[#7d899d]">
          <span>Dashboard</span><ChevronRight size={11} />
          <span>Campaigns</span><ChevronRight size={11} />
          <span className="font-semibold text-[#263a61]">Save Rivers, Save Lives 2025</span>
        </div>
        <div className="hidden items-center gap-1.5 lg:flex">
          <button className="action-btn"><Pencil size={13} /> Edit Campaign</button>
          <button className="action-btn"><Copy size={13} /> Duplicate</button>
          <button className="action-btn"><Pause size={13} /> Pause</button>
          <button className="action-btn"><Download size={13} /> Export Report</button>
          <button className="action-btn px-2"><MoreHorizontal size={15} /></button>
        </div>
      </div>

      <div className="relative flex min-h-[112px] items-start gap-3 overflow-hidden pt-3">
        <img src={campaignImage} alt="" className="h-[102px] w-[126px] rounded-[8px] object-cover shadow-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[23px] font-extrabold tracking-[-0.03em] text-[#0f204b]">Save Rivers, Save Lives 2025</h1>
            <StatusPill tone="green"><span className="mr-1 h-1.5 w-1.5 rounded-full bg-[#16b86d]" />Active</StatusPill>
          </div>
          <p className="mt-1 max-w-[620px] text-[11px] leading-[1.35] text-[#7a879b]">
            A nationwide awareness campaign to promote river conservation, inspire community action and drive support for a cleaner, healthier India.
          </p>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <InfoChip icon={Heart} label="Campaign Type" value="Awareness" tone="red" />
            <InfoChip icon={FolderKanban} label="Project" value="Moksha Sewa" tone="purple" />
            <InfoChip icon={CalendarDays} label="Date Range" value="Mar 15, 2025 – Apr 30, 2025" note="46 days left" tone="blue" />
            <InfoChip icon={User} label="Campaign Owner" value="Manish Sirohi" note="Campaign Owner" tone="blue" />
          </div>
        </div>

        <div className="hidden min-w-[200px] max-w-[240px] self-center lg:block">
          <img src="/campaignBanner.png" alt="Campaign Banner" className="h-[80px] w-full rounded-[8px] object-cover" />
        </div>
      </div>

      <div className="tabs-scroll mt-1 flex flex-nowrap items-end gap-1 overflow-x-auto border-b border-[#dfe6ef] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <TabButton key={tab} tab={tab} />
        ))}
      </div>
    </>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
  note,
  tone = "blue",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  note?: string;
  tone?: keyof typeof iconTone;
}) {
  return (
    <div className="flex min-w-[125px] items-center gap-2 rounded-[8px] border border-[#e8edf4] bg-white/90 px-2 py-1.5">
      <SoftIcon icon={Icon} tone={tone} size={29} />
      <div className="min-w-0">
        <div className="text-[8.5px] font-medium text-[#8792a6]">{label}</div>
        <div className="truncate text-[9.5px] font-bold text-[#26375d]">{value}</div>
        {note && <div className="text-[8px] text-[#8b96a9]">{note}</div>}
      </div>
    </div>
  );
}

function TabButton({ tab }: { tab: Tab }) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  // This component is replaced by CampaignPage's inline tab rendering.
  return null;
}

function RightRail({ showPerformanceScore = false, activeTab = "Overview" }: { showPerformanceScore?: boolean; activeTab?: string }) {
  return (
    <aside className="space-y-2.5">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="text-[12px] font-bold text-[#13244d]">Campaign Summary</h3>
          <button className="text-[10px] font-semibold text-[#1f76e7]">Edit</button>
        </div>
        <div className="flex gap-2.5 px-3 pb-3">
          <img src={campaignImage} className="h-[86px] w-[73px] rounded-[6px] object-cover" alt="" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold leading-[1.15] text-[#182951]">Save Rivers,<br />Save Lives 2025</div>
            <StatusPill tone="green">● Active</StatusPill>
            <div className="mt-2 space-y-1 text-[9px] text-[#748197]">
              <div className="flex justify-between gap-2"><span>Project</span><b className="text-[#4d5c76]">Moksha Sewa</b></div>
              <div className="flex justify-between gap-2"><span>Type</span><b className="text-[#4d5c76]">Awareness</b></div>
              <div className="flex justify-between gap-2"><span>Start Date</span><b className="text-[#4d5c76]">Mar 15, 2025</b></div>
              <div className="flex justify-between gap-2"><span>End Date</span><b className="text-[#4d5c76]">Apr 30, 2025</b></div>
              {activeTab === "Budget" ? (
                <>
                  <div className="flex justify-between gap-2"><span>Total</span><b className="text-[#4d5c76]">₹48,250</b></div>
                  <div className="flex justify-between gap-2"><span>Spent</span><b className="text-[#4d5c76]">₹42,830 (88.7%)</b></div>
                </>
              ) : (
                <>
                  <div className="flex justify-between gap-2"><span>Total Budget</span><b className="text-[#4d5c76]">₹50,000</b></div>
                  <div className="flex justify-between gap-2"><span>Spent</span><b className="text-[#4d5c76]">₹48,250 (96%)</b></div>
                </>
              )}
              <div className="flex justify-between gap-2"><span>Owner</span><b className="text-[#4d5c76]">Manish Sirohi</b></div>
            </div>
          </div>
        </div>
      </Card>

      {activeTab === "Overview" && (
      <Card title="Budget Utilization" action={<button className="text-[10px] font-semibold text-[#1d77e7]">View Details</button>}>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="text-[16px] font-extrabold text-[#1b2a50]">₹48,250 <span className="text-[10px] font-medium text-[#8490a4]">/ ₹50,000</span></div>
            <b className="text-[13px] text-[#26375d]">96%</b>
          </div>
          <div className="mt-2 h-[7px] rounded-full bg-[#e8eef4]"><div className="h-full w-[96%] rounded-full bg-[#17ae70]" /></div>
          <div className="mt-2 flex justify-between text-[9px] text-[#718099]"><span>₹48,250 Spent</span><span>₹1,750 Remaining</span></div>
          <div className="mt-2 rounded-[7px] bg-[#effbf5] px-2 py-1.5 text-[9px] text-[#25935f]">You are 8% under budget. Great pacing!</div>
        </div>
      </Card>
      )}

      {activeTab === "Budget" && (
      <>
      <Card title="Budget Utilization" action={<button className="text-[10px] font-semibold text-[#1d77e7]">View Details</button>}>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="text-[16px] font-extrabold text-[#1b2a50]">₹42,830 <span className="text-[10px] font-medium text-[#8490a4]">/ ₹48,250</span></div>
            <b className="text-[13px] text-[#26375d]">88%</b>
          </div>
          <div className="mt-2 h-[7px] rounded-full bg-[#e8eef4]"><div className="h-full w-[88%] rounded-full bg-[#17ae70]" /></div>
          <div className="mt-2 flex justify-between text-[9px] text-[#718099]"><span>● ₹42,830 Spent</span><span>● ₹5,420 Remaining</span></div>
        </div>
      </Card>

      <Card title="Alerts & Notifications" action={<button className="text-[10px] font-semibold text-[#1d77e7]">View All</button>}>
        <div className="divide-y divide-[#edf1f5]">
          {[
            { icon: AlertCircle, title: "Approaching budget limit", note: "88% of budget spent", tag: "Watch", tagColor: "bg-[#fef3e6] text-[#d97706]" },
            { icon: TrendingDown, title: "YouTube underperforming", note: "24% below planned spend", tag: "Review", tagColor: "bg-[#fef3e6] text-[#d97706]" },
            { icon: CheckCircle2, title: "Good pacing", note: "Daily spend 22% below plan", tag: "Good", tagColor: "bg-[#e9fbf3] text-[#17a96b]" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-2 px-3 py-2.5">
              <item.icon size={15} className="mt-0.5 text-[#6b7890]" />
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-semibold text-[#334464]">{item.title}</div>
                <div className="mt-0.5 text-[8.5px] text-[#8792a6]">{item.note}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-semibold ${item.tagColor}`}>{item.tag}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Optimization Suggestions" action={<button className="text-[10px] font-semibold text-[#1d77e7]">View All</button>}>
        <div className="divide-y divide-[#edf1f5]">
          {[
            { title: "Reallocate budget to Meta", note: "+24% better cost per lead", btn: "Apply", btnColor: "bg-[#1979e9] text-white" },
            { title: "Increase budget for Website", note: "High conversion rate (5.2%)", btn: "Consider", btnColor: "bg-[#f0f4ff] text-[#1d77e7] border border-[#d0daf0]" },
            { title: "Pause low-performing YouTube ad", note: "Save ₹1,200 in remaining period", btn: "Review", btnColor: "bg-[#f0f4ff] text-[#1d77e7] border border-[#d0daf0]" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-2 px-3 py-2.5">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-[#f59e0b]" />
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-semibold text-[#334464]">{item.title}</div>
                <div className="mt-0.5 text-[8.5px] text-[#8792a6]">{item.note}</div>
              </div>
              <button className={`shrink-0 rounded-[5px] px-2 py-1 text-[8px] font-semibold ${item.btnColor}`}>{item.btn}</button>
            </div>
          ))}
        </div>
      </Card>
      </>
      )}

      {showPerformanceScore && (
      <Card title="Performance Score">
        <div className="flex items-center gap-3 p-3">
          <div className="relative h-[72px] w-[72px] shrink-0 rounded-full" style={{background:"conic-gradient(#16aa67 0 82%, #e8edf3 82% 100%)"}}>
            <div className="absolute inset-[7px] flex flex-col items-center justify-center rounded-full bg-white">
              <b className="text-[16px] text-[#26375b]">82</b><span className="text-[8px] text-[#8994a8]">/100</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-bold text-[#17a96b]">↑ 12%</span>
            </div>
            <div className="mt-0.5 text-[9px] text-[#8290a4]">vs last period</div>
            <div className="mt-1.5 rounded-[5px] bg-[#edfbf3] px-2 py-1 text-[9px] font-semibold text-[#17a96b]">Great Performance</div>
          </div>
        </div>
      </Card>
      )}

      {(activeTab === "Performance" || activeTab === "Overview") && (
      <Card title="Quick Notes & Alerts" action={<button className="text-[10px] font-semibold text-[#1d77e7]">View All →</button>}>
        <div className="divide-y divide-[#edf1f5]">
          <AlertRow icon={AlertCircle} title="CTR dropping on LinkedIn" note="-18% vs last week" tone="red" tag="High" />
          <AlertRow icon={Info} title="YouTube not connected" note="Connect to track complete performance" tone="orange" tag="Medium" />
          <AlertRow icon={Info} title="Budget pacing ahead of schedule" note="You used 96% of budget" tone="blue" tag="Medium" />
          <AlertRow icon={CheckCircle2} title="No major issues" note="Campaign running smoothly" tone="green" tag="Good" />
        </div>
      </Card>
      )}

      {activeTab === "Performance" && (
      <Card title="Optimization Recommendations" action={<button className="text-[10px] font-semibold text-[#1d77e7]">View All →</button>}>
        <div className="divide-y divide-[#edf1f5]">
          <Recommendation title="Increase budget on high-performing Meta & Instagram" detail="20% more conversions" />
          <Recommendation title="Create more short-form video content" detail="Similar creatives show 2.3× higher CTR" />
          <Recommendation title="Focus targeting on top 5 states" detail="UP, Delhi, Maharashtra, Karnataka, Bihar" />
        </div>
      </Card>
      )}

      {activeTab === "Content & Schedule" && (
      <>
      <Card title="Publishing Rules" action={<button className="text-[10px] font-semibold text-[#1d77e7]">Edit</button>}>
        <div className="divide-y divide-[#edf1f5]">
          {[
            { icon: Clock3, label: "Posting Window", value: "08:00 AM – 08:00 PM (IST)" },
            { icon: CalendarDays, label: "Max Posts Per Day", value: "3 per channel" },
            { icon: Users, label: "Audience Focus", value: "India (Urban & Semi-Urban)" },
            { icon: Copy, label: "Mandatory Hashtags", value: "#CleanRivers #MokshaSewa" },
            { icon: CheckCircle2, label: "Content Approval", value: "Required before publishing" },
            { icon: FileText, label: "Language", value: "English & Hindi" },
          ].map((rule) => (
            <div key={rule.label} className="flex items-start gap-2 px-3 py-2">
              <rule.icon size={14} className="mt-0.5 text-[#6b7890]" />
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-semibold text-[#334464]">{rule.label}</div>
                <div className="mt-0.5 text-[8.5px] text-[#8792a6]">{rule.value}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Content Checklist">
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[9px] text-[#718099]">Progress</span>
            <span className="text-[10px] font-bold text-[#334464]">6/8</span>
          </div>
          <div className="mb-3 h-[5px] overflow-hidden rounded-full bg-[#edf1f6]">
            <div className="h-full w-[75%] rounded-full bg-[#17ae70]" />
          </div>
          <div className="space-y-2">
            {[
              { text: "Campaign key visuals created", done: true },
              { text: "Channel-specific captions", done: true },
              { text: "Hashtags & UTM links added", done: true },
              { text: "Alt text for accessibility", done: true },
              { text: "Approved by client", done: true },
              { text: "Scheduled in calendar", done: true },
              { text: "Community response plan", done: false },
              { text: "Performance tracking setup", done: false },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-[#17ae70] text-white" : "border border-[#d1d9e6] bg-white"}`}>
                  {item.done && <Check size={10} />}
                </span>
                <span className={`text-[9px] ${item.done ? "text-[#475674]" : "text-[#8792a6]"}`}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
      </>
      )}

      {(activeTab === "Leads" || activeTab === "Audience") && (
      <>
      <Card title="Target Audience Definition" action={<button className="text-[10px] font-semibold text-[#1d77e7]">Edit</button>}>
        <div className="p-3 space-y-2.5">
          {[
            { icon: MapPin, label: "Location", value: "India (Urban & Semi-Urban)" },
            { icon: Users, label: "Age Group", value: "18–65 years" },
            { icon: Users, label: "Gender", value: "All genders" },
            { icon: Heart, label: "Interests", value: "Environment, Sustainability, Rivers, Clean Water, Climate Action" },
            { icon: MessageCircle, label: "Languages", value: "English, Hindi + Regional" },
            { icon: Target, label: "Audience Size", value: "~2.4M (Estimated)" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-2">
              <item.icon size={14} className="mt-0.5 shrink-0 text-[#6b7890]" />
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-semibold text-[#334464]">{item.label}</div>
                <div className="mt-0.5 text-[8.5px] text-[#8792a6]">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Best Performing Segment">
        <div className="p-3">
          <div className="rounded-[7px] border border-[#e6ebf2] bg-[#f8fafc] p-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e9fbf3]">
                <Target size={14} className="text-[#17a96b]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-[#1b2a50]">18–34, Environment Enthusiasts</div>
                <div className="text-[8.5px] text-[#8792a6]">Highest engagement rate (4.8%)</div>
                <div className="text-[8.5px] font-semibold text-[#17a96b]">2.3x higher than average</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      </>
      )}

      {activeTab === "Activity Log" && (
      <>
      <Card title="Latest Updates" action={<button className="text-[10px] font-semibold text-[#1d77e7]">View All</button>}>
        <div className="divide-y divide-[#edf1f5]">
          {[
            { text: "Content published on Instagram", time: "2 hours ago" },
            { text: "Budget updated to ₹48,250", time: "5 hours ago" },
            { text: "New team member added", time: "1 day ago" },
            { text: "Post scheduled on LinkedIn", time: "2 days ago" },
            { text: "Audience synced (1,260 contacts)", time: "2 days ago" },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-2 px-3 py-2.5">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#17a96b]" />
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-semibold text-[#334464]">{item.text}</div>
                <div className="mt-0.5 text-[8.5px] text-[#8792a6]">{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Collaborators (6)" action={<button className="text-[10px] font-semibold text-[#1d77e7]">Manage</button>}>
        <div className="divide-y divide-[#edf1f5]">
          {[
            { initials: "MS", name: "Manish Sirohi", role: "Campaign Owner", access: "Owner", color: "bg-[#111827]" },
            { initials: "AV", name: "Anjali Verma", role: "Finance Manager", access: "Editor", color: "bg-[#e9f4ff] text-[#2878e8]" },
            { initials: "RM", name: "Rohan Mehta", role: "Project Manager", access: "Editor", color: "bg-[#e9fbf3] text-[#17a96b]" },
            { initials: "SI", name: "Sneha Iyer", role: "Content Writer", access: "Editor", color: "bg-[#f3e8ff] text-[#8b5cf6]" },
            { initials: "NS", name: "Neha Sharma", role: "Social Media Lead", access: "Editor", color: "bg-[#fef3e6] text-[#f59e0b]" },
            { initials: "VS", name: "Vikram Singh", role: "Analyst", access: "Viewer", color: "bg-[#e0f2fe] text-[#0ea5e9]" },
          ].map((user) => (
            <div key={user.name} className="flex items-center gap-2 px-3 py-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${user.color}`}>{user.initials}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-semibold text-[#334464]">{user.name}</div>
                <div className="text-[8.5px] text-[#8792a6]">{user.role}</div>
              </div>
              <StatusPill tone={user.access === "Owner" ? "green" : user.access === "Viewer" ? "green" : "gray"}>{user.access}</StatusPill>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Alerts & Reminders (3)" action={<button className="text-[10px] font-semibold text-[#1d77e7]">View All</button>}>
        <div className="divide-y divide-[#edf1f5]">
          {[
            { icon: AlertCircle, title: "Content approval pending", note: "Aarti currently reviewing", time: "4h ago", color: "text-[#ef4444]" },
            { icon: Info, title: "Budget at 96%", note: "Campaign spending is on track", time: "5h ago", color: "text-[#f59e0b]" },
            { icon: CalendarDays, title: "Scheduled post tomorrow", note: "River Facts Series #3", time: "1d ago", color: "text-[#2878e8]" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-2 px-3 py-2.5">
              <item.icon size={15} className={`mt-0.5 shrink-0 ${item.color}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-semibold text-[#334464]">{item.title}</div>
                <div className="mt-0.5 text-[8.5px] text-[#8792a6]">{item.note}</div>
              </div>
              <span className="shrink-0 text-[8px] text-[#8792a6]">{item.time}</span>
            </div>
          ))}
        </div>
      </Card>
      </>
      )}
    </aside>
  );
}

function AlertRow({
  icon: Icon,
  title,
  note,
  tone,
  tag,
}: {
  icon: React.ElementType;
  title: string;
  note: string;
  tone: "red" | "orange" | "blue" | "green";
  tag: string;
}) {
  const text = { red: "text-[#ef4444]", orange: "text-[#f59e0b]", blue: "text-[#2780e7]", green: "text-[#19aa6c]" }[tone];
  return (
    <div className="flex items-start gap-2 px-3 py-2.5">
      <Icon size={15} className={text} />
      <div className="min-w-0 flex-1">
        <div className="text-[9.5px] font-semibold text-[#334464]">{title}</div>
        <div className="mt-0.5 text-[8.5px] text-[#8a95a8]">{note}</div>
      </div>
      <StatusPill tone={tone === "green" ? "green" : tone === "red" ? "red" : "orange"}>{tag}</StatusPill>
    </div>
  );
}

function Recommendation({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5">
      <SoftIcon icon={Sparkles} tone="orange" size={26} />
      <div className="min-w-0 flex-1">
        <div className="text-[9.5px] font-semibold leading-[1.25] text-[#334464]">{title}</div>
        <div className="mt-0.5 text-[8.5px] text-[#8792a6]">{detail}</div>
      </div>
      <button className="rounded-[5px] bg-[#1978e9] px-2 py-1 text-[9px] font-semibold text-white">Apply</button>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        <MetricCard icon={Users} tone="blue" label="Total Reach" value="86.5K" change="24%" sub="+16.8K vs last month" />
        <MetricCard icon={Eye} tone="purple" label="Impressions" value="142K" change="18%" sub="+21.4K vs last month" />
        <MetricCard icon={User} tone="green" label="Leads" value="248" change="36%" sub="+66 vs last month" />
        <MetricCard icon={Target} tone="green" label="Conversions" value="42" change="28%" sub="+9 vs last month" />
        <MetricCard icon={BarChart3} tone="orange" label="Total Spend" value="₹48,250" change="8%" down sub="8% under budget" />
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1fr_1.5fr]">
        <Card title="Campaign Performance Overview" action={<Select label="Last 30 days" />}>
          <div className="h-[164px] p-3">
            <div className="mb-1 flex gap-4 text-[9px] text-[#687790]">
              <Legend color="#2878e8" label="Reach" /><Legend color="#19a86b" label="Leads" /><Legend color="#7c3aed" label="Conversions" /><Legend color="#ef476f" label="Spend (₹)" />
            </div>
            <MultiLineChart
              labels={["Mar 15", "Mar 22", "Mar 29", "Apr 05", "Apr 12", "Apr 19", "Apr 26"]}
              series={[
                { name: "Reach", color: "#2878e8", values: [12, 17, 23, 29, 32, 39, 47] },
                { name: "Leads", color: "#19a86b", values: [5, 9, 11, 15, 17, 21, 25] },
                { name: "Conversions", color: "#7c3aed", values: [3, 4, 6, 7, 9, 11, 13] },
                { name: "Spend", color: "#ef476f", values: [1, 3, 4, 6, 7, 9, 12] },
              ]}
            />
          </div>
        </Card>

        <Card title="Channel Performance" action={<button className="text-[10px] font-semibold text-[#1c78e7]">View Detailed Report →</button>}>
          <ChannelTable />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1.02fr_1.02fr_1.2fr]">
        <Card title="Campaign Objective & Target" action={<button className="text-[10px] font-semibold text-[#1d77e7]">Edit</button>}>
          <div className="space-y-2 p-3">
            <InfoLine icon={MessageCircle} label="Objective" value="Raise awareness about river conservation and encourage community action" />
            <InfoLine icon={Users} label="Target Audience" value="Environmentally conscious individuals (18–45)" />
            <InfoLine icon={MapPin} label="Target Regions" value="Pan India (Urban & Semi-Urban)" />
            <InfoLine icon={Target} label="Call to Action" value="Join the movement for cleaner rivers" />
            <InfoLine icon={BarChart3} label="Expected Outcome" value="50,000+ reach | 250+ qualified leads" />
            <InfoLine icon={Sparkles} label="Success Metrics" value="Awareness, Engagement, Lead Generation" />
          </div>
        </Card>

        <Card title="Top Performing Creatives" action={<button className="text-[10px] font-semibold text-[#e23b55]">View All →</button>}>
          <div className="grid grid-cols-3 gap-2 p-3">
            {[
              ["Clean Rivers Brighter...", "Image • Awareness", "12.4K", "2.8K", "5.2%"],
              ["Small Actions Big...", "Video • Engagement", "9.8K", "1.4K", "4.9%"],
              ["Our Rivers Our Future", "Image • Community", "8.6K", "1.2K", "3.9%"],
            ].map(([title, type, reach, clicks, ctr], i) => (
              <div key={title} className="overflow-hidden rounded-[7px] border border-[#e6ebf2]">
                <div className="h-[73px] overflow-hidden bg-[#e8f2f7]">
                  <img src={campaignImage} alt="" className="h-full w-full object-cover" style={{ filter: i === 1 ? "saturate(.7)" : undefined }} />
                </div>
                <div className="p-2">
                  <div className="truncate text-[9.5px] font-bold text-[#26375d]">{title}</div>
                  <div className="mt-0.5 text-[8px] text-[#8b96a8]">{type}</div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-[8px]">
                    <div><b className="block text-[#314467]">{reach}</b><span className="text-[#8c97a8]">Reach</span></div>
                    <div><b className="block text-[#314467]">{clicks}</b><span className="text-[#8c97a8]">Clicks</span></div>
                    <div><b className="block text-[#314467]">{ctr}</b><span className="text-[#8c97a8]">CTR</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Scheduled Content" action={<button className="text-[10px] font-semibold text-[#e23b55]">View All →</button>}>
          <SimpleTable
            headers={["Date & Time", "Content", "Channel", "Status"]}
            rows={[
              ["Apr 20, 2025\n10:00 AM", "River Fact Series #3", "instagram", "Scheduled"],
              ["Apr 22, 2025\n02:00 PM", "Volunteer Stories", "youtube", "Scheduled"],
              ["Apr 25, 2025\n11:00 AM", "Save Water Carousel", "linkedin", "Scheduled"],
              ["Apr 28, 2025\n09:00 AM", "Community Event Announcement", "facebook", "Draft"],
            ]}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1.15fr_1fr_1.1fr]">
        <Card title="Leads Snapshot" action={<button className="text-[10px] font-semibold text-[#e23b55]">View All →</button>}>
          <SimpleTable
            headers={["Name", "Source", "Project", "Stage", "Date"]}
            rows={[
              ["Ankit Kumar", "Website", "Moksha Sewa", "New", "Apr 18, 2025"],
              ["Priya Sharma", "Instagram", "Moksha Sewa", "Contacted", "Apr 16, 2025"],
              ["Rahul Mehta", "LinkedIn", "Moksha Sewa", "Qualified", "Apr 14, 2025"],
              ["Sneha Iyer", "Google Business", "Moksha Sewa", "New", "Apr 12, 2025"],
              ["Vikram Singh", "Website", "Moksha Sewa", "Nurturing", "Apr 11, 2025"],
            ]}
          />
        </Card>
        <Card title="Team & Ownership" action={<button className="text-[10px] font-semibold text-[#6b7890]">Edit</button>}>
          <div className="divide-y divide-[#edf1f5]">
            {[
              ["MS", "Manish Sirohi", "Campaign Owner", "Owner"],
              ["AP", "Ankit Verma", "Project Manager", "Editor"],
              ["PS", "Priya Sharma", "Content Lead", "Editor"],
              ["RM", "Rohan Mehta", "Performance Analyst", "Viewer"],
            ].map(([initials, name, role, access]) => (
              <div key={name} className="flex items-center gap-2 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-[9px] font-bold text-white">{initials}</span>
                <div className="min-w-0 flex-1"><b className="block text-[9.5px] text-[#344565]">{name}</b><span className="text-[8.5px] text-[#8994a7]">{role}</span></div>
                <StatusPill tone={access === "Viewer" ? "green" : "gray"}>{access}</StatusPill>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Recent Activity" action={<button className="text-[10px] font-semibold text-[#e23b55]">View All →</button>}>
          <ActivityRows />
        </Card>
      </div>
    </div>
  );
}

function PerformanceTab() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard icon={Users} tone="blue" label="Total Reach" value="86.5K" change="24%" sub="vs 69.8K last period" />
        <MetricCard icon={Eye} tone="purple" label="Impressions" value="142K" change="18%" sub="vs 120K last period" />
        <MetricCard icon={Link2} tone="blue" label="Clicks" value="4.2K" change="32%" sub="vs 3.2K last period" />
        <MetricCard icon={Send} tone="green" label="CTR" value="2.9%" change="18%" sub="vs 2.6% last period" />
        <MetricCard icon={Users} tone="green" label="Leads" value="248" change="36%" sub="vs 182 last period" />
        <MetricCard icon={Activity} tone="green" label="Performance Score" value="82" change="12%" sub="Good performance" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard icon={Target} tone="green" label="Conversions" value="42" change="28%" sub="vs 33 last period" />
        <MetricCard icon={BarChart3} tone="orange" label="Total Spend" value="₹48,250" change="8%" down sub="vs ₹52,600 last period" />
        <MetricCard icon={Search} tone="blue" label="CPL (Cost per Lead)" value="₹194" change="32%" sub="vs ₹285 last period" />
        <MetricCard icon={Target} tone="red" label="CPA (Cost per Acquisition)" value="₹1,149" change="28%" sub="vs ₹1,590 last period" />
        <MetricCard icon={TrendingUp} tone="green" label="ROAS" value="3.8×" change="52%" sub="vs 2.5x last period" />
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1.2fr_1fr]">
        <Card title="Performance Trend" action={<div className="flex gap-1.5"><Select label="Last 30 days" /><Select label="Daily" /></div>}>
          <div className="h-[190px] p-3">
            <div className="mb-2 flex flex-wrap gap-4 text-[9px] text-[#66758e]">
              <Legend color="#2878e8" label="Reach" /><Legend color="#8b5cf6" label="Impressions" /><Legend color="#16a86b" label="Clicks" /><Legend color="#f59e0b" label="Leads" /><Legend color="#ef476f" label="Conversions" />
            </div>
            <MultiLineChart
              labels={["Mar 15", "Mar 18", "Mar 21", "Mar 24", "Mar 27", "Mar 30", "Apr 02", "Apr 05", "Apr 08", "Apr 11", "Apr 14", "Apr 17", "Apr 20", "Apr 23", "Apr 26", "Apr 29"]}
              series={[
                { name: "Reach", color: "#2878e8", values: [12,15,18,17,22,26,25,30,31,34,32,38,41,44,42,47] },
                { name: "Impressions", color: "#8b5cf6", values: [15,20,25,24,30,34,37,39,38,42,40,45,48,46,51,54] },
                { name: "Clicks", color: "#16a86b", values: [3,5,6,7,8,9,10,11,13,12,15,16,17,18,19,21] },
                { name: "Leads", color: "#f59e0b", values: [2,2,3,4,4,5,6,6,7,8,8,9,10,11,12,14] },
                { name: "Conversions", color: "#ef476f", values: [1,1,1,2,2,3,3,4,4,5,5,6,7,7,8,9] },
              ]}
            />
          </div>
        </Card>
        <Card title="Channel Performance">
          <ChannelTable detailed />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        <Card title="Conversion Funnel">
          <div className="space-y-1.5 p-3">
            {[
              { n: "86,502", label: "People Reached", pct: "100%", color: "#5c96eb", topW: 100, bottomW: 100 },
              { n: "4,208", label: "Website Clicks", pct: "4.9%", color: "#5a8fe0", topW: 100, bottomW: 72 },
              { n: "248", label: "Leads Generated", pct: "0.29%", color: "#40c287", topW: 72, bottomW: 46 },
              { n: "42", label: "Conversions", pct: "0.05%", color: "#f0b322", topW: 46, bottomW: 27 },
            ].map((item, idx) => {
              const leftInset = ((100 - item.bottomW) / 2);
              const rightInset = 100 - leftInset;
              const topLeft = ((100 - item.topW) / 2);
              const topRight = 100 - topLeft;
              return (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="relative h-[32px] w-full">
                    <div
                      className="absolute inset-0 rounded-[4px]"
                      style={{
                        background: item.color,
                        clipPath: `polygon(${topLeft}% 0, ${topRight}% 0, ${rightInset}% 100%, ${leftInset}% 100%)`,
                      }}
                    />
                    <div className="relative z-10 flex h-full items-center justify-center text-[10px] font-bold text-white">
                      {item.n}
                    </div>
                  </div>
                  <div className="w-[100px] shrink-0">
                    <b className="block text-[9px] text-[#304365]">{item.label}</b>
                    <span className="text-[8.5px] text-[#8b96a8]">{item.pct}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Audience Geography (Top States)" action={<div className="flex rounded-[5px] bg-[#edf5ff] p-0.5"><button className="rounded bg-white px-2 py-1 text-[9px] font-semibold text-[#2277e8]">States</button><button className="px-2 py-1 text-[9px] text-[#7e8ba0]">Cities</button></div>}>
          <div className="grid grid-cols-[1fr_1.2fr] gap-3 p-3">
            <div className="flex items-center justify-center rounded-[8px] bg-[#f8fbff]">
              <IndiaMap data={[
                { name: "Uttar Pradesh", value: "22.4K", pct: 25.9 },
                { name: "Maharashtra", value: "12.8K", pct: 14.8 },
                { name: "Delhi", value: "10.6K", pct: 12.3 },
                { name: "Karnataka", value: "7.9K", pct: 9.1 },
                { name: "Bihar", value: "6.8K", pct: 7.9 },
                { name: "West Bengal", value: "5.6K", pct: 6.5 },
                { name: "Tamil Nadu", value: "4.2K", pct: 4.9 },
                { name: "Others", value: "16.1K", pct: 18.6 },
              ]} />
            </div>
            <BarList rows={[
              { label: "Uttar Pradesh", value: "22.4K", pct: 25.9 },
              { label: "Maharashtra", value: "12.8K", pct: 14.8 },
              { label: "Delhi", value: "10.6K", pct: 12.3 },
              { label: "Karnataka", value: "7.9K", pct: 9.1 },
              { label: "Bihar", value: "6.8K", pct: 7.9 },
              { label: "West Bengal", value: "5.6K", pct: 6.5 },
              { label: "Tamil Nadu", value: "4.2K", pct: 4.9 },
              { label: "Others", value: "16.1K", pct: 18.6 },
            ]} />
          </div>
        </Card>
        <Card title="Device Split">
          <div className="flex items-center gap-4 p-3">
            <Donut segments={[{value:68.4,color:"#2878e8"},{value:24.1,color:"#8b5cf6"},{value:7.5,color:"#22a884"}]} center="142K" centerSub="Impressions" />
            <div className="space-y-2 text-[10px]">
              <Legend color="#2878e8" label="Mobile" value="68.4%" />
              <Legend color="#8b5cf6" label="Desktop" value="24.1%" />
              <Legend color="#22a884" label="Tablet" value="7.5%" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <Card title="Top Performing Creatives" action={<button className="text-[10px] font-semibold text-[#e23b55]">View All →</button>}>
          <SimpleTable
            headers={["#", "Creative", "Channel", "Reach", "CTR", "Leads", "Conversions", "CPA", "ROAS"]}
            rows={[
              ["1", "Rivers Change Lives\n30s video", "instagram", "12.4K", "5.2%", "38", "8", "₹875", "5.1x"],
              ["2", "Small Actions Big Change\nCarousel", "facebook", "9.8K", "4.6%", "31", "6", "₹1,020", "4.3x"],
              ["3", "Our Rivers Our Future\nVideo", "youtube", "8.6K", "3.9%", "24", "5", "₹1,120", "3.7x"],
            ]}
          />
        </Card>
        <Card title="Period Comparison" action={<Select label="Last 30 days vs Previous 30 days" />}>
          <SimpleTable
            headers={["Metric", "Last 30 Days", "Previous 30 Days", "Change"]}
            rows={[
              ["Reach", "86,502", "69,843", "↑ 24%"],
              ["Impressions", "142,318", "120,412", "↑ 18%"],
              ["Clicks", "4,208", "3,182", "↑ 32%"],
              ["Leads", "248", "182", "↑ 36%"],
              ["Conversions", "42", "33", "↑ 28%"],
              ["Spend", "₹48,250", "₹52,600", "↓ -8%"],
              ["CPL", "₹194", "₹289", "↓ -32%"],
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

function ContentScheduleTab() {
  const content = [
    ["instagram", "Rivers Give Life", "Apr 16, 2025 10:00 AM", "Scheduled"],
    ["linkedin", "The Economic Value of Clean Rivers", "Apr 16, 2025 02:00 PM", "Scheduled"],
    ["youtube", "River Stories: Voices of Change", "Apr 17, 2025 11:00 AM", "Scheduled"],
    ["facebook", "Community Cleanup Drive", "Apr 17, 2025 05:00 PM", "Scheduled"],
    ["instagram", "Small Actions. Big Change.", "Apr 18, 2025 09:00 AM", "In Review"],
  ] as const;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-6">
        <MetricCard icon={FileText} tone="blue" label="Total Posts" value="48" change="12%" sub="+5 vs last month" />
        <MetricCard icon={CalendarDays} tone="purple" label="Scheduled" value="32" sub="75%" />
        <MetricCard icon={Send} tone="green" label="Published" value="14" change="27%" sub="+3 vs last month" />
        <MetricCard icon={Clock3} tone="orange" label="In Review" value="4" change="8%" down sub="" />
        <MetricCard icon={X} tone="red" label="Needs Changes" value="3" change="6%" down sub="" />
        <MetricCard icon={CheckCircle2} tone="green" label="Approved" value="27" change="56%" sub="" />
      </div>

      <Card title="Publication Calendar" action={<div className="flex items-center gap-1"><button className="icon-btn"><ChevronLeft size={13}/></button><b className="px-2 text-[11px] text-[#35466a]">April 2025</b><button className="icon-btn"><ChevronRight size={13}/></button><button className="ml-2 rounded-[5px] border border-[#dfe6ef] px-2 py-1 text-[9px] font-semibold text-[#2278e8]">Today</button></div>}>
        <div className="p-3">
          <div className="mb-2 flex justify-end gap-3 text-[9px] text-[#718099]"><Legend color="#16a96c" label="Published" /><Legend color="#2878e8" label="Scheduled" /><Legend color="#f59e0b" label="In Review" /><Legend color="#ef4444" label="Needs Changes" /><Legend color="#94a3b8" label="Draft" /></div>
          <div className="grid grid-cols-14 overflow-hidden rounded-[7px] border border-[#e5eaf1]">
            {["Mon 14","Tue 15","Wed 16","Thu 17","Fri 18","Sat 19","Sun 20","Mon 21","Tue 22","Wed 23","Thu 24","Fri 25","Sat 26","Sun 27"].map((day,i)=>(
              <div key={day} className={`min-h-[56px] border-r border-b border-[#edf1f5] p-2 ${i===2 ? "bg-[#f2f7ff]" : ""}`}>
                <div className={`text-[9px] font-semibold ${i===2 ? "text-[#1f79e9]" : "text-[#64738b]"}`}>{day}</div>
                <div className="mt-3 flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#16a96c]" /><span className="h-1.5 w-1.5 rounded-full bg-[#2878e8]" />{i%3===0&&<span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1fr_1fr_.85fr]">
        <Card title="Upcoming Scheduled Content" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View All</button>}>
          <div className="divide-y divide-[#edf1f5]">
            {content.map(([platform,title,date,status]) => (
              <div key={title} className="flex items-center gap-2 px-3 py-2.5">
                <BrandIcon platform={platform} size={17} />
                <img src={campaignImage} className="h-[38px] w-[48px] rounded-[5px] object-cover" alt="" />
                <div className="min-w-0 flex-1"><div className="truncate text-[10px] font-semibold text-[#314365]">{title}</div><div className="mt-0.5 text-[8.5px] text-[#8994a7]">{date}</div></div>
                <StatusPill tone={status==="In Review"?"orange":"blue"}>{status}</StatusPill>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Channel-wise Content Queue" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View All</button>}>
          <div className="space-y-3 p-3">
            {[
              ["instagram",12,6,18],["linkedin",8,4,12],["google",5,2,7],["youtube",6,2,8],["facebook",4,2,6],["website",2,0,2]
            ].map(([platform,queued,published,total])=>(
              <div key={platform} className="grid grid-cols-[18px_1fr_44px_62px] items-center gap-2">
                <BrandIcon platform={platform as keyof typeof platformMeta} size={16}/>
                <div className="text-[9.5px] font-semibold text-[#3c4d6d]">{platformMeta[platform as keyof typeof platformMeta].label}</div>
                <div className="text-[8.5px] text-[#77859a]">{queued} queued</div>
                <div className="h-[6px] rounded-full bg-[#edf1f5]"><div className="h-full rounded-full bg-[#4b91e8]" style={{width:`${Math.min(100,(published as number)/(total as number)*100)}%`}}/></div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Content Pillars Distribution">
          <div className="flex items-center gap-3 p-3">
            <Donut segments={[{value:38,color:"#2878e8"},{value:22,color:"#19a86b"},{value:16,color:"#8b5cf6"},{value:12,color:"#f59e0b"},{value:8,color:"#ec4899"},{value:4,color:"#94a3b8"}]} center="48" centerSub="Posts"/>
            <div className="space-y-1.5 text-[9px]">
              <Legend color="#2878e8" label="Environmental Awareness" value="38%" />
              <Legend color="#19a86b" label="Community Action" value="22%" />
              <Legend color="#8b5cf6" label="River Health & Biodiversity" value="16%" />
              <Legend color="#f59e0b" label="Policy & Advocacy" value="12%" />
              <Legend color="#ec4899" label="Stories & People" value="8%" />
              <Legend color="#94a3b8" label="Event Coverage" value="4%" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1fr_1fr_1fr]">
        <Card title="Content Schedule & Posting Cadence" action={<Select label="Last 14 days" />}>
          <div className="p-3">
            <div className="mb-2 flex gap-3 text-[9px]"><Legend color="#2878e8" label="Posts Published" /><Legend color="#dbe9fb" label="Scheduled" /></div>
            <div className="flex h-[120px] items-end gap-2 border-b border-l border-[#e6ebf2] px-2">
              {[2,3,4,5,7,3,2,4,3,5,3,4,2,6].map((n,i)=>(
                <div key={i} className="flex h-full flex-1 items-end gap-0.5">
                  <div className="w-1/2 rounded-t-[2px] bg-[#2878e8]" style={{height:`${n*11}px`}}/>
                  <div className="w-1/2 rounded-t-[2px] bg-[#dbe9fb]" style={{height:`${(8-n)*7}px`}}/>
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[8px] text-[#8994a7]"><span>Apr 12</span><span>Apr 18</span><span>Apr 25</span></div>
          </div>
        </Card>

        <Card title="Recent Content & Assets" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View All</button>}>
          <div className="grid grid-cols-4 gap-2 p-3">
            {[
              ["RIVERS GIVE LIFE","Social Post","1080 × 1080"],
              ["PROTECT THEIR HOME","Reel / Short","1080 × 1920"],
              ["SMALL ACTIONS BIG CHANGE","Carousel","1080 × 1080"],
              ["CLEAN RIVERS BRIGHTER TOMORROW","Banner","1920 × 1080"],
            ].map(([t,type,size],i)=>(
              <div key={t} className="overflow-hidden rounded-[6px] border border-[#e6ebf2]">
                <img src={campaignImage} className="h-[66px] w-full object-cover" alt="" style={{filter:`hue-rotate(${i*8}deg)`}}/>
                <div className="p-1.5"><div className="line-clamp-2 text-[8.5px] font-bold text-[#324463]">{t}</div><div className="mt-1 text-[8px] text-[#8792a6]">{type}</div><div className="text-[8px] text-[#8792a6]">{size}</div></div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Approval Workflow" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View All</button>}>
          <div className="p-3">
            {[
              ["Content Creation","Completed","Apr 14, 2025",true],
              ["Internal Review","Approved","Apr 15, 2025",true],
              ["Client Review","Approved","Apr 15, 2025",true],
              ["Scheduled","32 of 48 posts scheduled","",true],
              ["Published","14 of 48 posts live","",false],
            ].map(([a,b,c,done],i)=>(
              <div key={a as string} className="relative flex gap-2.5 pb-3">
                {i<4 && <div className="absolute left-[6px] top-[13px] h-full w-px bg-[#dfe7f1]"/>}
                <span className={`relative z-10 flex h-[13px] w-[13px] items-center justify-center rounded-full ${done ? "bg-[#17aa6d] text-white" : "border-2 border-[#aab6c8] bg-white"}`}>{done && <Check size={9}/>}</span>
                <div><b className="block text-[9.5px] text-[#354667]">{a as string}</b><span className="text-[8.5px] text-[#8792a6]">{b as string} {c as string}</span></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function LeadsTab() {
  const leads = [
    ["Aarav Sharma","Website","website","Qualified","Manish Sirohi","92","Form submitted 2 hours ago","Apr 28, 2025"],
    ["Priya Mehta","Instagram","instagram","New","Aarti Verma","78","DM received 4 hours ago","Apr 28, 2025"],
    ["Rahul Joshi","Google Business","google","Nurturing","Priya Sharma","65","Email opened 6 hours ago","Apr 27, 2025"],
    ["Sneha Iyer","LinkedIn","linkedin","Qualified","Manish Sirohi","88","Call completed 1 day ago","Apr 27, 2025"],
    ["Vikram Singh","YouTube","youtube","New","Rohan Mehta","54","Comment received 1 day ago","Apr 27, 2025"],
    ["Neha Kapoor","Website","website","Converted","Aarti Verma","95","Donation completed 1 day ago","Apr 26, 2025"],
    ["Arjun Patel","Meta Ads","facebook","Nurturing","Priya Sharma","62","DM received 2 days ago","Apr 26, 2025"],
    ["Kavya Nair","WhatsApp","whatsapp","Qualified","Rohan Mehta","80","Message replied 2 days ago","Apr 25, 2025"],
  ] as const;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-6">
        <MetricCard icon={User} tone="green" label="Total Leads" value="248" change="36%" sub="+65 vs last month" />
        <MetricCard icon={Target} tone="purple" label="Qualified Leads" value="162" change="42%" sub="+48 vs last month" />
        <MetricCard icon={Send} tone="green" label="Conversions" value="42" change="28%" sub="+9 vs last month" />
        <MetricCard icon={MessageCircle} tone="orange" label="Response Rate" value="68%" change="12%" sub="+8% vs last month" />
        <MetricCard icon={Clock3} tone="blue" label="Avg. Response Time" value="2.4 hrs" change="40%" sub="was 4.1 hrs" />
        <MetricCard icon={Target} tone="purple" label="Cost per Lead" value="₹194" change="22%" down sub="was ₹250" />
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1fr_1fr_1fr]">
        <Card title="Lead Pipeline">
          <div className="space-y-1.5 p-3">
            {[
              { label: "248 Total Leads", change: "36%", color: "#2f7ee9", topW: 100, bottomW: 100 },
              { label: "162 Qualified (65%)", change: "42%", color: "#5a9ce8", topW: 100, bottomW: 75 },
              { label: "78 Nurturing (31%)", change: "18%", color: "#854de4", topW: 75, bottomW: 52 },
              { label: "42 Converted (17%)", change: "28%", color: "#18b36d", topW: 52, bottomW: 36 },
            ].map((item) => {
              const leftInset = (100 - item.bottomW) / 2;
              const rightInset = 100 - leftInset;
              const topLeft = (100 - item.topW) / 2;
              const topRight = 100 - topLeft;
              return (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="relative h-[32px] w-full">
                    <div
                      className="absolute inset-0 rounded-[4px]"
                      style={{
                        background: item.color,
                        clipPath: `polygon(${topLeft}% 0, ${topRight}% 0, ${rightInset}% 100%, ${leftInset}% 100%)`,
                      }}
                    />
                    <span className="relative z-10 flex h-full items-center justify-center text-[10px] font-bold text-white">{item.label}</span>
                  </div>
                  <span className="w-[40px] shrink-0 text-[9px] font-bold text-[#18a86b]">↑ {item.change}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Leads by Source">
          <div className="flex items-center gap-3 p-3">
            <Donut segments={[{value:35,color:"#2878e8"},{value:23,color:"#ef476f"},{value:17,color:"#f59e0b"},{value:11,color:"#8b5cf6"},{value:7,color:"#ef4444"},{value:4,color:"#19a86b"},{value:3,color:"#94a3b8"}]} center="248" centerSub="Total Leads"/>
            <div className="space-y-1.5 text-[9px]">
              {[
                ["Meta & Instagram","89","35%","#2878e8"],["Google Business","56","23%","#ef476f"],["Website","42","17%","#f59e0b"],["LinkedIn","28","11%","#8b5cf6"],["YouTube","18","7%","#ef4444"],["WhatsApp","9","4%","#19a86b"],["Others","6","2%","#94a3b8"]
              ].map(([n,v,p,c])=><Legend key={n} color={c!} label={n!} value={`${v}  ${p}`}/>)}
            </div>
          </div>
        </Card>

        <Card title="Conversion Trend" action={<Select label="Last 30 days" />}>
          <div className="h-[165px] p-3">
            <div className="mb-1 flex gap-3 text-[9px]"><Legend color="#2878e8" label="Leads"/><Legend color="#8b5cf6" label="Qualified"/><Legend color="#19a86b" label="Conversions"/></div>
            <MultiLineChart labels={["Mar 15","Mar 20","Mar 25","Mar 30","Apr 04","Apr 09","Apr 14","Apr 19","Apr 24","Apr 29"]} series={[
              {name:"Leads",color:"#2878e8",values:[12,16,18,21,25,27,31,30,37,42]},
              {name:"Qualified",color:"#8b5cf6",values:[6,8,10,12,14,16,18,19,22,25]},
              {name:"Conversions",color:"#19a86b",values:[2,3,4,4,5,6,7,7,8,10]},
            ]}/>
          </div>
        </Card>
      </div>

      <Card title="Leads (248)" action={<div className="flex gap-1.5"><div className="flex h-[27px] w-[230px] items-center gap-2 rounded-[5px] border border-[#e2e8f0] px-2 text-[9px] text-[#8994a7]"><Search size={12}/>Search leads by name, email or phone...</div><button className="action-btn"><Filter size={12}/> Filter</button><button className="action-btn">Stage <ChevronDown size={11}/></button><button className="action-btn">Source <ChevronDown size={11}/></button><button className="action-btn">Owner <ChevronDown size={11}/></button><button className="action-btn">Last 30 days <ChevronDown size={11}/></button><button className="rounded-[5px] bg-[#1979e9] px-2.5 text-[9px] font-bold text-white">+ Add Lead</button></div>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] border-collapse">
            <thead><tr className="border-b border-[#e7ecf2] bg-[#fafbfd] text-left text-[9px] font-semibold text-[#78859a]">{[""," #","Lead Name","Source","Channel","Stage","Assigned Owner","Score","Last Activity","Date Added","Actions"].map((h,i)=><th key={i} className="px-2 py-2">{h}</th>)}</tr></thead>
            <tbody>
              {leads.map((r,i)=>(
                <tr key={r[0]} className="border-b border-[#edf1f5] text-[9px]">
                  <td className="px-2 py-2"><input type="checkbox" className="h-3 w-3"/></td><td className="px-2 text-[#8a95a7]">{i+1}</td>
                  <td className="px-2 font-semibold text-[#344565]"><span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#e6eef9] text-[8px] text-[#4c78b7]">{r[0][0]}</span>{r[0]}</td>
                  <td className="px-2 text-[#62718a]">{r[1]}</td><td className="px-2"><BrandIcon platform={r[2]} size={15}/></td>
                  <td className="px-2"><StatusPill tone={r[3]==="Converted"?"green":r[3]==="Qualified"?"green":r[3]==="Nurturing"?"orange":"blue"}>{r[3]}</StatusPill></td>
                  <td className="px-2 text-[#62718a]">{r[4]}</td><td className="px-2"><span className="rounded-full bg-[#e7f9ee] px-2 py-1 font-bold text-[#1b9c62]">{r[5]}</span></td>
                  <td className="max-w-[145px] px-2 text-[#7c889c]">{r[6]}</td><td className="px-2 text-[#7c889c]">{r[7]}</td>
                  <td className="px-2"><div className="flex gap-2 text-[#4c77ac]"><Phone size={12}/><MessageCircle size={12}/><MoreHorizontal size={12}/></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1fr_1fr]">
        <Card title="Follow-up Tasks (12)" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View All →</button>}><SimpleTable headers={["Task","Related Lead","Due Date","Status","Owner"]} rows={[["Call and share campaign brochure","Aarav Sharma","Apr 28, 2025","Overdue","MS"],["Send impact video","Priya Mehta","Apr 28, 2025","Today","AP"],["Follow up on donation interest","Rahul Joshi","Apr 29, 2025","Upcoming","PS"],["Schedule meeting","Sneha Iyer","Apr 29, 2025","Upcoming","MS"]]}/></Card>
        <Card title="Recent Enquiries (5)" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View All →</button>}><SimpleTable headers={["Name","Message","Source","Time"]} rows={[["Rohan Kulkarni","How can I volunteer?","website","1 hour ago"],["Meera Bansal","Do you have river clean-up events?","instagram","3 hours ago"],["Siddharth Rao","I want to support this initiative.","linkedin","5 hours ago"],["Ananya Das","Can students participate?","youtube","8 hours ago"],["Kunal Verma","Please share details info.","google","1 day ago"]]}/></Card>
      </div>
    </div>
  );
}

function AudienceTab() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
        <MetricCard icon={Users} tone="blue" label="Total Audience" value="248,320" change="36%" sub="+65K vs last month" />
        <MetricCard icon={Heart} tone="purple" label="Engaged Audience" value="72,480" change="28%" sub="29.2% engagement rate" />
        <MetricCard icon={User} tone="green" label="New Audience" value="86,120" change="42%" sub="+25K vs last month" />
        <MetricCard icon={Target} tone="red" label="Retargeting Audience" value="41,360" change="18%" sub="16.7% of total" />
        <MetricCard icon={TrendingUp} tone="green" label="Audience Growth" value="+36%" sub="Last 30 days" />
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-3">
        <Card title="Audience by Age Group" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View Details</button>}>
          <div className="flex h-[165px] items-end justify-between gap-3 px-4 pb-4 pt-5">
            {[
              ["13–17",8],["18–24",18],["25–34",28],["35–44",22],["45–54",14],["55+",7]
            ].map(([label,v])=>(
              <div key={label as string} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[9px] font-bold text-[#23365d]">{v}%</span>
                <div className="w-full max-w-[36px] rounded-t-[4px] bg-[#6198e5]" style={{height:`${(v as number)*3.4}px`}}/>
                <span className="text-[8.5px] text-[#78869b]">{label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Audience by Gender" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View Details</button>}>
          <div className="flex h-[165px] items-center justify-center gap-5 p-3">
            <Donut segments={[{value:56,color:"#2878e8"},{value:42,color:"#8b5cf6"},{value:2,color:"#b8c0cb"}]} center="248K" centerSub="Total Audience"/>
            <div className="space-y-3 text-[9px]">
              <Legend color="#2878e8" label="Male" value="56%  138,259"/>
              <Legend color="#8b5cf6" label="Female" value="42%  104,210"/>
              <Legend color="#b8c0cb" label="Non-binary / Other" value="2%  5,851"/>
            </div>
          </div>
        </Card>

        <Card title="Top Cities" action={<button className="text-[10px] font-semibold text-[#e23b55]">View All ›</button>}>
          <div className="p-3"><BarList rows={[
            {label:"Delhi",value:"12.4%  30,810",pct:12.4},{label:"Varanasi",value:"9.8%  24,330",pct:9.8},{label:"Lucknow",value:"7.6%  18,860",pct:7.6},{label:"Patna",value:"6.1%  15,150",pct:6.1},{label:"Bengaluru",value:"5.8%  14,380",pct:5.8},{label:"Other Cities",value:"58.3%  144,790",pct:58.3}
          ]} /></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1fr_1fr_1fr]">
        <Card title="Top Regions" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View Details</button>}>
          <div className="grid grid-cols-[140px_1fr] items-center gap-2 p-3">
            <div className="rounded-[8px] bg-[#f8fbff] p-1">
              <IndiaMap data={[
                { name: "Uttar Pradesh", value: "22.8%", pct: 22.8 },
                { name: "Maharashtra", value: "14.6%", pct: 14.6 },
                { name: "Delhi", value: "12.4%", pct: 12.4 },
                { name: "Bihar", value: "8.9%", pct: 8.9 },
                { name: "Karnataka", value: "7.6%", pct: 7.6 },
                { name: "West Bengal", value: "6.8%", pct: 6.8 },
              ]} />
            </div>
            <BarList rows={[
              {label:"Uttar Pradesh",value:"22.8%",pct:22.8},{label:"Maharashtra",value:"14.6%",pct:14.6},{label:"Delhi",value:"12.4%",pct:12.4},{label:"Bihar",value:"8.9%",pct:8.9},{label:"Karnataka",value:"7.6%",pct:7.6},{label:"West Bengal",value:"6.8%",pct:6.8},{label:"Others",value:"26.9%",pct:26.9}
            ]}/></div>
        </Card>

        <Card title="Top Interests & Affinity Segments" action={<button className="text-[10px] font-semibold text-[#e23b55]">View All ›</button>}>
          <div className="space-y-2 p-3">
            {[
              ["Environment & Sustainability","32.6%","green"],["Clean Energy","28.4%","green"],["Wildlife & Nature","24.1%","green"],["Social Good","18.9%","purple"],["Travel & Outdoor","16.7%","blue"],["Health & Wellness","14.3%","red"]
            ].map(([a,b,t])=><div key={a} className="flex items-center gap-2"><SoftIcon icon={t==="red"?Heart:t==="purple"?Heart:Sparkles} tone={t as keyof typeof iconTone} size={25}/><span className="flex-1 text-[9.5px] font-semibold text-[#3d4d6b]">{a}</span><b className="text-[9.5px] text-[#68778f]">{b}</b></div>)}
          </div>
        </Card>

        <Card title="Audience Source Mix" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View Details</button>}>
          <div className="flex items-center gap-4 p-3">
            <Donut segments={[{value:41,color:"#2878e8"},{value:28,color:"#19a86b"},{value:15,color:"#8b5cf6"},{value:9,color:"#f59e0b"},{value:5,color:"#ef7f9d"},{value:2,color:"#94a3b8"}]} center="248K" centerSub="Total Audience"/>
            <div className="space-y-2 text-[9px]">
              <Legend color="#2878e8" label="Organic Reach" value="41%"/><Legend color="#19a86b" label="Paid Ads" value="28%"/><Legend color="#8b5cf6" label="Social Engagement" value="15%"/><Legend color="#f59e0b" label="Website Visits" value="9%"/><Legend color="#ef7f9d" label="Partner Channels" value="5%"/><Legend color="#94a3b8" label="Other" value="2%"/>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1.1fr_1.15fr_.9fr]">
        <Card title="Lookalike & Remarketing Audiences" action={<button className="text-[10px] font-semibold text-[#e23b55]">View All ›</button>}>
          <div className="grid grid-cols-3 gap-2 p-3">
            {[
              ["Lookalike Audience","52,680","34%","19% Lookalike (Website Visitors)"],
              ["Remarketing Audience","41,360","18%","People who engaged (30 days)"],
              ["Video Viewers Audience","28,940","27%","75%+ video views (180 days)"]
            ].map(([a,n,c,d])=><div key={a} className="rounded-[7px] border border-[#e7edf4] p-2.5"><SoftIcon icon={Users} tone="blue" size={28}/><div className="mt-2 text-[9px] font-semibold text-[#334465]">{a}</div><div className="mt-1 text-[16px] font-extrabold text-[#24365d]">{n}</div><div className="text-[9px] font-bold text-[#18a76a]">↑ {c}</div><div className="mt-1 text-[8px] text-[#8994a7]">{d}</div><button className="mt-2 w-full rounded-[5px] border border-[#dfe6ef] py-1 text-[8.5px] font-semibold text-[#4b6389]">View Audience</button></div>)}
          </div>
        </Card>

        <Card title="Engagement by Segment" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View Details</button>}>
          <SimpleTable headers={["Segment","Audience Size","Engagement Rate"]} rows={[
            ["Environment Enthusiasts","82,430","4.8%"],
            ["Students & Young Professionals","54,210","3.6%"],
            ["Community Leaders","28,760","3.1%"],
            ["Travel & Adventure","26,140","2.9%"],
            ["Eco-conscious Families","21,380","2.4%"],
          ]}/>
        </Card>

        <Card title="Recommendations" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View All</button>}>
          <div className="divide-y divide-[#edf1f5]">
            <Recommendation title="Increase budget for 18–34 segment" detail="High engagement, strong conversion potential" />
            <Recommendation title="Create regional content for UP & Bihar" detail="High audience concentration" />
            <Recommendation title="Run lookalike campaign from top engagers" detail="Can reach similar users" />
            <Recommendation title="Use video content to grow female audience" detail="42% female with high interest signals" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function BudgetTab() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-6">
        <MetricCard icon={BarChart3} tone="purple" label="Total Budget" value="₹48,250" sub="Set for this campaign" />
        <MetricCard icon={TrendingDown} tone="red" label="Total Spent" value="₹42,830" sub="88.7% of budget" />
        <MetricCard icon={Clock3} tone="green" label="Remaining Budget" value="₹5,420" sub="11.3% remaining" />
        <MetricCard icon={BarChart3} tone="blue" label="Daily Burn (Avg)" value="₹1,720" change="21.8%" sub="vs. ₹2,200 planned" />
        <MetricCard icon={BarChart3} tone="orange" label="Spend Efficiency" value="₹142" change="18.1%" sub="Cost per Lead" />
        <MetricCard icon={Activity} tone="green" label="Budget Utilization" value="88%" sub="On track" />
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1.2fr_1fr]">
        <Card title="Spend Over Time" action={<Select label="Last 30 days" />}>
          <div className="max-h-[225px] overflow-y-auto p-3">
            <div className="mb-2 flex gap-4 text-[9px]"><Legend color="#2878e8" label="Daily Spend"/><Legend color="#2f72dc" label="Cumulative Spend"/><Legend color="#a9b4c4" label="Planned Spend"/></div>
            <MultiLineChart labels={["Mar 15","Mar 22","Mar 29","Apr 05","Apr 12","Apr 19","Apr 26"]} series={[
              {name:"Daily Spend",color:"#a6c7ef",values:[6,12,10,16,13,18,20]},
              {name:"Cumulative Spend",color:"#2878e8",values:[8,17,25,32,39,44,48]},
              {name:"Planned Spend",color:"#a9b4c4",values:[8,16,24,32,40,48,56]},
            ]} height={180}/>
          </div>
        </Card>
        <Card title="Channel Budget Allocation">
          <SimpleTable headers={["Channel","Allocated Budget","Spent","Remaining","Utilization"]} rows={[
            ["Meta & Instagram","₹12,400","₹11,200","₹1,200","90%"],
            ["LinkedIn","₹8,640","₹7,820","₹820","90%"],
            ["Google Business","₹7,250","₹6,380","₹870","88%"],
            ["YouTube","₹6,800","₹6,120","₹680","90%"],
            ["Website","₹5,200","₹3,310","₹1,890","64%"],
          ]}/>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1fr_1fr]">
        <Card title="Budget by Objective / Phase" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View Details</button>}>
          <SimpleTable headers={["Objective / Phase","Allocated","Spent","Remaining","Utilization"]} rows={[
            ["Awareness (Reach)","₹18,000","₹16,240","₹1,760","90%"],
            ["Engagement","₹12,000","₹10,680","₹1,320","89%"],
            ["Lead Generation","₹10,000","₹8,750","₹1,250","88%"],
            ["Community Action","₹5,250","₹4,380","₹870","83%"],
            ["Contingency","₹3,000","₹2,780","₹220","93%"],
          ]}/>
        </Card>
        <Card title="Invoice / Payment Snapshot" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View All</button>}>
          <SimpleTable headers={["Invoice #","Date","Amount","Status","Download"]} rows={[
            ["INV-2025-001","Mar 15, 2025","₹12,000","Paid","↓"],
            ["INV-2025-002","Mar 28, 2025","₹10,000","Paid","↓"],
            ["INV-2025-003","Apr 10, 2025","₹10,000","Paid","↓"],
            ["INV-2025-004","Apr 20, 2025","₹8,000","Processing","↓"],
            ["INV-2025-005","Apr 25, 2025","₹8,250","Scheduled","↓"],
          ]}/>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1fr_1fr]">
        <Card title="Remaining Budget Forecast">
          <div className="flex items-center gap-4 p-3">
            <SoftIcon icon={CheckCircle2} tone="green" size={40}/>
            <div className="flex-1"><div className="text-[10px] font-bold text-[#22935e]">You're on track</div><div className="mt-1 text-[9px] text-[#7f8ca0]">At current burn rate (₹1,720/day), your remaining budget of ₹5,420 will last for approximately <b>3 days</b> (Apr 29, 2025).</div></div>
            <div className="text-right"><b className="block text-[13px] text-[#26375a]">₹1,720</b><span className="text-[8.5px] text-[#8a96a8]">Current daily burn</span></div>
            <div className="text-right"><b className="block text-[13px] text-[#26375a]">3 days</b><span className="text-[8.5px] text-[#8a96a8]">Budget runway</span></div>
          </div>
        </Card>
        <Card title="Pacing & Forecast">
          <div className="flex items-center gap-3 p-3">
            <div className="h-[100px] flex-1"><MultiLineChart labels={["Mar 15","Mar 22","Mar 29","Apr 05","Apr 12","Apr 19","Apr 26","Apr 30"]} series={[{name:"Actual",color:"#2878e8",values:[10,14,20,24,28,36,43,47]},{name:"Planned",color:"#aeb9c8",values:[9,15,22,29,35,42,48,50]},{name:"Forecast",color:"#19a86b",values:[10,14,20,24,28,36,43,49]}]} height={100}/></div>
            <div className="w-[115px] rounded-[8px] bg-[#ecfbf4] p-2.5"><div className="text-[9px] text-[#718099]">Projected Total Spend</div><b className="mt-1 block text-[16px] text-[#1d8f5e]">₹47,100</b><span className="text-[9px] font-bold text-[#19a66a]">−2.4% vs. budget</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ActivityLogTab() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-6">
        <MetricCard icon={Activity} tone="blue" label="Total Activities" value="364" change="24%" sub="+71 vs last month" />
        <MetricCard icon={Users} tone="purple" label="Team Actions" value="128" change="18%" sub="+19 vs last month" />
        <MetricCard icon={CheckCircle2} tone="green" label="Approvals" value="24" change="33%" sub="+6 vs last month" />
        <MetricCard icon={Send} tone="orange" label="Publishes" value="86" change="28%" sub="+19 vs last month" />
        <MetricCard icon={Pencil} tone="blue" label="Updates" value="96" change="12%" sub="+10 vs last month" />
        <MetricCard icon={Activity} tone="blue" label="Sync Events" value="30" change="50%" sub="+10 vs last month" />
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-[9px] border border-[#e5ebf3] bg-white p-2">
        <Select label="Mar 15, 2025 - Apr 30, 2025" /><Select label="All Activity Types"/><Select label="All Users"/><Select label="All Channels"/><Select label="All Statuses"/>
        <div className="flex min-w-[230px] flex-1 items-center gap-2 rounded-[5px] border border-[#e1e7ef] px-2 text-[9px] text-[#8994a8]"><Search size={12}/>Search activities, comments or changes...</div>
        <button className="rounded-[5px] bg-[#eff6ff] px-3 text-[9px] font-semibold text-[#2378e8]">Clear Filters</button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1.35fr_.8fr]">
        <Card title="Activity Timeline (364 activities)" action={<div className="flex rounded-[5px] bg-[#eef5ff] p-0.5"><button className="rounded bg-[#1d7be9] px-3 py-1 text-[9px] font-semibold text-white">☷ Timeline</button><button className="px-3 py-1 text-[9px] font-semibold text-[#687890]">☷ List</button></div>}>
          <div className="divide-y divide-[#edf1f5]">
            {[
              ["2 hours ago","Apr 28, 2025","11:30 AM","Content published on Instagram","River Facts Series #3 · “Every Drop Counts”","Manish Sirohi","Published","instagram"],
              ["5 hours ago","Apr 28, 2025","08:15 AM","Campaign budget updated","Budget increased from ₹40,000 to ₹48,250","Anjali Verma","Updated","website"],
              ["1 day ago","Apr 27, 2025","06:42 PM","Creative approved","Creative: Clean Rivers Brighter Tomorrow (v2)","Rohan Mehta","Approved","website"],
              ["1 day ago","Apr 27, 2025","04:20 PM","New team member added","Sneha Iyer joined the campaign team","Manish Sirohi","Team","website"],
              ["2 days ago","Apr 26, 2025","10:18 AM","Post scheduled on LinkedIn","Article: “India's Rivers, Our Shared Future”","Sneha Iyer","Scheduled","linkedin"],
              ["2 days ago","Apr 26, 2025","09:05 AM","Audience synced","Synced 1,260 new contacts from Meta Ads","System","Synced","facebook"],
              ["3 days ago","Apr 25, 2025","04:33 PM","Editing updates rejected","Copy update for Google Business post","Anjali Verma","Rejected","google"],
              ["3 days ago","Apr 25, 2025","11:11 AM","Content created","Blog draft: “How Citizen Action Can Revive Rivers”","Sneha Iyer","Created","website"],
            ].map(([ago,date,time,title,desc,user,status,platform],i)=>(
              <div key={title} className="flex items-start gap-2.5 px-3 py-2.5">
                <div className="relative pt-0.5"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${i===0?"bg-[#e8fff4]":i===6?"bg-[#fff0f1]":"bg-[#eef5ff]"}`}>{i===0?<Send size={14} className="text-[#16aa6b]"/>:i===2?<CheckCircle2 size={14} className="text-[#f59e0b]"/>:i===6?<AlertCircle size={14} className="text-[#ef4444]"/>:<Activity size={14} className="text-[#2878e8]" />}</span></div>
                <div className="w-[85px] shrink-0"><b className="block text-[9px] text-[#617089]">{ago}</b><span className="text-[8px] text-[#8b96a8]">{date}</span><span className="block text-[8px] text-[#8b96a8]">{time}</span></div>
                <div className="min-w-0 flex-1"><b className="block text-[10px] text-[#2e4163]">{title}</b><span className="block truncate text-[8.5px] text-[#8490a3]">{desc}</span></div>
                <div className="hidden w-[110px] items-center gap-1.5 md:flex"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#162038] text-[8px] font-bold text-white">{user?.[0]}</span><span className="truncate text-[8.5px] font-semibold text-[#5f6d84]">{user}</span></div>
                <StatusPill fixed tone={status==="Rejected"?"red":status==="Updated"?"blue":status==="Approved"?"green":status==="Published"?"green":status==="Scheduled"?"blue":"gray"}>{status}</StatusPill>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-2.5 overflow-x-auto">
          <Card title="Approval History (24)" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View All</button>}>
            <div className="overflow-x-auto">
              <SimpleTable headers={["","Item","By","Status"]} rows={[
                ["✓","Creative approved","Rohan Mehta","Approved"],
                ["✓","Budget approved","Moksha Sewa","Approved"],
                ["×","Ad copy rejected","Neha Sharma","Rejected"],
                ["✓","Landing page approved","Vikram Singh","Approved"],
                ["✓","Social post approved","Rohan Mehta","Approved"],
              ]}/>
            </div>
          </Card>
          <Card title="Recent Changes (96)" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View All</button>}>
            <div className="overflow-x-auto">
              <SimpleTable headers={["Time","Item","Field","Old Value","New Value"]} rows={[
                ["2h ago","Campaign","Status","Paused","Active"],
                ["5h ago","Budget","Total Budget","₹40,000","₹48,250"],
                ["1d ago","Content","Caption","—","Updated"],
                ["1d ago","Schedule","Post Time","Apr 28, 10:00","Apr 28, 11:30"],
                ["2d ago","Audience","Size","23,240","24,500"],
              ]}/>
            </div>
          </Card>
          <Card title="System Events & Notifications (30)" action={<button className="text-[10px] font-semibold text-[#1e78e8]">View All</button>}>
            <div className="overflow-x-auto">
              <ActivityRows />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ChannelTable({ detailed = false }: { detailed?: boolean }) {
  const rows = [
    ["Meta & Instagram","facebook","28.4K","48.2K","4.2K","3.7%","93","18","₹12,400","₹133","4.6x"],
    ["LinkedIn","linkedin","18.6K","28.1K","0.9K","3.2%","46","7","₹8,600","₹187","3.1x"],
    ["Google Business","google","16.2K","24.8K","0.8K","2.5%","42","7","₹7,250","₹173","3.2x"],
    ["YouTube","youtube","12.8K","22.1K","0.5K","2.3%","38","6","₹6,800","₹179","2.9x"],
    ["Website (Direct)","website","10.5K","18.6K","0.3K","1.8%","24","4","₹5,200","₹217","2.4x"],
  ] as const;
  const headers = detailed ? ["Channel","Reach","Impressions","Clicks","CTR","Leads","Conversions","Spend","CPL","ROAS"] : ["Channel","Status","Reach","Clicks","Leads","Conversions","Spend"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead><tr className="border-b border-[#e8edf3] bg-[#fafbfd] text-left text-[9px] text-[#78859a]">{headers.map(h=><th key={h} className="px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r)=>(
          <tr key={r[0]} className="border-b border-[#edf1f5]">
            <td className="px-2 py-2"><div className="flex items-center gap-1.5"><BrandIcon platform={r[1]} size={15}/><span className="text-[9px] font-semibold text-[#40516e]">{r[0]}</span></div></td>
            {detailed ? <>
              {r.slice(2).map((x,i)=><td key={i} className="px-2 text-[9px] text-[#687790]">{x}</td>)}
            </> : <>
              <td className="px-2"><StatusPill tone="green">● Active</StatusPill></td><td className="px-2 text-[9px] text-[#687790]">{r[2]}</td><td className="px-2 text-[9px] text-[#687790]">{r[4]}</td><td className="px-2 text-[9px] text-[#687790]">{r[6]}</td><td className="px-2 text-[9px] text-[#687790]">{r[7]}</td><td className="px-2 text-[9px] text-[#687790]">{r[8]}</td>
            </>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return <div className="grid grid-cols-[22px_92px_1fr] items-start gap-1.5"><Icon size={14} className="mt-0.5 text-[#2b80e8]"/><span className="text-[9px] font-semibold text-[#77859a]">{label}</span><span className="text-[9px] text-[#4d5e79]">{value}</span></div>;
}

function Legend({ color, label, value }: { color: string; label: string; value?: string }) {
  return <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{background:color}}/><span>{label}</span>{value && <b className="ml-1 text-[#445572]">{value}</b>}</span>;
}

function Select({ label }: { label: string }) {
  return <button className="inline-flex h-[27px] items-center gap-1 rounded-[5px] border border-[#dfe6ef] bg-white px-2 text-[9px] font-medium text-[#66758d] whitespace-nowrap">{label}<ChevronDown size={11}/></button>;
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | readonly string[])[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse">
        <thead><tr className="border-b border-[#e7ecf2] bg-[#fafbfd] text-left text-[9px] text-[#7b879b]">{headers.map(h=><th key={h} className="px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row,i)=><tr key={i} className="border-b border-[#edf1f5] last:border-b-0">{row.map((cell,j)=>{
          const text = String(cell);
          const platform = ["instagram","facebook","linkedin","youtube","google","whatsapp","website"].includes(text) ? text as keyof typeof platformMeta : null;
          return <td key={j} className="px-2 py-2 text-[9px] text-[#65748c] whitespace-pre-line">{platform ? <BrandIcon platform={platform} size={15}/> : text}</td>;
        })}</tr>)}</tbody>
      </table>
    </div>
  );
}

function ActivityRows() {
  return <div className="divide-y divide-[#edf1f5]">
    {[
      ["Post published on Instagram","Apr 28, 2025, 10:00 AM by Ankit Verma"],
      ["New lead received from website","Apr 27, 2025, 02:40 PM"],
      ["Creative approved","Apr 26, 2025, 04:15 PM by Priya Sharma"],
      ["Budget updated","Apr 25, 2025, 11:30 AM by Manish Sirohi"],
    ].map(([a,b],i)=><div key={a} className="flex items-start gap-2 px-3 py-2"><span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${i===0?"bg-[#e9fbf3] text-[#18a96b]":"bg-[#edf5ff] text-[#2878e8]"}`}><Activity size={11}/></span><div><b className="block text-[9px] text-[#465675]">{a}</b><span className="text-[8px] text-[#8994a7]">{b}</span></div></div>)}
  </div>;
}

function CampaignPage({ id }: { id?: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const content = useMemo(() => {
    switch (activeTab) {
      case "Performance": return <PerformanceTab />;
      case "Content & Schedule": return <ContentScheduleTab />;
      case "Leads": return <LeadsTab />;
      case "Audience": return <AudienceTab />;
      case "Budget": return <BudgetTab />;
      case "Activity Log": return <ActivityLogTab />;
      default: return <OverviewTab />;
    }
  }, [activeTab]);

  return (
    <div className="campaign-page min-h-full bg-[#f7f9fc] text-[#24365d]">
      <style>{`
        .campaign-page { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .campaign-page * { box-sizing: border-box; }
        .campaign-page button { font-family: inherit; }
        .action-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; height:30px; padding:0 11px; border:1px solid #dfe6ef; border-radius:6px; background:#fff; color:#273a5f; font-size:9px; font-weight:700; white-space:nowrap; box-shadow:0 1px 1px rgba(15,35,70,.02); }
        .icon-btn { display:inline-flex; align-items:center; justify-content:center; width:25px; height:25px; border:1px solid #dfe6ef; border-radius:5px; background:#fff; color:#66758d; }
        .tabs-scroll { scrollbar-width: none; }
        .tabs-scroll::-webkit-scrollbar { display: none; }
        @media (max-width: 1023px) {
          .campaign-page { padding:10px; }
        }
      `}</style>

      <TopHeader />

      <div className="mt-2.5">
        <div className="mb-2.5 flex flex-nowrap items-center gap-1 overflow-x-auto border-b border-[#e0e7ef] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative whitespace-nowrap px-3 py-2 text-[12px] font-bold transition-colors ${
                activeTab === tab ? "text-[#1d2d55]" : "text-[#738098] hover:text-[#2b4169]"
              }`}
            >
              {tab}
              {activeTab === tab && <span className="absolute inset-x-2 bottom-[-1px] h-[2px] rounded-full bg-[#ef3f50]" />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[minmax(0,1fr)_250px]">
          <main className="min-w-0 overflow-hidden">{content}</main>
          <div className="hidden xl:block"><RightRail showPerformanceScore={activeTab === "Performance"} activeTab={activeTab} /></div>
        </div>
      </div>
    </div>
  );
}

export default CampaignPage;
