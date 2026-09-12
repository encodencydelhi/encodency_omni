"use client";

import React, { useMemo, useState } from "react";
import {
  AlarmClock,
  Bookmark,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Download,
  FileText,
  Grid2X2,
  Heart,
  Image as ImageIcon,
  List,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Send,
  Sparkles,
  Tag,
  Users,
  Video,
} from "lucide-react";
import {
  FaFacebookF,
  FaGoogle,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa6";
import { cn } from "@/lib/utils/cn";
import RichTextEditor from "@/components/layout/rich-text-editor";

/* ---------------------------------- types ---------------------------------- */

type Platform =
  | "Instagram"
  | "Facebook"
  | "LinkedIn"
  | "Google Business"
  | "WhatsApp"
  | "YouTube"
  | "Website";

type Tab =
  | "Create"
  | "AI Assistant"
  | "Templates"
  | "Saved Drafts"
  | "Content Ideas"
  | "Approvals";

type PostType = "Image" | "Video" | "Reel" | "Carousel" | "Story" | "Article";

const TABS: Array<{ id: Tab; hint: string }> = [
  { id: "Create", hint: "Compose post" },
  { id: "AI Assistant", hint: "Generate with AI" },
  { id: "Templates", hint: "124 ready designs" },
  { id: "Saved Drafts", hint: "8 drafts" },
  { id: "Content Ideas", hint: "Fresh prompts" },
  { id: "Approvals", hint: "12 pending" },
];

const PLATFORMS: Platform[] = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "Google Business",
  "WhatsApp",
  "YouTube",
  "Website",
];

const platformStyle: Record<Platform, { icon: React.ReactNode; chip: string }> = {
  Instagram: { icon: <FaInstagram />, chip: "bg-pink-50 text-pink-600" },
  Facebook: { icon: <FaFacebookF />, chip: "bg-blue-50 text-[#1877F2]" },
  LinkedIn: { icon: <FaLinkedinIn />, chip: "bg-sky-50 text-[#0A66C2]" },
  "Google Business": { icon: <FaGoogle />, chip: "bg-indigo-50 text-[#4285F4]" },
  WhatsApp: { icon: <FaWhatsapp />, chip: "bg-green-50 text-[#16a34a]" },
  YouTube: { icon: <FaYoutube />, chip: "bg-red-50 text-red-600" },
  Website: { icon: <GlobeIcon />, chip: "bg-slate-100 text-slate-600" },
};

function GlobeIcon() {
  return <span className="text-[13px]">🌐</span>;
}

const IMAGES = [
  "https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=900&q=80",
];

const CAPTION =
  "Small actions create a cleaner tomorrow.\n\nLet's work together for a healthier, greener and cleaner India.\n\n#CleanGanga #HealthyIndia #Sustainability #MokshaSewa";

/* -------------------------------- primitives -------------------------------- */

