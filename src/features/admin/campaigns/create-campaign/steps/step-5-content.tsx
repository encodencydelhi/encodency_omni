"use client";

import * as React from "react";
import Image from "next/image";
import {
  BarChart3,
  CalendarDays,
  Check,
  Clock,
  FileText,
  ImageIcon,
  Link2,
  MessageCircle,
  Plus,
  Sparkles,
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
  { src: "/campaigns/save-rivers/banner.png", name: "banner.png", meta: "1920 x 1080 - 3.2 MB" },
];

const PLATFORM_TABS = [
  { id: "Instagram Post", channel: "Instagram" },
  { id: "Instagram Reel", channel: "Instagram" },
  { id: "Instagram Story", channel: "Instagram" },
  { id: "Facebook Post", channel: "Facebook" },
  { id: "LinkedIn Post", channel: "LinkedIn" },
  { id: "YouTube Short", channel: "YouTube" },
  { id: "WhatsApp Broadcast", channel: "WhatsApp" },
  { id: "Google Business", channel: "Google Business" },
  { id: "Website Banner", channel: "Website" },
  { id: "X Post", channel: "X" },
] as const;

const AI_ADAPTATIONS = [
  { label: "Resize", desc: "Auto-crop for each platform" },
  { label: "Smart Crop", desc: "AI-powered focal point" },
  { label: "Rewrite Copy", desc: "Platform-specific captions" },
  { label: "Hashtags", desc: "Generate relevant hashtags" },
  { label: "CTA Generation", desc: "Optimized call-to-actions" },
  { label: "Alt Text", desc: "Accessibility descriptions" },
  { label: "Thumbnail", desc: "Generate video thumbnails" },
  { label: "Translate", desc: "Multi-language support" },
] as const;

const DEFAULT_FORMATS = ["4:5 IG Feed", "9:16 Reel", "9:16 Story", "1.91:1 FB", "1:1 LinkedIn", "16:9 YT", "9:16 Shorts", "16:9 X", "16:9 Web", "3:1 Email"];

