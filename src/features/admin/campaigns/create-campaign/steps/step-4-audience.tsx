"use client";

import type { ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  Ban,
  Check,
  ChevronDown,
  FileText,
  Heart,
  Info,
  Languages,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Tag,
  Upload,
  Users,
} from "lucide-react";
import type { CampaignDraft } from "../draft";
import { Field, GreenToggle, SelectInput, TagField } from "../ui";
import { cn } from "@/lib/utils/cn";

type Setter = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;

const AGE_TICKS = ["13+", "18", "25", "35", "45", "55", "65+"];
const TAGS = ["Environment", "River Conservation", "Sustainability", "Volunteers", "NGOs", "Students", "Families"];

const AGE_BREAKDOWN = [
  { name: "18-24 years", value: 28, color: "#155EEF" },
  { name: "25-34 years", value: 32, color: "#7C3AED" },
  { name: "35-44 years", value: 22, color: "#F59E0B" },
  { name: "45+ years", value: 18, color: "#14B8A6" },
];

const GENDER_SPLIT = [
  { name: "Male", value: 52, color: "#155EEF" },
  { name: "Female", value: 46, color: "#EC4899" },
  { name: "Non-binary", value: 2, color: "#A855F7" },
];

export function StepAudience({ draft, set }: { draft: CampaignDraft; set: Setter }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#DDE6F1] bg-white shadow-[0_1px_4px_rgb(15_23_42/0.05)]">
      <div className="flex items-center gap-3 border-b border-[#E7EDF5] p-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#FFE6EA] text-[#EB0711]">
          <Users className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[19px] font-black leading-6 text-[#101A3D]">Target Audience Profile</h2>
          <p className="text-[11.5px] leading-4 text-[#526385]">
            Define who you want to reach. The right audience helps you create greater impact for a cleaner, healthier tomorrow.
          </p>
        </div>
        <button className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#DDE6F1] bg-white px-3 text-[11px] font-semibold text-[#155EEF]">
          <FileText className="size-3.5" />
          Save as Audience Template
        </button>
      </div>

      <div className="grid gap-x-4 gap-y-3 border-b border-[#E7EDF5] p-3.5 xl:grid-cols-[1.05fr_.95fr_1fr]">
        <Field label="Audience Type" required hint="Define a custom audience based on demographics, interests and behavior.">
          <SelectInput
            icon={Users}
            value="Custom Audience"
            onChange={(v) => set("audienceType", v)}
            options={["Custom Audience", "General Public", "Donors", "Volunteers", "Students"]}
          />
        </Field>

        <Field label="Age Range" required>
          <div className="px-1 pt-1">
            <div className="mb-2 flex justify-end text-[11px] font-semibold text-[#687797]">15 - 45 years</div>
            <span className="relative block h-1.5 rounded-full bg-[#E7EDF5]">
              <i className="absolute inset-y-0 left-[22%] right-[34%] rounded-full bg-[#155EEF]" />
              <i className="absolute left-[22%] top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#155EEF] shadow" />
              <i className="absolute right-[34%] top-1/2 size-4 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#155EEF] shadow" />
            </span>
            <div className="mt-3 flex justify-between text-[10px] font-medium text-[#687797]">
              {AGE_TICKS.map((tick) => <span key={tick}>{tick}</span>)}
            </div>
          </div>
        </Field>

        <Field label="Gender" required>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: "All", icon: "⚪" },
              { label: "Male", icon: "♂" },
              { label: "Female", icon: "♀" },
              { label: "Non-binary", icon: "⚭" },
            ].map(({ label, icon }) => (
              <button
                key={label}
                onClick={() => set("gender", label)}
                className={cn(
                  "h-[56px] rounded-lg border text-center text-[11px] font-semibold",
                  draft.gender === label ? "border-[#155EEF] bg-[#EFF6FF] text-[#155EEF]" : "border-[#DDE6F1] bg-white text-[#435371]",
                )}
              >
                <span className="block text-[18px] leading-5">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Target Cities / Regions" required>
          <TagField icon={MapPin} tags={["All India", "Uttarakhand", "Uttar Pradesh", "Delhi NCR", "Bihar"]} onChange={(v) => set("regions", v)} addLabel="Add location" />
        </Field>

        <Field label="Languages" required>
          <TagField icon={Languages} tags={["Hindi", "English", "Regional (e.g. Bengali)"]} onChange={(v) => set("languages", v)} addLabel="Add language" />
        </Field>

        <Field label="Device Preference">
          <div className="grid grid-cols-4 gap-1.5">
            {["All Devices", "Mobile", "Desktop", "Tablet"].map((item) => (
              <button
                key={item}
                onClick={() => set("devicePreference", item)}
                className={cn(
                  "h-[38px] rounded-lg border px-2 text-[10.5px] font-semibold",
                  (draft.devicePreference === item || (item === "All Devices" && draft.devicePreference === "All Devices"))
                    ? "border-[#155EEF] bg-[#EFF6FF] text-[#155EEF]"
                    : "border-[#DDE6F1] bg-white text-[#435371]",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Interests">
          <TagField icon={Heart} tags={["Environment", "River Conservation", "Sustainability", "Climate Action", "NGOs", "Social Good"]} onChange={(v) => set("interests", v)} addLabel="Add interest" />
        </Field>

        <Field label="Audience Segments">
          <TagField icon={Users} tags={["Students", "Families", "Volunteers", "NGO Followers", "Environmental Enthusiasts"]} onChange={(v) => set("segments", v)} addLabel="Add segment" />
        </Field>

        <Field label="Platform-Specific Notes">
          <div className="relative rounded-lg border border-[#DDE6F1] bg-white">
            <MessageSquare className="absolute left-2.5 top-2.5 size-4 text-[#155EEF]" />
            <textarea
              rows={3}
              placeholder="Tailor messaging for each platform. E.g. inspirational videos for Instagram, detailed information for LinkedIn, community stories for Facebook."
              className="h-[70px] w-full resize-none rounded-lg bg-transparent pb-5 pl-8 pr-3 pt-2 text-[11px] leading-[15px] text-[#34415F] outline-none placeholder:text-[#8090AD]"
            />
            <span className="absolute bottom-1.5 right-2.5 text-[10px] text-[#687797]">0/300</span>
          </div>
        </Field>
      </div>

      <div className="border-b border-[#E7EDF5] p-3.5">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#DDE6F1] bg-white px-3 py-2">
          <Tag className="size-5 shrink-0 text-[#0AA673]" />
          <b className="mr-2 text-[12px] text-[#132044]">Suggested Tags</b>
          {TAGS.map((tag, index) => (
            <span
              key={tag}
              className={cn(
                "rounded-full px-3 py-1 text-[10.5px] font-semibold",
                index < 3 && "bg-[#E5F7EF] text-[#078359]",
                index >= 3 && index < 6 && "bg-[#EEF4FF] text-[#155EEF]",
                index >= 6 && "bg-[#F2EAFF] text-[#7C3AED]",
              )}
            >
              {tag}
            </span>
          ))}
          <button className="ml-auto flex h-7 items-center gap-1 rounded-full border border-[#DDE6F1] px-3 text-[10.5px] font-semibold text-[#155EEF]">
            <Plus className="size-3.5" />
            Add tag
          </button>
        </div>
      </div>

      <div className="grid gap-2 border-b border-[#E7EDF5] p-3.5 xl:grid-cols-4">
        <AudienceBox icon={Users} title="Custom Audience" caption="Upload your existing audience data to reach specific people." on={true}>
          <button className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#9BC2FF] bg-white text-[11px] font-semibold text-[#155EEF]">
            <Upload className="size-4" />
            Upload Audience List
          </button>
          <p className="mt-2 text-center text-[9.5px] text-[#7A89A4]">Supports CSV, TXT (Max 10 MB)</p>
          <button className="mt-1 block w-full text-center text-[10px] font-semibold text-[#155EEF]">Download template</button>
        </AudienceBox>

        <AudienceBox icon={RefreshCw} title="Retargeting" caption="Reach people who have previously engaged with your content." on={draft.retargeting} onToggle={() => set("retargeting", !draft.retargeting)}>
          <CheckRows rows={["Website visitors (last 180 days)", "Video viewers (25% or more)", "Engaged social media users", "Past campaign audience"]} />
        </AudienceBox>

        <AudienceBox icon={Users} title="Lookalike Audience" caption="Find new people similar to your existing audience." on={draft.lookalike} onToggle={() => set("lookalike", !draft.lookalike)}>
          <MiniSelect label="Source Audience" value="Website Visitors" />
          <MiniSelect label="Similarity" value="1% (Recommended)" />
          <p className="mt-1 text-[9px] text-[#7A89A4]">Find people most similar to your source audience.</p>
        </AudienceBox>

        <AudienceBox icon={Ban} title="Excluded Audiences" caption="Exclude people who should not see this campaign." on={true}>
          <TagField tags={["Existing Donors", "Internal Team", "Past Converters", "Competitors"]} onChange={(v) => set("excluded", v)} addLabel="Add exclusion" chevron={false} />
        </AudienceBox>
      </div>

      <div className="grid gap-2 p-3.5 xl:grid-cols-[.9fr_1fr]">
        <div className="flex items-center gap-3 rounded-lg border border-[#DDE6F1] bg-white p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#EAF2FF] text-[#155EEF]">
            <BarIcon />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <b className="text-[12px] text-[#132044]">Estimated Audience Size</b>
              <Info className="size-3.5 text-[#155EEF]" />
            </div>
            <b className="block text-[17px] font-black text-[#081438]">12.5M - 18.3M</b>
            <small className="text-[10px] text-[#687797]">people across selected regions</small>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#DDF8EA] px-3 py-1 text-[10.5px] font-semibold text-[#078359]">
            <Check className="size-3" />
            Good reach
          </span>
        </div>

        <div className="grid gap-3 rounded-lg border border-[#DDE6F1] bg-white p-3 lg:grid-cols-[1fr_1fr]">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#EAF2FF] text-[#155EEF]">
              <PieMiniIcon />
            </span>
            <div className="relative size-[104px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={AGE_BREAKDOWN} dataKey="value" innerRadius={34} outerRadius={50} startAngle={90} endAngle={-270} strokeWidth={0} isAnimationActive={false}>
                    {AGE_BREAKDOWN.map((slice) => <Cell key={slice.name} fill={slice.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <b className="block text-[14px] leading-4 text-[#081438]">12.5M</b>
                  <small className="text-[8px] text-[#687797]">People</small>
                </span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1">
              {AGE_BREAKDOWN.map((slice) => (
                <li key={slice.name} className="flex items-center gap-1.5 text-[10px]">
                  <i className="size-2 rounded-full" style={{ backgroundColor: slice.color }} />
                  <span className="flex-1 truncate text-[#435371]">{slice.name}</span>
                  <b className="text-[#132044]">{slice.value}%</b>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <b className="mb-2 block text-[11.5px] text-[#132044]">Gender Split</b>
            <div className="space-y-2">
              {GENDER_SPLIT.map((item) => (
                <div key={item.name} className="grid grid-cols-[74px_1fr_28px] items-center gap-2 text-[10px]">
                  <span className="text-[#435371]">{item.name}</span>
                  <span className="h-2 rounded-full bg-[#E7EDF5]">
                    <i className="block h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                  </span>
                  <b className="text-right text-[#132044]">{item.value}%</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AudienceBox({
  icon: Icon,
  title,
  caption,
  on,
  onToggle,
  children,
}: {
  icon: typeof Users;
  title: string;
  caption: string;
  on: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[150px] rounded-lg border border-[#DDE6F1] bg-white p-3">
      <div className="mb-2 flex items-start gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#F2EAFF] text-[#7C3AED]">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[12px] font-bold text-[#132044]">{title}</b>
          <small className="block text-[10px] leading-[13px] text-[#687797]">{caption}</small>
        </div>
        <GreenToggle on={on} onToggle={onToggle} />
      </div>
      {children}
    </div>
  );
}

function CheckRows({ rows }: { rows: string[] }) {
  return (
    <div className="space-y-1.5">
      {rows.map((row) => (
        <label key={row} className="flex items-center gap-2 text-[10.5px] font-medium text-[#34415F]">
          <span className="grid size-4 place-items-center rounded bg-[#155EEF] text-white">
            <Check className="size-3" />
          </span>
          {row}
        </label>
      ))}
    </div>
  );
}

function MiniSelect({ label, value }: { label: string; value: string }) {
  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-[10px] font-semibold text-[#34415F]">{label}</span>
      <span className="flex h-8 items-center rounded-lg border border-[#DDE6F1] px-2 text-[10.5px] font-semibold text-[#34415F]">
        {value}
        <ChevronDown className="ml-auto size-3.5 text-[#687797]" />
      </span>
    </label>
  );
}

function BarIcon() {
  return (
    <span className="flex h-5 items-end gap-1">
      {[9, 15, 22].map((height) => <i key={height} className="w-1.5 rounded bg-current" style={{ height }} />)}
    </span>
  );
}

function PieMiniIcon() {
  return (
    <span className="relative size-5 rounded-full border-[5px] border-[#155EEF] border-r-[#9BC2FF] border-t-[#0AA673]" />
  );
}