function Card({ title, subtitle, action, children, className }: {
  title?: string; subtitle?: string; action?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-[#EDF1F5] px-4 py-3">
          <div className="min-w-0">
            {title && <h3 className="truncate text-[13.5px] font-bold text-[#172044]">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[11.5px] text-[#7A87A0]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

function StepTitle({ step, title, hint }: { step: string; title: string; hint?: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="grid size-5 shrink-0 place-items-center rounded-md bg-[#F0F4FF] text-[10px] font-bold text-[#1769DF]">
        {step}
      </span>
      <div className="min-w-0">
        <h4 className="text-[13px] font-bold leading-4 text-[#172044]">{title}</h4>
        {hint && <p className="text-[11px] text-[#7A87A0]">{hint}</p>}
      </div>
    </div>
  );
}

function SelectField({ label, value, required }: { label: string; value: string; required?: boolean }) {
  return (
    <label className="min-w-0 flex-1">
      <span className="mb-1 block text-[11.5px] font-semibold text-[#4B5B76]">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <span className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-[#dce4ef] bg-white px-2.5 text-[12.5px] font-medium text-[#24365A] transition hover:border-[#1769DF]">
        <span className="truncate">{value}</span>
        <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
      </span>
    </label>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cn("relative shrink-0 rounded-full transition", on ? "bg-[#1769DF]" : "bg-[#D5DDE8]")}
      style={{ height: 20, width: 36 }}
    >
      <span
        className="absolute top-[2px] size-[16px] rounded-full bg-white shadow-sm transition-all"
        style={{ [on ? "right" : "left"]: 2 } as React.CSSProperties}
      />
    </button>
  );
}

function PlatformBadge({ platform, size = "md" }: { platform: Platform; size?: "sm" | "md" }) {
  const s = platformStyle[platform];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full", s.chip, size === "sm" ? "size-5.5 text-[11px]" : "size-7 text-[13px]")}>
      {s.icon}
    </span>
  );
}

/* --------------------------------- preview ---------------------------------- */

function PhonePreview({ platform = "Instagram", status = "Scheduled" }: { platform?: Platform; status?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
      <div className="flex items-center justify-between bg-[#f8fafd] px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <PlatformBadge platform={platform} size="sm" />
          <span className="text-[12px] font-bold text-[#16233F]">{platform}</span>
          <span className="rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-semibold text-emerald-700">{status}</span>
        </div>
        <MoreHorizontal className="size-3.5 text-slate-400" />
      </div>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span className="grid size-8 place-items-center rounded-full bg-green-100 text-[14px]">🌿</span>
        <div>
          <p className="text-[12px] font-bold text-[#16233F]">Moksha Sewa</p>
          <p className="text-[10.5px] text-slate-500">Sponsored · Varanasi</p>
        </div>
      </div>
      <div className="relative">
        <img src={IMAGES[0]} alt="Campaign creative" className="aspect-[4/3.4] w-full object-cover" />
        <div className="absolute inset-x-3 bottom-3">
          <p className="max-w-[200px] text-[22px] font-black leading-[1.02] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            CLEAN RIVERS
            <br />
            BRIGHTER TOMORROW
          </p>
        </div>
      </div>
      <div className="px-2.5 py-2.5">
        <div className="flex items-center justify-between text-[#1d2f50]">
          <div className="flex items-center gap-3.5">
            <Heart className="size-4.5 fill-red-500 text-red-500" />
            <MessageCircle className="size-4.5" />
            <Send className="size-4.5" />
          </div>
          <Bookmark className="size-4.5" />
        </div>
        <p className="mt-1.5 text-[12px] font-bold text-[#16233F]">1,246 likes</p>
        <p className="mt-0.5 text-[12px] leading-4.5 text-slate-600">
          <b className="text-[#16233F]">Moksha Sewa</b> Small actions create a cleaner tomorrow…{" "}
          <span className="text-slate-400">more</span>
        </p>
        <p className="mt-0.5 text-[12px] font-medium text-[#1769DF]">#CleanGanga #HealthyIndia #Sustainability</p>
      </div>
    </div>
  );
}

function Checklist() {
  const items: Array<[string, boolean]> = [
    ["Project & campaign selected", true],
    ["Post type selected", true],
    ["Caption written", true],
    ["Media attached (3 images)", true],
    ["Channels selected (3)", true],
    ["Hashtags added", false],
    ["Schedule / publish set", false],
  ];
  const done = items.filter(([, d]) => d).length;
  return (
    <Card title="Publishing checklist" subtitle={`${done} of ${items.length} complete`}>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map(([text, ok]) => (
          <li key={text} className="flex items-center gap-2">
            <span className={cn("grid size-4 shrink-0 place-items-center rounded-full", ok ? "bg-emerald-100 text-emerald-700" : "border border-slate-300 text-transparent")}>
              <Check className="size-2.5" />
            </span>
            <span className={cn("text-[12px]", ok ? "font-medium text-[#33445F]" : "text-slate-400")}>{text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------- create tab --------------------------------- */

const POST_TYPES: Array<{ id: PostType; desc: string; icon: React.ReactNode }> = [
  { id: "Image", desc: "Single photo", icon: <ImageIcon className="size-3.5" /> },
  { id: "Video", desc: "Standard video", icon: <Video className="size-3.5" /> },
  { id: "Reel", desc: "Vertical short", icon: <Play className="size-3.5" /> },
  { id: "Carousel", desc: "Multi image", icon: <Grid2X2 className="size-3.5" /> },
  { id: "Story", desc: "24h visible", icon: <Camera className="size-3.5" /> },
  { id: "Article", desc: "Link + preview", icon: <FileText className="size-3.5" /> },
];

function CreateTab({ postType, setPostType }: { postType: PostType; setPostType: (t: PostType) => void }) {
  const [caption, setCaption] = useState(CAPTION);
  const [subTab, setSubTab] = useState("Caption");
  const [channels, setChannels] = useState<Platform[]>(["Instagram", "Facebook", "LinkedIn"]);
  const [schedule, setSchedule] = useState("Schedule for later");

  const toggleChannel = (p: Platform) =>
    setChannels((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_310px_330px]">
      {/* Editor */}
      <Card title="Compose post" subtitle="Write once — preview adapts per channel">
        <StepTitle step="1" title="Post type" hint="Choose the format for this creative" />
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {POST_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setPostType(t.id)}
              className={cn(
                "rounded-lg border p-2 text-center transition",
                postType === t.id
                  ? "border-[#1769DF] bg-[#F0F6FF] shadow-sm shadow-blue-100"
                  : "border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-slate-50",
              )}
            >
              <span className={cn("mx-auto mb-1 grid size-7 place-items-center rounded-lg", postType === t.id ? "bg-[#1769DF] text-white" : "bg-[#F1F5F9] text-[#64748B]")}>
                {t.icon}
              </span>
              <span className="block text-[11px] font-bold text-[#24365A]">{t.id}</span>
              <span className="block truncate text-[10px] text-slate-500">{t.desc}</span>
            </button>
          ))}
        </div>

        <div className="mt-3">
          <StepTitle step="2" title="Project & campaign" />
          <div className="flex flex-col gap-1.5 sm:flex-row">
            <SelectField label="Project" value="🌿 Moksha Sewa" required />
            <SelectField label="Campaign (optional)" value="Clean Ganga Awareness" />
          </div>
        </div>

        <div className="mt-3">
          <StepTitle step="3" title="Caption & hashtags" hint="Instagram allows up to 2,200 characters" />
          <div className="mb-1.5 flex flex-wrap gap-1">
            {["Caption", "Hashtags", "Variations", "First comment", "AI improve"].map((t) => (
              <button
                key={t}
                onClick={() => setSubTab(t)}
                className={cn(
                  "h-7 rounded-md border px-2.5 text-[11px] font-semibold transition",
                  subTab === t ? "border-red-200 bg-red-50 text-red-600" : "border-[#e5ecf4] text-slate-500 hover:bg-slate-50",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {subTab === "Caption" && (
            <div>
              <RichTextEditor
                value={caption}
                onChange={(val) => setCaption(val)}
                placeholder="Write your caption here..."
                minHeight="100px"
              />
              <div className="flex items-center justify-between border-t border-slate-100 bg-[#f8fafc] px-2.5 py-1.5 text-[11px] text-slate-500 rounded-b-lg">
                <span>{caption.replace(/<[^>]*>/g, "").length} / 2,200</span>
                <span className="flex items-center gap-1">
                  <button className="flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold text-[#1769DF] hover:bg-blue-50"><Sparkles className="size-3" /> AI improve</button>
                  <button className="rounded px-1.5 py-0.5 font-semibold hover:bg-slate-100">Shorten</button>
                  <button className="rounded px-1.5 py-0.5 font-semibold hover:bg-slate-100">Add CTA</button>
                </span>
              </div>
            </div>
          )}

          {subTab === "Hashtags" && (
            <div className="rounded-lg border border-[#e5ecf4] bg-[#f8fafc] p-2.5">
              <div className="flex flex-wrap gap-1">
                {["#CleanGanga", "#HealthyIndia", "#Sustainability", "#MokshaSewa", "#SaveWater", "#CleanIndia"].map((h) => (
                  <span key={h} className="rounded-full bg-[#F0F6FF] px-2.5 py-1 text-[11.5px] font-semibold text-[#1769DF]">{h}</span>
                ))}
              </div>
              <button className="mt-2 flex items-center gap-1 text-[11.5px] font-bold text-[#1769DF]"><Sparkles className="size-3" /> Generate more</button>
            </div>
          )}

          {subTab === "Variations" && (
            <div className="space-y-1.5">
              {[
                "Small actions create a cleaner tomorrow. Together, we can protect every river.",
                "Cleaner rivers begin with everyday choices. Let's make a difference together.",
                "A healthier India starts with cleaner water. Join the movement today.",
              ].map((v, i) => (
                <div key={v} className="flex items-start justify-between gap-2 rounded-lg border border-[#e5ecf4] p-2.5">
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#1769DF]">Variation {i + 1}</p>
                    <p className="mt-0.5 text-[12px] leading-4.5 text-slate-600">{v}</p>
                  </div>
                  <button className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"><Copy className="size-3" /> Copy</button>
                </div>
              ))}
            </div>
          )}

          {(subTab === "First comment" || subTab === "AI improve") && (
            <div className="rounded-lg border border-[#e5ecf4] p-2.5 text-[12px] leading-4.5 text-slate-600">
              {subTab === "First comment"
                ? "What small action will you take today? Tell us below 💚 #CleanGanga"
                : "AI suggestion: shorten the hook to one line, add a clear CTA (“Join Saturday's drive”), and keep 3–5 high-intent hashtags."}
            </div>
          )}
        </div>

        <div className="mt-3">
          <StepTitle step="4" title="Media" hint="JPG, PNG, MP4 up to 100MB" />
          <div className="rounded-lg border-2 border-dashed border-[#b9cff2] bg-[#f7faff] p-4 text-center transition hover:border-[#1769DF] hover:bg-[#f0f6ff]">
            <p className="text-[12.5px] font-bold text-[#24365A]">Drag & drop files here, or browse</p>
            <button className="mt-2 h-8 rounded-lg bg-[#1769DF] px-4 text-[12px] font-bold text-white shadow-sm hover:bg-[#1259bd]">Upload from device</button>
            <p className="mt-1.5 text-[11px] text-slate-500">1080 × 1350 (4:5) recommended · 3 files selected</p>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {IMAGES.slice(0, 3).map((src, i) => (
              <div key={src} className="relative overflow-hidden rounded-lg border border-[#e2e8f0]">
                <img src={src} alt="" className="h-20 w-full object-cover" />
                <span className="absolute left-1.5 top-1.5 grid size-4 place-items-center rounded bg-[#16233F]/80 text-[9px] font-bold text-white">{i + 1}</span>
              </div>
            ))}
            <button className="grid h-20 place-items-center rounded-lg border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50">
              <span><Plus className="mx-auto size-4" /><span className="mt-0.5 block text-[10.5px] font-semibold">Add more</span></span>
            </button>
          </div>
        </div>
      </Card>

      {/* Settings */}
      <Card title="Channels & schedule" subtitle="Where and when this goes live">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Publish to</p>
        <div className="space-y-0.5">
          {PLATFORMS.map((p) => {
            const on = channels.includes(p);
            return (
              <button
                key={p}
                onClick={() => toggleChannel(p)}
                className={cn("flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition", on ? "border-blue-200 bg-[#f2f7ff]" : "border-transparent hover:bg-slate-50")}
              >
                <span className={cn("grid shrink-0 place-items-center rounded border", on ? "border-[#1769DF] bg-[#1769DF] text-white" : "border-slate-300 text-transparent")} style={{ width: 16, height: 16 }}>
                  <Check className="size-2.5" />
                </span>
                <PlatformBadge platform={p} size="sm" />
                <span className="flex-1 text-[12px] font-semibold text-[#33445F]">{p}</span>
                {on && <span className="text-[10.5px] font-bold text-emerald-600">Ready</span>}
              </button>
            );
          })}
        </div>

        <div className="my-2.5 h-px bg-slate-100" />

        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Schedule</p>
        <div className="space-y-1">
          {["Publish now", "Schedule for later", "Save as draft"].map((s) => (
            <label key={s} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px] font-medium transition", schedule === s ? "border-[#1769DF] bg-[#f2f7ff] text-[#16233F]" : "border-[#e5ecf4] text-slate-600 hover:bg-slate-50")}>
              <input type="radio" name="schedule" checked={schedule === s} onChange={() => setSchedule(s)} className="accent-[#1769DF]" />
              {s}
            </label>
          ))}
        </div>

        {schedule === "Schedule for later" && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <SelectField label="Date" value="Sep 14, 2026" />
            <SelectField label="Time" value="11:00 AM" />
          </div>
        )}

        <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 ring-1 ring-amber-100">
          <Clock3 className="mt-px size-3.5 shrink-0 text-amber-600" />
          <p className="text-[11.5px] leading-4.5 text-amber-900"><b>Best time:</b> Today, 11 AM – 1 PM.</p>
        </div>

        <div className="mt-2.5 space-y-2">
          {[
            { icon: <MapPin className="size-3.5" />, label: "Add location", value: "Varanasi, UP", on: true },
            { icon: <Users className="size-3.5" />, label: "Tag collaborators", value: "2 people", on: true },
            { icon: <Tag className="size-3.5" />, label: "Branded content", value: "Off", on: false },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="text-slate-400">{row.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#33445F]">{row.label}</p>
                <p className="text-[11px] text-slate-500">{row.value}</p>
              </div>
              <Toggle label={row.label} on={row.on} onChange={() => {}} />
            </div>
          ))}
        </div>
      </Card>

      {/* Preview */}
      <div className="space-y-2.5 lg:sticky lg:top-4">
        <Card
          title="Live preview"
          action={<span className="rounded-full bg-slate-100 px-2 py-px text-[10.5px] font-bold text-slate-600">{channels[0] ?? "Instagram"}</span>}
        >
          <PhonePreview platform={(channels[0] as Platform) ?? "Instagram"} />
          <div className="mt-2 flex gap-1.5">
            <button className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border text-[11.5px] font-bold text-slate-600 hover:bg-slate-50"><Download className="size-3.5" /> Export</button>
            <button className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-[#16233F] text-[11.5px] font-bold text-white hover:bg-[#0f1830]"><Pencil className="size-3.5" /> Open editor</button>
          </div>
        </Card>
        <Checklist />
      </div>
    </div>
  );
}

/* ------------------------------ AI assistant -------------------------------- */

function AIAssistantTab() {
  const [prompt, setPrompt] = useState("Create an Instagram post about Clean Ganga awareness with a motivating, eco-friendly tone.");
  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
      <Card title="Describe your idea" subtitle="AI drafts caption, hashtags and creative">
        <label className="mb-1 block text-[12px] font-bold text-[#33445F]">Topic / prompt *</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="w-full resize-none rounded-lg border border-[#dce4ef] p-2.5 text-[12.5px] leading-5 outline-none focus:border-[#7C3AED]" />
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <SelectField label="Audience" value="General public" />
          <SelectField label="Tone" value="Positive" />
          <SelectField label="Language" value="English" />
        </div>
        <p className="mb-1.5 mt-3 text-[12px] font-bold text-[#33445F]">Image style</p>
        <div className="grid grid-cols-3 gap-1.5">
          {IMAGES.slice(0, 6).map((src, i) => (
            <button key={src + i} className={cn("overflow-hidden rounded-lg border text-left", i === 0 ? "border-[#7C3AED] ring-2 ring-violet-100" : "border-[#e5ecf4]")}>
              <img src={src} alt="" className="h-14 w-full object-cover" />
              <span className="block px-2 py-1 text-[10.5px] font-semibold text-slate-600">{["Realistic", "Nature", "Minimal", "Documentary", "Community", "River"][i]}</span>
            </button>
          ))}
        </div>
        <button className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#7C3AED] text-[13px] font-bold text-white shadow-sm shadow-purple-200 transition hover:bg-[#6D28D9]">
          <Sparkles className="size-4" /> Generate content
        </button>
      </Card>

      <Card
        title="AI result"
        subtitle="Review, then send to editor"
        action={<button className="text-[11.5px] font-bold text-[#1769DF]">Regenerate</button>}
      >
        <div className="rounded-lg border border-[#e2e8f0] p-2.5 text-[12.5px] leading-5 text-slate-700">
          Small actions create a cleaner tomorrow.
          <br /><br />
          Let&apos;s work together for a healthier, greener and cleaner India. 💙🌱
          <br /><br />
          <span className="font-semibold text-[#1769DF]">#CleanGanga #HealthyIndia #Sustainability #MokshaSewa</span>
        </div>
        <img src={IMAGES[4]} alt="" className="mt-2 aspect-video w-full rounded-lg object-cover" />
        <div className="mt-2 flex gap-1.5">
          <button className="h-8 flex-1 rounded-lg border text-[12px] font-bold text-slate-600">Save draft</button>
          <button className="h-8 flex-1 rounded-lg bg-[#1769DF] text-[12px] font-bold text-white">Use this post</button>
        </div>
      </Card>

      <div className="space-y-2.5 lg:sticky lg:top-4">
        <Card title="Live preview"><PhonePreview /></Card>
        <Card title="Quick refinements">
          <div className="grid grid-cols-2 gap-1">
            {["Make shorter", "Add CTA", "Change tone", "More hashtags", "Hindi version", "Add emojis"].map((x) => (
              <button key={x} className="rounded-lg border border-[#e5ecf4] px-2 py-1.5 text-left text-[11.5px] font-semibold text-slate-600 hover:border-violet-200 hover:bg-violet-50/50">✨ {x}</button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------- templates --------------------------------- */

const TEMPLATES = [
  { title: "Clean Ganga Campaign", cat: "Social Awareness", img: IMAGES[0], pro: true },
  { title: "Motivational Quote", cat: "Quotes", img: IMAGES[1], pro: false },
  { title: "Environment Day", cat: "Festival & Events", img: IMAGES[3], pro: true },
  { title: "Impact Story", cat: "Behind the Scenes", img: IMAGES[2], pro: false },
  { title: "Campaign Launch", cat: "Announcements", img: IMAGES[4], pro: false },
  { title: "Eco Tips Carousel", cat: "Education", img: IMAGES[5], pro: false },
  { title: "Volunteer Call", cat: "Recruitment", img: IMAGES[4], pro: true },
  { title: "Festival Greeting", cat: "Greetings", img: IMAGES[1], pro: false },
];

const CATEGORIES = ["All Templates", "Festival & Events", "Social Awareness", "Quotes", "Announcements", "Education", "Recruitment"];

function TemplatesTab() {
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [selected, setSelected] = useState(0);
  const active = TEMPLATES[selected]!;
  return (
    <div className="grid items-start gap-3 xl:grid-cols-[200px_minmax(0,1fr)_320px]">
      <Card className="[&>div]:p-2" title="Categories">
        <div className="space-y-px">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cn("flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold transition", cat === c ? "bg-[#F0F6FF] text-[#1769DF]" : "text-slate-600 hover:bg-slate-50")}>
              {c}
            </button>
          ))}
        </div>
      </Card>

      <Card
        title={`All templates · ${TEMPLATES.length}`}
        subtitle="Click a design to preview it"
        action={
          <label className="flex h-9 w-52 items-center gap-2 rounded-lg border border-[#dce4ef] px-2.5 text-[12px] text-slate-500">
            <Search className="size-3.5" />
            <input placeholder="Search templates…" className="w-full bg-transparent outline-none placeholder:text-slate-400" />
          </label>
        }
      >
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-4">
          {TEMPLATES.map((t, i) => (
            <button key={t.title} onClick={() => setSelected(i)} className={cn("overflow-hidden rounded-lg border bg-white text-left transition", selected === i ? "border-[#1769DF] shadow-md ring-1 ring-blue-100" : "border-[#e2e8f0] hover:shadow-md")}>
              <div className="relative">
                <img src={t.img} alt={t.title} className="aspect-[4/3] w-full object-cover" />
                {t.pro && <span className="absolute right-1.5 top-1.5 rounded bg-amber-400 px-1.5 py-px text-[9px] font-black text-amber-950">PRO</span>}
              </div>
              <div className="p-2">
                <p className="truncate text-[12px] font-bold text-[#24365A]">{t.title}</p>
                <p className="text-[11px] text-slate-500">{t.cat}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Template preview" className="lg:sticky lg:top-4">
        <img src={active.img} alt="" className="aspect-[4/4.4] w-full rounded-lg object-cover" />
        <p className="mt-2 text-[14px] font-bold text-[#16233F]">{active.title}</p>
        <p className="mt-0.5 text-[12px] leading-4.5 text-slate-500">Clean, impactful layout for awareness and community campaigns. Fully editable.</p>
        <button className="mt-2 h-10 w-full rounded-lg bg-[#EB0711] text-[13px] font-bold text-white shadow-sm shadow-red-200 transition hover:bg-[#D60811]">Use this template</button>
        <button className="mt-1.5 h-9 w-full rounded-lg border text-[12px] font-bold text-slate-600 hover:bg-slate-50">Customize in editor</button>
        <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 text-[11.5px]">
          {[["Platform", "Instagram"], ["Size", "1080 × 1350 (4:5)"], ["Type", "Image · JPG / PNG"], ["Text", "Fully editable"]].map(([k, v]) => (
            <div key={k} className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-[#33445F]">{v}</dd></div>
          ))}
        </dl>
      </Card>
    </div>
  );
}

/* --------------------------------- drafts ----------------------------------- */

const DRAFTS = [
  { title: "Cleaner Rivers, Brighter Tomorrow", channel: "Instagram" as Platform, campaign: "Clean Ganga Awareness", date: "Sep 4, 2026 · 02:14 PM", img: IMAGES[0] },
  { title: "Volunteer Stories — Behind the Scenes", channel: "Facebook" as Platform, campaign: "Volunteer Stories", date: "Sep 3, 2026 · 05:40 PM", img: IMAGES[2] },
  { title: "World Environment Day Pledge", channel: "LinkedIn" as Platform, campaign: "Environment Day", date: "Sep 1, 2026 · 10:00 AM", img: IMAGES[3] },
  { title: "Tips for a Cleaner India", channel: "WhatsApp" as Platform, campaign: "Educational Series", date: "Aug 28, 2026 · 12:30 PM", img: IMAGES[5] },
  { title: "This or That — Engagement Poll", channel: "Instagram" as Platform, campaign: "Engagement", date: "Aug 26, 2026 · 04:15 PM", img: IMAGES[1] },
];

function DraftsTab() {
  const [view, setView] = useState<"list" | "grid">("list");
  const [query, setQuery] = useState("");
  const rows = DRAFTS.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card
        title={`Saved drafts · ${rows.length}`}
        subtitle="Continue where you left off"
        action={
          <div className="flex items-center gap-1.5">
            <label className="hidden h-9 w-52 items-center gap-2 rounded-lg border border-[#dce4ef] px-2.5 text-[12px] text-slate-500 md:flex">
              <Search className="size-3.5" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search drafts…" className="w-full bg-transparent outline-none" />
            </label>
            <div className="flex rounded-lg border border-[#dce4ef] p-0.5">
              <button onClick={() => setView("list")} className={cn("rounded p-1.5", view === "list" ? "bg-[#F0F6FF] text-[#1769DF]" : "text-slate-400")} aria-label="List view"><List className="size-3.5" /></button>
              <button onClick={() => setView("grid")} className={cn("rounded p-1.5", view === "grid" ? "bg-[#F0F6FF] text-[#1769DF]" : "text-slate-400")} aria-label="Grid view"><Grid2X2 className="size-3.5" /></button>
            </div>
          </div>
        }
      >
        {view === "list" ? (
          <div className="divide-y divide-slate-100">
            {rows.map((d) => (
              <div key={d.title} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <img src={d.img} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-[#24365A]">{d.title}</p>
                  <p className="mt-px flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-slate-500">
                    <span className="inline-flex items-center gap-1 font-semibold"><PlatformBadge platform={d.channel} size="sm" />{d.channel}</span>
                    <span>·</span><span className="truncate">{d.campaign}</span>
                  </p>
                  <p className="mt-px text-[11px] text-slate-400">{d.date}</p>
                </div>
                <span className="hidden rounded-full bg-slate-100 px-2 py-px text-[10.5px] font-bold text-slate-600 sm:block">Draft</span>
                <div className="flex shrink-0 gap-0.5">
                  <button className="rounded-md p-1.5 text-[#1769DF] hover:bg-blue-50" aria-label="Edit"><Pencil className="size-3.5" /></button>
                  <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Duplicate"><Copy className="size-3.5" /></button>
                  <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="More"><MoreHorizontal className="size-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {rows.map((d) => (
              <div key={d.title} className="overflow-hidden rounded-lg border border-[#e2e8f0]">
                <img src={d.img} alt="" className="aspect-video w-full object-cover" />
                <div className="p-2">
                  <p className="truncate text-[12.5px] font-bold text-[#24365A]">{d.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{d.channel} · {d.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-2.5 lg:sticky lg:top-4">
        <Card title="Draft preview"><PhonePreview status="Draft" /></Card>
        <Card title="Draft details">
          <dl className="space-y-2 text-[12px]">
            {[["Project", "Moksha Sewa"], ["Campaign", "Clean Ganga Awareness"], ["Media", "3 images · 1080 × 1350"], ["Last edited", "Sep 4, 2026"], ["Created by", "Manish Sirohi"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold text-[#33445F]">{v}</dd></div>
            ))}
          </dl>
          <button className="mt-3 h-9 w-full rounded-lg bg-[#16233F] text-[12.5px] font-bold text-white">Continue editing</button>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------ ideas + approvals ---------------------------- */

const IDEAS = [
  { title: "Clean Ganga Campaign", desc: "Spread awareness about keeping rivers clean.", img: IMAGES[0], tag: "Environment" },
  { title: "Tips for a Cleaner India", desc: "Everyday actions that make a big difference.", img: IMAGES[3], tag: "Tips" },
  { title: "Volunteer Stories", desc: "Real people making a real difference.", img: IMAGES[4], tag: "Community" },
  { title: "Save Water Awareness", desc: "Every drop counts. Conserve water.", img: IMAGES[5], tag: "Awareness" },
  { title: "Festival Greetings", desc: "Warm wishes with a green message.", img: IMAGES[1], tag: "Festival" },
  { title: "River Cleanup Drive", desc: "Join Saturday's community cleanup.", img: IMAGES[2], tag: "Event" },
];

function IdeasTab() {
  const [selected, setSelected] = useState(0);
  const active = IDEAS[selected]!;
  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card
        title="Content ideas"
        subtitle="Curated prompts for your next post"
        action={<button className="flex h-9 items-center gap-1.5 rounded-lg bg-violet-50 px-3 text-[12px] font-bold text-violet-700 ring-1 ring-violet-100 hover:bg-violet-100"><Sparkles className="size-3.5" /> Generate with AI</button>}
      >
        <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {IDEAS.map((idea, i) => (
            <button key={idea.title} onClick={() => setSelected(i)} className={cn("overflow-hidden rounded-lg border text-left transition", selected === i ? "border-[#1769DF] shadow-md ring-1 ring-blue-100" : "border-[#e2e8f0] hover:shadow-md")}>
              <img src={idea.img} alt="" className="aspect-[16/9] w-full object-cover" />
              <div className="p-2.5">
                <span className="rounded bg-blue-50 px-1.5 py-px text-[10px] font-bold text-[#1769DF]">#{idea.tag}</span>
                <p className="mt-1 text-[12.5px] font-bold text-[#24365A]">{idea.title}</p>
                <p className="mt-px line-clamp-2 text-[11.5px] leading-4 text-slate-500">{idea.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Idea details" className="lg:sticky lg:top-4">
        <img src={active.img} alt="" className="aspect-video w-full rounded-lg object-cover" />
        <p className="mt-2 text-[14px] font-bold text-[#16233F]">{active.title}</p>
        <p className="mt-0.5 text-[12px] leading-4.5 text-slate-500">{active.desc} Suggested for Instagram, Facebook and LinkedIn · best posted 9–11 AM.</p>
        <button className="mt-2 h-10 w-full rounded-lg bg-[#EB0711] text-[13px] font-bold text-white transition hover:bg-[#D60811]">Use this idea</button>
        <button className="mt-1.5 h-9 w-full rounded-lg border text-[12px] font-bold text-slate-600 hover:bg-slate-50">Customize with AI</button>
      </Card>
    </div>
  );
}

const APPROVALS = [
  { title: "Cleaner Rivers, Brighter Tomorrow", channel: "Instagram" as Platform, by: "Manish Sirohi", date: "Sep 4, 2026", status: "Pending", img: IMAGES[0] },
  { title: "Behind the Scenes", channel: "Facebook" as Platform, by: "Prateeksha", date: "Sep 3, 2026", status: "Approved", img: IMAGES[2] },
  { title: "Small Actions, Big Change", channel: "LinkedIn" as Platform, by: "Ankit Kumar", date: "Sep 2, 2026", status: "Changes requested", img: IMAGES[5] },
  { title: "World Environment Day", channel: "YouTube" as Platform, by: "Ritu Pandey", date: "Aug 30, 2026", status: "Pending", img: IMAGES[3] },
  { title: "Tips for a Cleaner India", channel: "WhatsApp" as Platform, by: "Neha Sharma", date: "Aug 29, 2026", status: "Approved", img: IMAGES[5] },
];

function ApprovalsTab() {
  const [filter, setFilter] = useState("All");
  const rows = APPROVALS.filter((a) => filter === "All" || a.status === filter);
  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { n: "12", label: "Pending review", icon: <AlarmClock className="size-4" />, tone: "bg-amber-50 text-amber-600" },
            { n: "8", label: "Approved", icon: <Check className="size-4" />, tone: "bg-emerald-50 text-emerald-600" },
            { n: "3", label: "Changes requested", icon: <FileText className="size-4" />, tone: "bg-red-50 text-red-600" },
            { n: "5", label: "Scheduled", icon: <CalendarDays className="size-4" />, tone: "bg-blue-50 text-[#1769DF]" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 rounded-xl border border-[#dfe6f0] bg-white p-3 shadow-sm">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", s.tone)}>{s.icon}</span>
              <div><p className="text-[18px] font-black leading-4 text-[#16233F]">{s.n}</p><p className="mt-px text-[11px] font-medium text-slate-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        <Card
          title="Review queue"
          action={
            <div className="flex gap-1">
              {["All", "Pending", "Approved", "Changes requested"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn("h-7 rounded-md border px-2.5 text-[11px] font-bold", filter === f ? "border-[#1769DF] bg-[#F0F6FF] text-[#1769DF]" : "border-[#e5ecf4] text-slate-500")}>{f}</button>
              ))}
            </div>
          }
        >
          <div className="divide-y divide-slate-100">
            {rows.map((a) => (
              <div key={a.title} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <img src={a.img} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-[#24365A]">{a.title}</p>
                  <p className="mt-px text-[11.5px] text-slate-500">{a.channel} · by {a.by} · {a.date}</p>
                </div>
                <span className={cn(
                  "hidden rounded-full px-2 py-px text-[10.5px] font-bold sm:block",
                  a.status === "Approved" && "bg-emerald-50 text-emerald-700",
                  a.status === "Pending" && "bg-amber-50 text-amber-700",
                  a.status === "Changes requested" && "bg-red-50 text-red-600",
                )}>
                  {a.status}
                </span>
                <button className="rounded-md border border-[#e2e8f0] px-2.5 py-1 text-[11.5px] font-bold text-[#1769DF] hover:bg-blue-50">Review</button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-2.5 lg:sticky lg:top-4">
        <Card title="Selected post"><PhonePreview /></Card>
        <Card title="Approval actions">
          <div className="space-y-2 border-l-2 border-slate-200 pl-3.5">
            {[["Draft created", "by Manish Sirohi · Sep 4", true], ["Pending review", "Content team · waiting", true], ["Approve & schedule", "Next step", false]].map(([t, s, done]) => (
              <div key={t as string} className="relative">
                <span className={cn("absolute -left-[23px] top-0.5 grid size-3.5 place-items-center rounded-full", done ? "bg-emerald-500 text-white" : "bg-white ring-2 ring-slate-200")}>
                  {done ? <Check className="size-2" /> : null}
                </span>
                <p className="text-[12.5px] font-bold text-[#33445F]">{t as string}</p>
                <p className="text-[11px] text-slate-500">{s as string}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-1.5">
            <button className="h-9 flex-1 rounded-lg bg-emerald-600 text-[12.5px] font-bold text-white hover:bg-emerald-700">Approve</button>
            <button className="h-9 flex-1 rounded-lg border border-red-200 text-[12.5px] font-bold text-red-600 hover:bg-red-50">Request changes</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------- shell ----------------------------------- */

export default function ContentStudio() {
  const [activeTab, setActiveTab] = useState<Tab>("Create");
  const [postType, setPostType] = useState<PostType>("Image");

  const content = useMemo(() => {
    switch (activeTab) {
      case "Create": return <CreateTab postType={postType} setPostType={setPostType} />;
      case "AI Assistant": return <AIAssistantTab />;
      case "Templates": return <TemplatesTab />;
      case "Saved Drafts": return <DraftsTab />;
      case "Content Ideas": return <IdeasTab />;
      case "Approvals": return <ApprovalsTab />;
    }
  }, [activeTab, postType]);

  return (
    <div className="w-full min-w-0 space-y-3 text-[#243758]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[#111B43]">Content Studio</h1>
          <p className="mt-0.5 text-[11.5px] text-[#687797]">Create, customize and publish content across all your channels.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-9 items-center gap-1.5 rounded-lg border border-[#D7E0EB] bg-white px-3.5 text-[12.5px] font-semibold text-[#33445F] shadow-[0_1px_3px_rgb(31_50_81/0.06)] transition hover:bg-[#F8FAFD]">
            <Bookmark className="size-3.5 text-[#71809D]" /> Save draft
          </button>
          <button className="flex h-9 items-center gap-1.5 rounded-lg bg-[#EB0711] px-4 text-[12.5px] font-semibold text-white shadow-[0_1px_3px_rgb(235_7_17/0.25)] transition hover:bg-[#D60811]">
            <Send className="size-3.5" /> Publish <ChevronDown className="size-3.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0]">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "relative whitespace-nowrap pb-3 text-[13px] font-semibold transition",
                activeTab === t.id
                  ? "text-[#EB0711]"
                  : "text-[#687797] hover:text-[#33445F]",
              )}
            >
              {t.id}
              {activeTab === t.id && (
                <span className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-t-full bg-[#EB0711]" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {content}
    </div>
  );
}
