"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { PlatformBadge } from "./ui-platform";
import { MOCK_IDEAS } from "../mocks/content.mock";


export function IdeasTab() {
  const [selected, setSelected] = useState(0);
  const active = MOCK_IDEAS[selected]!;
  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card title="Content ideas" subtitle="Curated prompts for your next post" action={<button className="flex h-8 items-center gap-1.5 rounded-lg bg-purple-50 px-3 text-[11.5px] font-bold text-purple-700 ring-1 ring-purple-200 hover:bg-purple-100"><Sparkles className="size-3.5" /> Generate with AI</button>}>
        <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {MOCK_IDEAS.map((idea, i) => (
            <button key={idea.id} onClick={() => setSelected(i)} className={cn("overflow-hidden rounded-lg border text-left transition", selected === i ? "border-[#1769DF] shadow-md ring-1 ring-blue-100" : "border-[#E2E8F0] hover:shadow-md")}>
              <img src={idea.image} alt="" className="aspect-[16/9] w-full object-cover" />
              <div className="p-2">
                <span className="rounded bg-[#F0F6FF] px-1.5 py-px text-[9.5px] font-bold text-[#1769DF]">#{idea.tag}</span>
                <p className="mt-1 text-[12px] font-bold text-[#24365A]">{idea.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#7A87A0]">{idea.description}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Idea details" className="xl:sticky xl:top-4">
        <img src={active.image} alt="" className="aspect-video w-full rounded-lg object-cover" />
        <p className="mt-2 text-[13px] font-bold text-[#172044]">{active.title}</p>
        <p className="mt-0.5 text-[11.5px] leading-4 text-[#7A87A0]">{active.description}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {active.channels.map((c) => <PlatformBadge key={c} platform={c} size="sm" />)}
        </div>
        <div className="mt-2 space-y-1 text-[10.5px]">
          {[["Content Type", active.contentType], ["Suggested CTA", active.suggestedCTA], ["Best Time", "9–11 AM"]].map(([k, v]) => (
            <div key={k} className="flex justify-between"><dt className="text-[#7A87A0]">{k}</dt><dd className="font-semibold text-[#33445F]">{v}</dd></div>
          ))}
        </div>
        <button className="mt-2.5 h-9 w-full rounded-lg bg-[#EB0711] text-[12px] font-bold text-white transition hover:bg-[#D60811]">Use this idea</button>
        <button className="mt-1.5 h-8 w-full rounded-lg border text-[11.5px] font-bold text-[#687797] hover:bg-slate-50">Customize with AI</button>
      </Card>
    </div>
  );
}