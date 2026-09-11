"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, Gauge, Play } from "lucide-react";
import { AdminPageTitle } from "../shared/admin-page-title";
import { cn } from "@/lib/utils/cn";
import { SeoAuditView } from "./seo-audit-view";

const pages = [{url:"/",status:200,title:"Moksha Sewa | Service with dignity",issues:0,score:96},{url:"/services",status:200,title:"Our Services",issues:2,score:84},{url:"/volunteer",status:200,title:"Volunteer with Moksha Sewa",issues:3,score:78},{url:"/donate",status:200,title:"Support Our Mission",issues:1,score:91},{url:"/events/old",status:404,title:"Page not found",issues:5,score:32}];
const issues=[{title:"3 pages missing meta descriptions",severity:"Critical",pages:3},{title:"Images missing alt text",severity:"High",pages:8},{title:"Titles exceed 60 characters",severity:"Medium",pages:4},{title:"Broken internal links",severity:"Critical",pages:2},{title:"Slow response time",severity:"Low",pages:6}];
const keywords=[{name:"moksha sewa",position:3,change:2,url:"/"},{name:"antim sanskar sewa delhi",position:6,change:4,url:"/services"},{name:"volunteer ngo delhi",position:11,change:-2,url:"/volunteer"},{name:"free cremation service",position:8,change:6,url:"/services"}];

export function SeoPage({ view = "overview" }: { view?: "overview"|"audit"|"pages"|"issues"|"keywords" }) { 
  const [running,setRunning]=useState(false); 
  const title={overview:"SEO Overview",audit:"Site Audit",pages:"Pages",issues:"SEO Issues",keywords:"Keywords"}[view]; 

  if (view === "audit") {
    return <SeoAuditView />;
  }

  return (
    <div className="space-y-3">
      <AdminPageTitle 
        eyebrow={`SEO / ${title}`} 
        title={title} 
        description="Monitor and improve organic visibility for mokshasewa.org." 
        action={
          <button onClick={()=>{setRunning(true);setTimeout(()=>setRunning(false),1800)}} className="flex h-8 items-center gap-1.5 rounded-lg bg-[#EB0711] px-3 text-[8.5px] font-semibold text-white">
            <Play className="size-3" />
            {running?"Audit running...":"Run SEO Audit"}
          </button>
        } 
      />
      {view==="overview"&&<><div className="grid grid-cols-2 gap-2 lg:grid-cols-5"><Stat icon={Gauge} label="SEO Score" value="86/100"/><Stat icon={FileSearch} label="Crawled Pages" value="142"/><Stat icon={AlertTriangle} label="Critical Issues" value="5" danger/><Stat icon={AlertTriangle} label="Warnings" value="18"/><Stat icon={CheckCircle2} label="Passed Checks" value="1,248"/></div><div className="grid gap-3 lg:grid-cols-[1.2fr_.8fr]"><Panel title="SEO health trend"><div className="flex h-48 items-end gap-4 px-5 pb-4">{[68,72,70,76,79,78,82,86].map((h,i)=><span key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#13A070] to-[#8BD4BA]" style={{height:`${h*1.7}px`}}/>)}</div></Panel><Panel title="Priority actions">{issues.slice(0,4).map(issue=><Issue key={issue.title} {...issue}/>)}</Panel></div></>}
      {view==="pages"&&<Panel title="Crawled pages"><DataTable rows={pages.map(p=>[p.url,String(p.status),p.title,String(p.issues),`${p.score}/100`])} headers={["URL","Status","Title","Issues","Score"]}/></Panel>}
      {view==="issues"&&<Panel title="Detected issues">{issues.map(issue=><Issue key={issue.title} {...issue}/>)}</Panel>}
      {view==="keywords"&&<Panel title="Tracked keywords"><DataTable rows={keywords.map(k=>[k.name,String(k.position),`${k.change>0?"+":""}${k.change}`,k.url])} headers={["Keyword","Position","Change","Ranking URL"]}/></Panel>}
    </div>
  ); 
}

function Stat({icon:Icon,label,value,danger}:{icon:typeof Gauge;label:string;value:string;danger?:boolean}){return <div className="rounded-lg border border-[#DDE4ED] bg-white p-2.5 shadow-sm"><Icon className={cn("size-4",danger?"text-[#EB0711]":"text-[#168762]")}/><p className="mt-2 text-[7.5px] text-[#75829D]">{label}</p><p className="text-[17px] font-bold text-[#172044]">{value}</p></div>}
function Panel({title,children}:{title:string;children:React.ReactNode}){return <section className="overflow-hidden rounded-lg border border-[#DDE4ED] bg-white shadow-sm"><h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[10px] font-bold text-[#172044]">{title}</h2>{children}</section>}
function Issue({title,severity,pages}:{title:string;severity:string;pages:number}){return <div className="flex items-center gap-2 border-b border-[#E8EDF3] px-3 py-2.5"><span className={cn("grid size-7 place-items-center rounded-lg",severity==="Critical"?"bg-[#FFE8EA] text-[#D91521]":"bg-[#FFF3DC] text-[#B27818]")}><AlertTriangle className="size-3.5"/></span><div className="flex-1"><p className="text-[8.5px] font-semibold text-[#24345D]">{title}</p><p className="text-[7.5px] text-[#75829D]">{pages} affected pages</p></div><span className="text-[7px] font-bold text-[#EB0711]">{severity}</span></div>}
function DataTable({headers,rows}:{headers:string[];rows:string[][]}){return <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-[#F8FAFD] text-[7px] uppercase text-[#75829D]"><tr>{headers.map(h=><th key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#E8EDF3]">{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} className="px-3 py-2.5 text-[8.5px] text-[#354568]">{cell}</td>)}</tr>)}</tbody></table></div>}
