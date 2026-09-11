"use client";

import { useState } from "react";
import {
  AlertCircle, AlertTriangle, ArrowUp, CalendarDays, CheckCircle2,
  ChevronDown, ChevronRight, Download, ExternalLink, FileSearch, Globe2,
  Info, MoreHorizontal, Play, RefreshCw, Search, ShieldCheck, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const tabs = ["Overview", "Issues", "Crawl Explorer", "Page Analysis", "Technical SEO", "Core Web Vitals"];
const issues = [
  { issue: "Missing meta descriptions", type: "On-page", pages: 12, level: "Critical", detail: "Search snippets may be generated automatically." },
  { issue: "Images missing alt text", type: "Accessibility", pages: 28, level: "Critical", detail: "Add descriptive alternative text to important images." },
  { issue: "Slow Largest Contentful Paint", type: "Performance", pages: 8, level: "Warning", detail: "Hero images are delaying meaningful page rendering." },
  { issue: "Duplicate title tags", type: "Content", pages: 4, level: "Warning", detail: "Each indexable page should have a unique title." },
  { issue: "Broken internal links", type: "Technical", pages: 6, level: "Warning", detail: "Update or remove internal links returning 4xx errors." },
];

export function SeoAuditRedesign() {
  const [active, setActive] = useState("Overview");
  const [running, setRunning] = useState(false);
  const runAudit = () => { setRunning(true); window.setTimeout(() => setRunning(false), 1600); };
  return <div className="space-y-4 pb-10 text-[#172044]">
    <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#71809D]"><span>SEO</span><ChevronRight className="size-3"/><span className="text-[#172044]">Site Audit</span></div>
        <h1 className="text-[26px] font-bold tracking-[-.03em]">Site Audit</h1>
        <p className="mt-1 text-[12px] text-[#687797]">Find technical and on-page issues affecting the visibility of mokshasewa.org.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 flex h-10 items-center gap-2 rounded-lg border border-[#DDE4ED] bg-white px-3 shadow-sm"><CalendarDays className="size-4 text-[#2878E5]"/><span><b className="block text-[10px] leading-3">Last crawl</b><small className="block text-[8px] text-[#71809D]">Apr 14, 2025 · 10:32 AM</small></span><span className="ml-2 rounded bg-[#E5F7EF] px-1.5 py-0.5 text-[8px] font-bold text-[#078359]">Completed</span></div>
        <button className="flex h-9 items-center gap-1.5 rounded-md border bg-white px-3 text-[11px] font-semibold shadow-sm hover:bg-[#F8FAFD]"><Download className="size-3.5"/>Export<ChevronDown className="size-3"/></button>
        <button onClick={runAudit} className="flex h-9 items-center gap-1.5 rounded-md bg-[#E30613] px-4 text-[11px] font-bold text-white shadow-sm hover:bg-[#C90510]"><RefreshCw className={cn("size-3.5", running && "animate-spin")}/>{running ? "Scanning..." : "Run New Audit"}</button>
        <button className="grid size-9 place-items-center rounded-md border bg-white shadow-sm"><MoreHorizontal className="size-4"/></button>
      </div>
    </header>

    <nav className="flex gap-6 overflow-x-auto border-b border-[#DDE4ED] [scrollbar-width:none]">
      {tabs.map(tab => <button key={tab} onClick={() => setActive(tab)} className={cn("shrink-0 border-b-2 pb-2.5 text-[11px] font-bold", active === tab ? "border-[#E30613] text-[#E30613]" : "border-transparent text-[#71809D] hover:text-[#172044]")}>{tab}{tab === "Issues" && <span className="ml-1 rounded-full bg-[#FFF0F1] px-1.5 py-0.5 text-[8px] text-[#E30613]">142</span>}</button>)}
    </nav>

    {active === "Overview" ? <Overview /> : active === "Issues" ? <IssueTable expanded /> : <EmptyPanel title={active} />}
  </div>;
}

function Overview() {
  return <div className="space-y-3">
    <section className="grid gap-3 lg:grid-cols-[1.15fr_2fr_1.2fr]">
      <Card className="p-4">
        <div className="flex items-center justify-between"><div><p className="text-[11px] font-bold">SEO Health Score</p><p className="mt-0.5 text-[9px] text-[#71809D]">Overall site quality</p></div><span className="rounded bg-[#E5F7EF] px-2 py-1 text-[9px] font-bold text-[#078359]">Good</span></div>
        <div className="mt-4 flex items-center gap-4"><Score/><div><div className="flex items-center gap-1 text-[11px] font-bold text-[#078359]"><ArrowUp className="size-3.5"/>12 points</div><p className="mt-1 text-[9px] text-[#71809D]">since Mar 31 audit</p><p className="mt-3 text-[10px] leading-4 text-[#52617D]">Your foundation is healthy. Resolve critical issues first to reach 90+.</p></div></div>
      </Card>
      <Card className="p-4"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-[12px] font-bold">Issue Summary</h2><p className="text-[9px] text-[#71809D]">542 checks across 128 pages</p></div><button className="text-[9px] font-bold text-[#E30613]">View all issues →</button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric icon={AlertCircle} label="Critical" value="12" delta="8 fixed" tone="red"/><Metric icon={AlertTriangle} label="Warnings" value="28" delta="14 fixed" tone="amber"/><Metric icon={Info} label="Notices" value="64" delta="14 new" tone="blue"/><Metric icon={CheckCircle2} label="Passed" value="438" delta="26 more" tone="green"/></div></Card>
      <Card className="p-4"><div className="flex items-center justify-between"><div><h2 className="text-[12px] font-bold">Crawl Summary</h2><p className="text-[9px] text-[#71809D]">Latest completed scan</p></div><Globe2 className="size-5 text-[#2878E5]"/></div><div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3"><Pair label="Pages crawled" value="128"/><Pair label="Links found" value="1,842"/><Pair label="Duration" value="13m 24s"/><Pair label="Response time" value="420ms"/><Pair label="Sitemap" value="Found" good/><Pair label="Robots.txt" value="Valid" good/></div><button className="mt-4 flex h-8 w-full items-center justify-center gap-1 rounded-md border text-[9px] font-bold hover:bg-[#F8FAFD]">Open crawl explorer <ChevronRight className="size-3"/></button></Card>
    </section>

    <section className="grid gap-3 xl:grid-cols-[1.75fr_.8fr]">
      <IssueTable />
      <Card><div className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="text-[12px] font-bold">Core Web Vitals</h2><p className="text-[9px] text-[#71809D]">Mobile field performance</p></div><button className="text-[9px] font-bold text-[#E30613]">Details →</button></div><div className="space-y-4 p-4"><Vital name="LCP" value="2.1s" note="Needs improvement" progress="72%" tone="amber"/><Vital name="INP" value="120ms" note="Good" progress="43%" tone="green"/><Vital name="CLS" value="0.05" note="Good" progress="25%" tone="green"/></div><div className="mx-4 mb-4 flex gap-2 rounded-lg bg-[#F4F7FB] p-3"><Sparkles className="size-4 shrink-0 text-[#7A4CE0]"/><p className="text-[9px] leading-4 text-[#52617D]"><b className="text-[#172044]">Best opportunity:</b> compress homepage hero assets to improve LCP by approximately 0.6s.</p></div></Card>
    </section>

    <section className="grid gap-3 md:grid-cols-3">
      <Insight icon={FileSearch} title="Indexability" value="124 / 128" note="97% of crawled pages are indexable" tone="green"/>
      <Insight icon={ShieldCheck} title="Security" value="No issues" note="HTTPS, SSL and mixed content checks passed" tone="blue"/>
      <Insight icon={Search} title="Search readiness" value="82%" note="16 pages need richer titles or descriptions" tone="purple"/>
    </section>
  </div>;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) { return <section className={cn("overflow-hidden rounded-xl border border-[#DDE4ED] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]", className)}>{children}</section>; }
function Score(){return <div className="relative grid size-[94px] shrink-0 place-items-center rounded-full" style={{background:"conic-gradient(#0AA673 0 78%,#E8EDF3 78% 100%)"}}><div className="grid size-[76px] place-items-center rounded-full bg-white text-center"><span><b className="text-[25px] leading-6">78</b><small className="text-[9px] text-[#71809D]">/100</small></span></div></div>}
function Metric({ icon: Icon, label, value, delta, tone }: { icon: typeof AlertCircle; label:string; value:string; delta:string; tone:"red"|"amber"|"blue"|"green" }) { const colors={red:"bg-[#FFF0F1] text-[#E30613]",amber:"bg-[#FFF6E4] text-[#D78300]",blue:"bg-[#EAF3FF] text-[#2878E5]",green:"bg-[#E5F7EF] text-[#078359]"}; return <div className="rounded-lg border border-[#E6EBF2] p-3"><div className={cn("grid size-7 place-items-center rounded-full",colors[tone])}><Icon className="size-3.5"/></div><div className="mt-2 flex items-end justify-between"><div><b className="block text-[19px] leading-5">{value}</b><span className="text-[9px] font-semibold text-[#52617D]">{label}</span></div><small className={cn("text-[8px] font-semibold",tone === "green" ? "text-[#078359]":"text-[#71809D]")}>{delta}</small></div></div> }
function Pair({ label,value,good=false }: {label:string;value:string;good?:boolean}){return <div><p className="text-[8px] text-[#71809D]">{label}</p><p className={cn("mt-0.5 text-[11px] font-bold",good&&"text-[#078359]")}>{value}</p></div>}

function IssueTable({expanded=false}:{expanded?:boolean}) { return <Card><div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><div><h2 className="text-[12px] font-bold">Priority Issues</h2><p className="text-[9px] text-[#71809D]">Fix these first for the greatest impact</p></div><div className="flex gap-2"><button className="flex h-7 items-center gap-1 rounded border px-2 text-[9px] font-semibold"><Search className="size-3"/>Search</button><button className="flex h-7 items-center gap-1 rounded border px-2 text-[9px] font-semibold">All severity<ChevronDown className="size-3"/></button></div></div><div className={cn("overflow-auto", expanded&&"max-h-[620px]")}><table className="w-full min-w-[650px] text-left"><thead className="bg-[#F8FAFD] text-[8px] uppercase tracking-wide text-[#71809D]"><tr><th className="px-4 py-2.5">Issue</th><th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">Affected</th><th className="px-3 py-2.5">Severity</th><th className="px-4 py-2.5 text-right">Action</th></tr></thead><tbody>{issues.map(row=><tr key={row.issue} className="border-t border-[#EDF1F5] text-[10px] hover:bg-[#FAFBFD]"><td className="px-4 py-2.5"><b className="block">{row.issue}</b><span className="text-[8.5px] text-[#71809D]">{row.detail}</span></td><td className="px-3 py-2.5 text-[#52617D]">{row.type}</td><td className="px-3 py-2.5 font-bold">{row.pages} pages</td><td className="px-3 py-2.5"><span className={cn("rounded px-2 py-1 text-[8px] font-bold",row.level==="Critical"?"bg-[#FFF0F1] text-[#E30613]":"bg-[#FFF6E4] text-[#C87800]")}>{row.level}</span></td><td className="px-4 py-2.5 text-right"><button className="inline-flex items-center gap-1 text-[9px] font-bold text-[#2878E5]">View fix <ExternalLink className="size-3"/></button></td></tr>)}</tbody></table></div></Card> }
function Vital({name,value,note,progress,tone}:{name:string;value:string;note:string;progress:string;tone:"green"|"amber"}){return <div><div className="mb-1.5 flex items-center justify-between"><div className="flex items-baseline gap-2"><b className="text-[11px]">{name}</b><span className="text-[10px] font-bold">{value}</span></div><span className={cn("text-[8px] font-bold",tone==="green"?"text-[#078359]":"text-[#C87800]")}>{note}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#EDF1F5]"><div className={cn("h-full rounded-full",tone==="green"?"bg-[#0AA673]":"bg-[#F2A20C]")} style={{width:progress}}/></div></div>}
function Insight({icon:Icon,title,value,note,tone}:{icon:typeof FileSearch;title:string;value:string;note:string;tone:"green"|"blue"|"purple"}){const colors={green:"bg-[#E5F7EF] text-[#078359]",blue:"bg-[#EAF3FF] text-[#2878E5]",purple:"bg-[#F1EAFF] text-[#7A4CE0]"};return <Card className="flex items-center gap-3 p-4"><span className={cn("grid size-10 shrink-0 place-items-center rounded-xl",colors[tone])}><Icon className="size-5"/></span><div><p className="text-[9px] font-semibold text-[#71809D]">{title}</p><b className="text-[14px]">{value}</b><p className="text-[8.5px] text-[#71809D]">{note}</p></div></Card>}
function EmptyPanel({title}:{title:string}){return <Card className="grid min-h-[360px] place-items-center p-8 text-center"><div><FileSearch className="mx-auto size-10 text-[#CBD5E1]"/><h2 className="mt-3 text-[16px] font-bold">{title}</h2><p className="mt-1 text-[11px] text-[#71809D]">Detailed {title.toLowerCase()} results from the latest crawl.</p><button className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-[#172044] px-4 text-[10px] font-bold text-white"><Play className="size-3"/>Open report</button></div></Card>}
