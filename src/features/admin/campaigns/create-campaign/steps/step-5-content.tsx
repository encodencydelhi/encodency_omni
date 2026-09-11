"use client";

import Image from "next/image";
import {
  BarChart3,
  CalendarDays,
  Check,
  Clock,
  Copy,
  FileText,
  ImageIcon,
  Link2,
  MessageCircle,
  Plus,
  ShieldCheck,
  ThumbsUp,
  Upload,
  Video,
  X,
} from "lucide-react";
import type { CampaignDraft } from "../draft";
import { ChannelLogo } from "../../../shared/channel-logo";
import { Field, SelectInput, TagField, Textarea, TextInput } from "../ui";
import { cn } from "@/lib/utils/cn";

type Setter = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;

const MEDIA = [
  { src: "/campaigns/save-rivers/wide.png", name: "river-cleanup-1.jpg", meta: "1920 x 1080 - 2.4 MB" },
  { src: "/campaigns/save-rivers/wide-2.png", name: "community-video.mp4", meta: "00:28 - 1080 - 48 MB", video: true },
  { src: "/campaigns/save-rivers/square.png", name: "volunteers.jpg", meta: "1080 x 1350 - 1.8 MB" },
];

const PLATFORM_TABS = [
  { id: "Instagram Post", channel: "Instagram" },
  { id: "Instagram Reel", channel: "Instagram" },
  { id: "Instagram Story", channel: "Instagram" },
  { id: "Facebook Post", channel: "Facebook" },
  { id: "LinkedIn Post", channel: "LinkedIn" },
  { id: "Google Business", channel: "Google Business" },
  { id: "WhatsApp Broadcast", channel: "WhatsApp" },
  { id: "YouTube Short", channel: "YouTube" },
  { id: "Website Banner", channel: "Website" },
] as const;

const TIMELINE = [
  { channel: "Instagram", time: "10:00 AM" },
  { channel: "Facebook", time: "10:05 AM" },
  { channel: "LinkedIn", time: "10:10 AM" },
  { channel: "Google Business", time: "10:15 AM" },
  { channel: "YouTube", time: "10:20 AM" },
  { channel: "WhatsApp", time: "10:25 AM" },
  { channel: "Website", time: "10:30 AM" },
] as const;

