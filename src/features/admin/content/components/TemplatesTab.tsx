"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { PlatformBadge } from "./ui-platform";
import { MOCK_TEMPLATES, TEMPLATE_CATEGORIES } from "../mocks/content.mock";
import { PLATFORM_META } from "../config/platform-config";

export function TemplatesTab() {
  const [cat, setCat] = useState("All");
  const [selected, setSelected] = useState(0);
  const filtered = cat === "All" ? MOCK_TEMPLATES : MOCK_TEMPLATES.filter((t) => t.category === cat);
  const active = filtered[selected] ?? filtered[0];
  return (
    <div className="grid items-start gap-3 xl:grid-cols-[180px_minmax(0,1fr)_300px]">
      <Card className="[&>div]:p-2.5" title="Categories">
        <div className="space-y-px">
          {TEMPLATE_CATEGORIES.map((c) => (
            <button key={c} onClick={() => { setCat(c); setSelected(0); }} className={cn("flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[11.5px] font-semibold transition", cat === c ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#687797] hover:bg-slate-50")}>{c}</button>
          ))}
        </div>
      </Card>

      <Card title={`Templates · ${filtered.length}`} action={<label className="flex h-8 w-48 items-center gap-1.5 rounded-lg border border-[#D9E1EC] px-2.5 text-[11.5px] text-[#7A87A0]"><Search className="size-3.5" /><input placeholder="Search..." className="w-full bg-transparent outline-none" /></label>}>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((t, i) => (
            <button key={t.id} onClick={() => setSelected(i)} className={cn("overflow-hidden rounded-lg border bg-white text-left transition", selected === i ? "border-[#1769DF] shadow-md ring-1 ring-blue-100" : "border-[#E2E8F0] hover:shadow-md")}>
              <div className="relative">
                <img src={t.image} alt={t.title} className="aspect-[4/3] w-full object-cover" />
                {t.isPro && <span className="absolute right-1.5 top-1.5 rounded bg-amber-400 px-1.5 py-px text-[9px] font-black text-amber-950">PRO</span>}
              </div>
              <div className="p-2">
                <p className="truncate text-[11.5px] font-bold text-[#24365A]">{t.title}</p>
                <p className="text-[10.5px] text-[#7A87A0]">{t.category}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {active && (
        <Card title="Preview" className="xl:sticky xl:top-4">
          <img src={active.image} alt="" className="aspect-[4/4.4] w-full rounded-lg object-cover" />
          <p className="mt-2 text-[13px] font-bold text-[#172044]">{active.title}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <PlatformBadge platform={active.platform} size="sm" />
            <span className="text-[10.5px] text-[#7A87A0]">{PLATFORM_META[active.platform].label} · {active.ratio}</span>
          </div>
          <button className="mt-2.5 h-9 w-full rounded-lg bg-[#EB0711] text-[12px] font-bold text-white shadow-sm transition hover:bg-[#D60811]">Use this template</button>
          <button className="mt-1.5 h-8 w-full rounded-lg border text-[11.5px] font-bold text-[#687797] hover:bg-slate-50">Customize in editor</button>
        </Card>
      )}
    </div>
  );
}