export function StepContent({ draft, set }: { draft: CampaignDraft; set: Setter }) {
  const [customFormats, setCustomFormats] = React.useState<{ ratio: string; label: string }[]>([]);
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [newRatio, setNewRatio] = React.useState("");
  const [newLabel, setNewLabel] = React.useState("");

  const addCustomFormat = () => {
    if (newRatio.trim() && newLabel.trim()) {
      setCustomFormats([...customFormats, { ratio: newRatio.trim(), label: newLabel.trim() }]);
      setNewRatio("");
      setNewLabel("");
      setShowCustomInput(false);
    }
  };

  const removeCustomFormat = (index: number) => {
    setCustomFormats(customFormats.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2.5">
      <Panel letter="A" icon={ImageIcon} title="Campaign Assets" caption="Upload images, videos, carousels and other media for your campaign.">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
          <div className="min-w-0 rounded-lg border border-[#E7EDF5] bg-white p-3">
            <SectionTitle icon={FileText} title="Campaign Content" />
            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_.8fr]">
              <Field label="Campaign Title" required>
                <TextInput value={draft.title} onChange={(v) => set("title", v)} />
              </Field>
              <Field label="Headline" required>
                <TextInput value={draft.headline} onChange={(v) => set("headline", v)} placeholder="Compelling headline" />
              </Field>
              <Field label="Master Caption" required>
                <Textarea value={draft.masterCaption} onChange={(v) => set("masterCaption", v)} rows={4} max={2200} />
              </Field>
              <Field label="Call to Action" required>
                <SelectInput value={draft.cta} onChange={(v) => set("cta", v)} options={["Learn More", "Join Now", "Donate", "Sign Up", "Contact Us", "Get Started"]} />
              </Field>
              <Field label="Hashtags">
                <TagField tags={draft.hashtags} onChange={(v) => set("hashtags", v)} addLabel="Add hashtag" chevron={false} />
              </Field>
              <Field label="Mentions">
                <TagField tags={draft.mentions} onChange={(v) => set("mentions", v)} addLabel="Add mention" chevron={false} />
              </Field>
              <Field label="First Comment" className="lg:col-span-2">
                <Textarea value={draft.firstComment} onChange={(v) => set("firstComment", v)} rows={2} max={300} placeholder="Add first comment with hashtags..." />
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
              <p className="mt-2 text-[10px] leading-4 text-[#687797]">Drag & drop files here or click to browse<br />Supports JPG, PNG, MP4, MOV - Max 500 MB</p>
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
                  </div>
                </div>
              ))}
              <button className="flex min-h-[124px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#BFD4F2] bg-[#F8FBFF] text-[10px] font-semibold text-[#155EEF]">
                <span className="grid size-9 place-items-center rounded-full bg-[#EAF2FF]"><Plus className="size-4" /></span>
                Add More
              </button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel letter="B" icon={Sparkles} title="Master Creative & AI Adaptation" caption="Upload a master creative and let AI automatically adapt it for each platform.">
        <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-[#E7EDF5] bg-white p-3">
            <SectionTitle icon={ImageIcon} title="Master Creative" caption="Upload one master creative to auto-generate platform versions." />
            <div className="mt-3 rounded-lg border border-dashed border-[#BFD4F2] bg-[#F8FBFF] p-6 text-center">
              <button className="mx-auto flex h-8 items-center gap-2 rounded-md bg-[#155EEF] px-4 text-[11px] font-semibold text-white">
                <Upload className="size-3.5" />
                Upload Master Creative
              </button>
              <p className="mt-2 text-[10px] leading-4 text-[#687797]">Recommended: 1920x1080 or higher</p>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-1.5">
              {DEFAULT_FORMATS.map((format) => (
                <div key={format} className="rounded-md border border-[#DDE6F1] bg-[#F8FAFC] p-1.5 text-center">
                  <span className="grid h-8 place-items-center rounded bg-white text-[8px] font-semibold text-[#526385]">{format.split(" ")[0]}</span>
                  <small className="mt-0.5 block text-[7px] text-[#8791A4]">{format.split(" ").slice(1).join(" ")}</small>
                </div>
              ))}
              {customFormats.map((format, idx) => (
                <div key={`custom-${idx}`} className="group relative rounded-md border border-[#C4B5FD] bg-[#F5F3FF] p-1.5 text-center">
                  <button onClick={() => removeCustomFormat(idx)} className="absolute -right-1 -top-1 hidden size-4 place-items-center rounded-full bg-[#E11D28] text-white group-hover:grid">
                    <X className="size-2.5" />
                  </button>
                  <span className="grid h-8 place-items-center rounded bg-[#EDE9FE] text-[8px] font-semibold text-[#7C3AED]">{format.ratio}</span>
                  <small className="mt-0.5 block text-[7px] text-[#7C3AED]">{format.label}</small>
                </div>
              ))}
              {!showCustomInput ? (
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="rounded-md border border-dashed border-[#C4B5FD] bg-[#F5F3FF] p-1.5 text-center transition-colors hover:border-[#7C3AED] hover:bg-[#EDE9FE]"
                >
                  <span className="grid h-8 place-items-center rounded bg-[#EDE9FE] text-[#7C3AED]">
                    <Plus className="size-4" />
                  </span>
                  <small className="mt-0.5 block text-[7px] font-semibold text-[#7C3AED]">Custom</small>
                </button>
              ) : (
                <div className="rounded-md border border-[#7C3AED] bg-[#F5F3FF] p-1.5">
                  <input
                    type="text"
                    value={newRatio}
                    onChange={(e) => setNewRatio(e.target.value)}
                    placeholder="Ratio"
                    className="mb-1 w-full rounded bg-white px-1.5 py-1 text-center text-[8px] font-semibold text-[#526385] outline-none ring-1 ring-[#C4B5FD] placeholder:text-[#9CA3AF]"
                  />
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Label"
                    className="mb-1 w-full rounded bg-white px-1.5 py-1 text-center text-[7px] text-[#8791A4] outline-none ring-1 ring-[#C4B5FD] placeholder:text-[#9CA3AF]"
                  />
                  <div className="flex gap-1">
                    <button onClick={addCustomFormat} className="flex-1 rounded bg-[#7C3AED] py-0.5 text-[7px] font-semibold text-white">Add</button>
                    <button onClick={() => { setShowCustomInput(false); setNewRatio(""); setNewLabel(""); }} className="flex-1 rounded bg-[#E5E7EB] py-0.5 text-[7px] font-semibold text-[#6B7280]">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[#E7EDF5] bg-white p-3">
            <SectionTitle icon={Sparkles} title="AI Adapt Options" caption="Select what AI should generate for each platform." />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {AI_ADAPTATIONS.map(({ label, desc }) => (
                <div key={label} className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-2.5 py-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#EEF2FF] text-[#4F46E5]">
                    <Sparkles className="size-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block text-[10px] font-bold text-[#34415F]">{label}</b>
                    <small className="block text-[8.5px] text-[#8791A4]">{desc}</small>
                  </div>
                  <button className="h-5 w-8 shrink-0 rounded-full bg-[#18B875] p-0.5">
                    <i className="block size-4 translate-x-3 rounded-full bg-white" />
                  </button>
                </div>
              ))}
            </div>
            <button className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#4F46E5] text-[11px] font-semibold text-white">
              <Sparkles className="size-3.5" />
              Generate All Adaptations
            </button>
          </div>
        </div>
      </Panel>

      <Panel letter="C" icon={BarChart3} title="Platform-Specific Content" caption="Customize content for each platform with individual captions, media and settings.">
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
            <SectionTitle icon={FileText} title="Instagram Post Settings" caption="Customize content for Instagram feed posts." />
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
            <Field label="Alt Text">
              <Textarea value="Riverside cleanup drive with volunteers" onChange={() => undefined} rows={4} max={125} />
            </Field>
            <Field label="Location" className="col-span-2">
              <TextInput value="" onChange={() => undefined} placeholder="Add location" />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-[240px_minmax(0,1fr)]">
            <PostPreview />
            <div>
              <b className="mb-2 block text-[11.5px] text-[#132044]">Platform Options</b>
              {["Include Location", "Tag People", "Add Link in Bio Reminder"].map((item) => (
                <div key={item} className="mb-2 flex items-center gap-2">
                  <span className="h-5 w-9 rounded-full bg-[#18B875] p-0.5"><i className="block size-4 translate-x-4 rounded-full bg-white" /></span>
                  <span className="text-[10px] font-semibold text-[#34415F]">{item}</span>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <Field label="CTA Button">
                  <SelectInput value={draft.cta} onChange={(v) => set("cta", v)} options={["Learn More", "Join Now", "Donate"]} />
                </Field>
                <Field label="First Comment">
                  <TextInput value={draft.firstComment} onChange={(v) => set("firstComment", v)} />
                </Field>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-[.9fr_1fr_1fr]">
        <BottomCard icon={CalendarDays} title="Schedule Publishing">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Publish Date"><TextInput icon={CalendarDays} value={draft.publishDate} onChange={(v) => set("publishDate", v)} /></Field>
            <Field label="Publish Time"><TextInput icon={Clock} value={draft.publishTime} onChange={(v) => set("publishTime", v)} /></Field>
            <Field label="Timezone"><SelectInput value={draft.timezone} onChange={(v) => set("timezone", v)} options={["Asia/Kolkata (IST)", "UTC", "US Eastern"]} /></Field>
            <Field label="Recurrence"><SelectInput value={draft.recurrence} onChange={(v) => set("recurrence", v)} options={["One time", "Daily", "Weekly", "Monthly"]} /></Field>
          </div>
          <p className="mt-2 text-[9.5px] text-[#8791A4]">Tip: Use &quot;Best Time&quot; suggestions for optimal engagement.</p>
        </BottomCard>

        <BottomCard icon={Upload} title="Content Timeline" caption="When content publishes across channels.">
          <b className="block text-[10px] text-[#34415F]">{draft.publishDate} - {draft.publishTime}</b>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {Object.entries(draft.platformSchedules).slice(0, 7).map(([platform, sched]) => (
              <span key={platform} className="grid place-items-center rounded-lg bg-[#F8FAFC] px-1 py-1.5">
                <ChannelLogo channel={platform} className="size-4" />
                <small className="mt-1 text-[8px] text-[#155EEF]">{sched.time}</small>
              </span>
            ))}
          </div>
        </BottomCard>

        <BottomCard icon={Link2} title="Content Summary" caption="Content counts by channel.">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Images", count: "4", color: "bg-[#E8F2FF] text-[#1975E7]" },
              { label: "Videos", count: "1", color: "bg-[#F2EAFF] text-[#7C3AED]" },
              { label: "Captions", count: "10", color: "bg-[#E4F8F0] text-[#0AA673]" },
            ].map(({ label, count, color }) => (
              <div key={label} className={cn("rounded-lg p-2 text-center", color)}>
                <b className="block text-[16px] font-black">{count}</b>
                <small className="text-[9px]">{label}</small>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[9.5px] text-[#078359]">
            <Check className="size-3" />
            Content status: <b>{draft.contentStatus}</b>
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
