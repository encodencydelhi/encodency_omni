"use client";

import { Activity, ArrowRight, Bot, CheckCircle2, Clock3, MessageCircle, Plus, UserRoundCheck, Zap, type LucideIcon } from "lucide-react";
import { AdminPageTitle } from "../shared/admin-page-title";

const workflows = [
  { name: "New Meta Lead Follow-up", trigger: "New Meta lead", runs: "1,248", success: "98.4%", status: "Active" },
  { name: "Google Review Alert", trigger: "New Google review", runs: "428", success: "100%", status: "Active" },
  { name: "SEO Critical Issue", trigger: "Critical SEO issue", runs: "84", success: "96.2%", status: "Active" },
  { name: "WhatsApp Re-engagement", trigger: "No reply for 24 hours", runs: "316", success: "91.8%", status: "Paused" },
];
const workflowSteps: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Bot, label: "New Meta Lead" }, { icon: MessageCircle, label: "Send WhatsApp" },
  { icon: Clock3, label: "Wait 2 hours" }, { icon: UserRoundCheck, label: "Assign user" },
];

export function AutomationPage({ logs = false }: { logs?: boolean }) {
  return <div className="space-y-3">
    <AdminPageTitle eyebrow="Automation / Workflows" title={logs ? "Execution Logs" : "Automation"} description="Automate lead follow-up, notifications and marketing operations." action={!logs ? <button className="flex h-8 items-center gap-1.5 rounded-lg bg-[#EB0711] px-3 text-[8.5px] font-semibold text-white"><Plus className="size-3.5" />Create Workflow</button> : undefined} />
    {logs ? <section className="rounded-lg border border-[#DDE4ED] bg-white shadow-sm">{workflows.flatMap((workflow, index) => [1, 2].map((run) => <div key={`${index}-${run}`} className="flex items-center gap-3 border-b border-[#E8EDF3] px-3 py-2.5"><CheckCircle2 className="size-4 text-[#078359]" /><div className="flex-1"><p className="text-[8.5px] font-bold text-[#27375D]">{workflow.name}</p><p className="text-[7px] text-[#75829D]">Run #{1248 - index * 42 - run} · Completed in {run + 1}.2s</p></div><span className="text-[7.5px] text-[#75829D]">{run * 18} min ago</span></div>))}</section> : <AutomationOverview />}
  </div>;
}

function AutomationOverview() {
  return <><div className="grid grid-cols-2 gap-2 lg:grid-cols-4"><Metric icon={Zap} label="Active Workflows" value="3" /><Metric icon={Activity} label="Runs this month" value="2,076" /><Metric icon={CheckCircle2} label="Success rate" value="97.1%" /><Metric icon={Clock3} label="Time saved" value="84 hrs" /></div><div className="grid gap-3 xl:grid-cols-[1.1fr_.9fr]"><section className="rounded-lg border border-[#DDE4ED] bg-white shadow-sm"><h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[10px] font-bold">Workflows</h2>{workflows.map((workflow) => <div key={workflow.name} className="grid grid-cols-[1fr_100px_70px_60px] items-center border-b border-[#E8EDF3] px-3 py-2.5 text-[8px]"><div><p className="font-bold text-[#27375D]">{workflow.name}</p><p className="text-[7px] text-[#75829D]">Trigger: {workflow.trigger}</p></div><span>{workflow.runs} runs</span><span className="text-[#078359]">{workflow.success}</span><span>{workflow.status}</span></div>)}</section><section className="rounded-lg border border-[#DDE4ED] bg-white p-4 shadow-sm"><h2 className="text-[10px] font-bold">Workflow preview</h2><div className="mt-4 flex flex-col items-center gap-2">{workflowSteps.map(({ icon: Icon, label }, index) => <div key={label} className="contents"><div className="flex w-full items-center gap-2 rounded-lg border border-[#DDE4ED] p-2.5"><Icon className="size-4 text-[#EB0711]" /><span className="text-[8.5px] font-semibold">{label}</span></div>{index < workflowSteps.length - 1 && <ArrowRight className="size-3 rotate-90 text-[#8D99AE]" />}</div>)}</div></section></div></>;
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="rounded-lg border border-[#DDE4ED] bg-white p-3 shadow-sm"><Icon className="size-4 text-[#EB0711]" /><p className="mt-2 text-[7.5px] text-[#75829D]">{label}</p><p className="text-[17px] font-bold text-[#172044]">{value}</p></div>; }