export function StepContent({ draft, set }: { draft: CampaignDraft; set: Setter }) {
  return (
    <div className="space-y-2.5">
      <Panel
        letter="A"
        icon={ImageIcon}
        title="Content, Media & Schedule"
        caption="Create your campaign content, upload media assets, configure platform-specific content and set the publishing schedule."
        action={<button className="h-8 rounded-lg border border-[#DDE6F1] px-3 text-[11px] font-semibold text-[#155EEF]">View Media Library</button>}
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
          <div className="min-w-0 rounded-lg border border-[#E7EDF5] bg-white p-3">
            <SectionTitle icon={FileText} title="Campaign Content" />
            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_.8fr]">
              <Field label="Campaign Message / Title" required>
                <TextInput value={draft.title} onChange={(v) => set("title", v)} />
              </Field>
              <Field label="Call to Action" required>
                <SelectInput
                  value="Join the Movement"
                  onChange={(v) => set("cta", v)}
                  options={["Join the Movement", "Learn More", "Donate Now", "Volunteer"]}
                />
              </Field>
              <Field label="Master Caption" required>
                <Textarea value={draft.masterCaption} onChange={(v) => set("masterCaption", v)} rows={4} max={500} />
              </Field>
              <Field label="Hashtags / Keywords">
                <TagField tags={["#CleanRivers", "#NamoGange", "#WaterForLife", "#SustainableIndia", "#RiverConservation"]} onChange={(v) => set("hashtags", v)} addLabel="Add" chevron={false} />
              </Field>
              <Field label="Internal Content Notes" className="lg:col-span-2">
                <Textarea
                  value="Use emotional storytelling with real people and places. Highlight community participation, river health and before-after visuals."
                  onChange={() => undefined}
                  rows={2}
                  max={300}
                />
              </Field>
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-[#E7EDF5] bg-white p-3">
            <SectionTitle icon={ImageIcon} title="Media Assets" caption="Upload images and videos for your campaign." />
            <div className="mt-3 rounded-lg border border-dashed border-[#BFD4F2] bg-[#F8FBFF] p-3 text-center">
              <button className="mx-auto flex h-8 items-center gap-2 rounded-md bg-[#155EEF] px-4 text-[11px] font-semibold text-white">
                <Upload className="size-3.5" />
                Upload Media
              </button>
              <p className="mt-2 text-[10px] leading-4 text-[#687797]">Drag & drop files here or click to browse<br />Supports JPG, PNG, MP4, MOV - Max size: 500 MB</p>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {MEDIA.map((asset) => (
                <div key={asset.name} className="overflow-hidden rounded-lg border border-[#DDE6F1] bg-white">
                  <span className="relative block h-[78px]">
                    <Image src={asset.src} alt="" fill sizes="160px" className="object-cover" />
                    <i className="absolute left-1.5 top-1.5 grid size-5 place-items-center rounded bg-[#0AA673] text-white"><Check className="size-3" /></i>
                    {asset.video && <i className="absolute inset-0 m-auto grid size-9 place-items-center rounded-full bg-black/55 text-white"><Video className="size-4" /></i>}
                    <button className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded bg-white text-[#E11D28]"><X className="size-3" /></button>
                  </span>
                  <div className="p-1.5">
                    <b className="block truncate text-[9.5px] text-[#132044]">{asset.name}</b>
                    <small className="block truncate text-[8.5px] text-[#687797]">{asset.meta}</small>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#E5F7EF] px-1.5 py-0.5 text-[8px] font-bold text-[#078359]">
                      <i className="size-1.5 rounded-full bg-[#0AA673]" />
                      Good Quality
                    </span>
                  </div>
                </div>
              ))}
              <button className="flex min-h-[124px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#BFD4F2] bg-[#F8FBFF] text-[10px] font-semibold text-[#155EEF]">
                <span className="grid size-9 place-items-center rounded-full bg-[#EAF2FF]"><Plus className="size-4" /></span>
                Add More Media
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.72fr)]">
          <div className="rounded-lg border border-[#E7EDF5] bg-white p-3">
            <div className="grid gap-3 xl:grid-cols-[.55fr_1fr]">
              <ControlGroup title="Media Type" options={[["Image", ImageIcon], ["Video", Video]]} active="Image" />
              <ControlGroup title="Content Format" options={[["Single Post", FileText], ["Carousel", Copy], ["Reel", Video], ["Story", ImageIcon], ["Short", Video], ["Banner", ImageIcon]]} active="Single Post" />
            </div>
            <div className="mt-3">
              <b className="mb-2 block text-[11px] text-[#132044]">Aspect Ratio Preset</b>
              <div className="grid grid-cols-5 gap-1.5">
                {["1:1 Square", "4:5 Portrait", "9:16 Vertical", "16:9 Landscape", "1.91:1 Wide"].map((item, index) => (
                  <button key={item} className={cn("h-10 rounded-lg border text-[9.5px] font-semibold", index === 0 ? "border-[#155EEF] bg-[#EFF6FF] text-[#155EEF]" : "border-[#DDE6F1] text-[#526385]")}>{item}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-[#E7EDF5] bg-white p-3">
            <b className="block text-[12px] text-[#132044]">Auto Resize & Safe Area</b>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {["Smart Crop (AI)", "Keep Face Safe Area", "Extend Background", "Center Logo", "Choose Cover Thumbnail"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-2 py-2">
                  <ShieldCheck className="size-4 text-[#0AA673]" />
                  <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#34415F]">{item}</span>
                  <span className="h-5 w-9 rounded-full bg-[#18B875] p-0.5"><i className="block size-4 translate-x-4 rounded-full bg-white" /></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel letter="B" icon={BarChart3} title="Platform-Specific Content" caption="Customize your content for each platform. Each platform can have different captions, media, and settings.">
        <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-[#E7EDF5] pb-0">
          {PLATFORM_TABS.map((tab, index) => (
            <button key={tab.id} className={cn("flex h-8 shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 text-[10.5px] font-semibold", index === 0 ? "border-[#DDE6F1] bg-white text-[#155EEF]" : "border-transparent text-[#687797]")}>
              <ChannelLogo channel={tab.channel} className="size-4" />
              {tab.id}
            </button>
          ))}
        </div>

        <div className="grid gap-3 rounded-b-lg border-x border-b border-[#E7EDF5] p-3 xl:grid-cols-[minmax(360px,1fr)_360px_minmax(460px,1fr)]">
          <div>
            <SectionTitle icon={ChannelLogo as unknown as typeof ImageIcon} title="Instagram Post Settings" caption="Customize content for Instagram feed posts." />
            <Field label="Caption">
              <Textarea value={draft.masterCaption} onChange={(v) => set("masterCaption", v)} rows={6} max={2200} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Media">
              <span className="relative block h-[96px] overflow-hidden rounded-lg border border-[#DDE6F1]">
                <Image src="/campaigns/save-rivers/square.png" alt="" fill sizes="150px" className="object-cover" />
                <button className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-2 py-0.5 text-[8px] font-semibold text-white">Edit</button>
              </span>
            </Field>
            <Field label="Alt Text (for accessibility)">
              <Textarea value="Riverside cleanup drive with volunteers" onChange={() => undefined} rows={4} max={125} />
            </Field>
            <Field label="Location (Optional)" className="col-span-2">
              <TextInput value="" onChange={() => undefined} placeholder="Add location (e.g. Delhi, India)" />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-[240px_minmax(0,1fr)]">
            <PostPreview />
            <div>
              <b className="mb-2 block text-[11.5px] text-[#132044]">Platform Options</b>
              {["Include Location", "Tag People / Organizations", "Add Link in Bio Reminder"].map((item) => (
                <div key={item} className="mb-2 flex items-center gap-2">
                  <span className="h-5 w-9 rounded-full bg-[#18B875] p-0.5"><i className="block size-4 translate-x-4 rounded-full bg-white" /></span>
                  <span className="text-[10px] font-semibold text-[#34415F]">{item}</span>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <Field label="CTA Button">
                  <SelectInput value={draft.cta} onChange={(v) => set("cta", v)} options={["Learn More", "Join Now"]} />
                </Field>
                <Field label="First Comment">
                  <TextInput value="#CleanRivers #NamoGange" onChange={() => undefined} />
                </Field>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-[.9fr_1fr_1fr_1fr]">
        <BottomCard icon={CalendarDays} title="Schedule Publishing">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Publish Date"><TextInput icon={CalendarDays} value="Apr 19, 2025" onChange={() => undefined} /></Field>
            <Field label="Publish Time"><TextInput icon={Clock} value="10:00 AM" onChange={() => undefined} /></Field>
            <Field label="Recurrence"><SelectInput value="Does not repeat" onChange={() => undefined} options={["Does not repeat", "Daily"]} /></Field>
            <Field label="Timezone"><SelectInput value="Asia/Kolkata (IST)" onChange={() => undefined} options={["Asia/Kolkata (IST)", "UTC"]} /></Field>
          </div>
        </BottomCard>
        <BottomCard icon={Upload} title="Content Timeline Preview" caption="See when your content will be published across channels.">
          <b className="block text-[10px] text-[#34415F]">Apr 19, 2025 - 10:00 AM (IST)</b>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {TIMELINE.map((item) => <span key={item.channel} className="grid place-items-center rounded-lg bg-[#F8FAFC] px-1 py-1.5"><ChannelLogo channel={item.channel} className="size-4" /><small className="mt-1 text-[8px] text-[#155EEF]">{item.time}</small></span>)}
          </div>
        </BottomCard>
        <BottomCard icon={Link2} title="Tracking & Analytics" caption="Add tracking parameters to measure performance.">
          <div className="grid grid-cols-4 gap-1.5">
            {["namo-gange-2025", "social", "organic", "river-cleanup-1"].map((value) => <span key={value} className="truncate rounded-md border border-[#DDE6F1] px-2 py-1.5 text-[9px] text-[#132044]">{value}</span>)}
          </div>
          <p className="mt-2 truncate rounded bg-[#F8FAFC] px-2 py-1.5 text-[9px] text-[#526385]">https://mokshasewa.org/namo-gange</p>
        </BottomCard>
        <BottomCard icon={ShieldCheck} title="Compliance & Approval" caption="Ensure content meets guidelines.">
          <SelectInput value="Approved" onChange={() => undefined} options={["Approved", "Pending Review"]} tone="success" />
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
            {["Follows brand guidelines", "No sensitive content", "Environmental claims verified", "Approved by client"].map((item) => <span key={item} className="flex items-center gap-1 text-[9px] text-[#078359]"><Check className="size-3" />{item}</span>)}
          </div>
        </BottomCard>
      </div>
    </div>
  );
}

function Panel({ letter, icon: Icon, title, caption, action, children }: { letter: string; icon: typeof ImageIcon; title: string; caption: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#DDE6F1] bg-white p-3 shadow-[0_1px_4px_rgb(15_23_42/0.05)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#FFE6EA] text-[13px] font-black text-[#EB0711]">{letter}</span>
        <Icon className="size-4 text-[#155EEF]" />
        <div className="min-w-0 flex-1">
          <b className="block text-[15px] font-black leading-5 text-[#101A3D]">{title}</b>
          <small className="block text-[10.5px] leading-4 text-[#526385]">{caption}</small>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, title, caption }: { icon: typeof ImageIcon; title: string; caption?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EAF2FF] text-[#155EEF]"><Icon className="size-4" /></span>
      <span>
        <b className="block text-[12px] font-bold text-[#132044]">{title}</b>
        {caption && <small className="block text-[9.5px] text-[#687797]">{caption}</small>}
      </span>
    </div>
  );
}

function ControlGroup({ title, options, active }: { title: string; options: [string, typeof ImageIcon][]; active: string }) {
  return (
    <div>
      <b className="mb-2 block text-[11px] text-[#132044]">{title}</b>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([label, Icon]) => (
          <button key={label} className={cn("flex h-10 min-w-[62px] items-center justify-center gap-1 rounded-lg border px-2 text-[9.5px] font-semibold", label === active ? "border-[#155EEF] bg-[#EFF6FF] text-[#155EEF]" : "border-[#DDE6F1] text-[#526385]")}>
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PostPreview() {
  return (
    <div>
      <b className="mb-2 block text-[11.5px] text-[#132044]">Preview</b>
      <div className="overflow-hidden rounded-lg border border-[#DDE6F1] bg-white">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="relative size-6 overflow-hidden rounded-full"><Image src="/campaigns/save-rivers/square.png" alt="" fill sizes="40px" className="object-cover" /></span>
          <span><b className="block text-[9px] text-[#132044]">moksha.sewa</b><small className="text-[8px] text-[#687797]">India</small></span>
        </div>
        <span className="relative block aspect-square"><Image src="/campaigns/save-rivers/square.png" alt="" fill sizes="220px" className="object-cover" /></span>
        <div className="flex gap-2 px-2 py-1.5 text-[#132044]"><ThumbsUp className="size-3.5" /><MessageCircle className="size-3.5" /></div>
      </div>
    </div>
  );
}

function BottomCard({ icon: Icon, title, caption, children }: { icon: typeof ImageIcon; title: string; caption?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#DDE6F1] bg-white p-3 shadow-[0_1px_4px_rgb(15_23_42/0.05)]">
      <div className="mb-2 flex items-start gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EAF2FF] text-[#155EEF]"><Icon className="size-4" /></span>
        <span>
          <b className="block text-[12px] font-bold text-[#132044]">{title}</b>
          {caption && <small className="block text-[9px] leading-3 text-[#687797]">{caption}</small>}
        </span>
      </div>
      {children}
    </section>
  );
}
