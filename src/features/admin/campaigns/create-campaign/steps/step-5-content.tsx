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
  Send,
  Users,
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import type { CampaignDraft } from "../draft";
import { ChannelLogo } from "../../../shared/channel-logo";
import { Field, SelectInput, TagField, Textarea, TextInput, control } from "../ui";
import { SpellCheckedInput } from "@/components/ui/spellchecked-input";
import { cn } from "@/lib/utils/cn";
import {
  whatsappApi,
  type WhatsAppTemplate,
  type WhatsAppContactItem,
} from "../../../channels/live/whatsapp-api";

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

export function StepContent({
  draft,
  set,
  companyId,
  effectiveClientId,
}: {
  draft: CampaignDraft;
  set: Setter;
  companyId?: string;
  effectiveClientId?: string;
}) {
  const [customFormats, setCustomFormats] = React.useState<{ ratio: string; label: string }[]>([]);
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [newRatio, setNewRatio] = React.useState("");
  const [newLabel, setNewLabel] = React.useState("");
  const [activePlatformTab, setActivePlatformTab] = React.useState<string>(draft.activePlatform || "Instagram Post");

  // WhatsApp templates and contacts loading for active client
  const [templates, setTemplates] = React.useState<WhatsAppTemplate[]>([]);
  const [contacts, setContacts] = React.useState<WhatsAppContactItem[]>([]);
  const [loadingWhatsApp, setLoadingWhatsApp] = React.useState(false);
  const [waError, setWaError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!companyId || !effectiveClientId) return;
    let active = true;
    setLoadingWhatsApp(true);
    setWaError(null);

    Promise.all([
      whatsappApi.listTemplates(companyId, effectiveClientId).catch((err) => {
        console.warn("Failed to load WhatsApp templates:", err);
        return { items: [] };
      }),
      whatsappApi.getContacts(companyId, effectiveClientId).catch((err) => {
        console.warn("Failed to load WhatsApp contacts:", err);
        return { items: [], growthTimeline: [] };
      }),
    ])
      .then(([tmplRes, contactsRes]) => {
        if (!active) return;
        const tmpls = tmplRes?.items ?? [];
        setTemplates(tmpls);
        setContacts(contactsRes?.items ?? []);
        const firstTmpl = tmpls[0];
        if (!draft.whatsappTemplateId && firstTmpl) {
          set("whatsappTemplateId", firstTmpl.id);
        }
      })
      .catch((err) => {
        if (active) setWaError(err.message || "Failed to load WhatsApp data");
      })
      .finally(() => {
        if (active) setLoadingWhatsApp(false);
      });

    return () => {
      active = false;
    };
  }, [companyId, effectiveClientId]);

  const selectedTemplate = React.useMemo(() => {
    if (!draft.whatsappTemplateId) return templates[0] || null;
    return templates.find((t) => t.id === draft.whatsappTemplateId) || templates[0] || null;
  }, [templates, draft.whatsappTemplateId]);

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

  const handleTabChange = (tabId: string) => {
    setActivePlatformTab(tabId);
    set("activePlatform", tabId);
  };

  const handleTemplateSelect = (id: string) => {
    set("whatsappTemplateId", id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl && tmpl.variables.length > 0) {
      const vars = { ...(draft.whatsappVariables || {}) };
      for (const v of tmpl.variables) {
        if (!vars[v]) {
          vars[v] = v.toLowerCase().includes("name") ? draft.client || "Customer" : "";
        }
      }
      set("whatsappVariables", vars);
    }
  };

  const handleVariableChange = (varKey: string, val: string) => {
    const existing = draft.whatsappVariables || {};
    set("whatsappVariables", { ...existing, [varKey]: val });
  };

  const handleManualPhonesChange = (text: string) => {
    set("whatsappManualRecipients", text);
    const parsed = text.split(/[\n,]+/).map((p) => p.trim()).filter(Boolean);
    const contactPhones = draft.whatsappIncludeAllContacts ? contacts.map((c) => c.phone).filter(Boolean) : [];
    set("whatsappRecipients", [...new Set([...parsed, ...contactPhones])]);
  };

  const handleToggleIncludeAllContacts = (include: boolean) => {
    set("whatsappIncludeAllContacts", include);
    const manual = (draft.whatsappManualRecipients || "").split(/[\n,]+/).map((p) => p.trim()).filter(Boolean);
    const contactPhones = include ? contacts.map((c) => c.phone).filter(Boolean) : [];
    set("whatsappRecipients", [...new Set([...manual, ...contactPhones])]);
  };

  // Preview body with interpolated variables
  const renderedWhatsAppBody = React.useMemo(() => {
    if (!selectedTemplate?.body) return draft.masterCaption || "No content configured.";
    let body = selectedTemplate.body;
    const vars = draft.whatsappVariables || {};
    for (const [key, val] of Object.entries(vars)) {
      if (val) {
        body = body.replaceAll(`{{${key}}}`, val);
      }
    }
    return body;
  }, [selectedTemplate, draft.whatsappVariables, draft.masterCaption]);

  return (
    <div className="space-y-2.5">
      <Panel letter="A" icon={ImageIcon} title="Campaign Assets" caption="Upload images, videos, carousels and other media for your campaign.">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
          <div className="min-w-0 rounded-sm border border-[#E7EDF5] bg-white p-3">
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

          <div className="min-w-0 rounded-sm border border-[#E7EDF5] bg-white p-3">
            <SectionTitle icon={ImageIcon} title="Media Assets" caption="Upload images and videos for your campaign." />
            <div className="mt-3 rounded-sm border border-dashed border-[#BFD4F2] bg-[#F8FBFF] p-3 text-center">
              <button className="mx-auto flex h-8 items-center gap-2 rounded-sm bg-[#155EEF] px-4 text-[11px] font-semibold text-white">
                <Upload className="size-3.5" />
                Upload Media
              </button>
              <p className="mt-2 text-[10px] leading-4 text-[#687797]">Drag & drop files here or click to browse<br />Supports JPG, PNG, MP4, MOV - Max 500 MB</p>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {MEDIA.map((asset) => (
                <div key={asset.name} className="overflow-hidden rounded-sm border border-[#DDE6F1] bg-white">
                  <span className="relative block h-[78px]">
                    <Image src={asset.src} alt="" fill sizes="160px" className="object-cover" />
                    <i className="absolute left-1.5 top-1.5 grid size-5 place-items-center rounded bg-[#0AA673] text-white"><Check className="size-3" /></i>
                    {asset.video && <i className="absolute inset-0 m-auto grid size-9 place-items-center rounded-sm bg-black/55 text-white"><Video className="size-4" /></i>}
                    <button className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded bg-white text-[#E11D28]"><X className="size-3" /></button>
                  </span>
                  <div className="p-1.5">
                    <b className="block truncate text-[9.5px] text-[#132044]">{asset.name}</b>
                    <small className="block truncate text-[8.5px] text-[#687797]">{asset.meta}</small>
                  </div>
                </div>
              ))}
              <button className="flex min-h-[124px] flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-[#BFD4F2] bg-[#F8FBFF] text-[10px] font-semibold text-[#155EEF]">
                <span className="grid size-9 place-items-center rounded-sm bg-[#EAF2FF]"><Plus className="size-4" /></span>
                Add More
              </button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel letter="B" icon={Sparkles} title="Master Creative & AI Adaptation" caption="Upload a master creative and let AI automatically adapt it for each platform.">
        <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-sm border border-[#E7EDF5] bg-white p-3">
            <SectionTitle icon={ImageIcon} title="Master Creative" caption="Upload one master creative to auto-generate platform versions." />
            <div className="mt-3 rounded-sm border border-dashed border-[#BFD4F2] bg-[#F8FBFF] p-6 text-center">
              <button className="mx-auto flex h-8 items-center gap-2 rounded-sm bg-[#155EEF] px-4 text-[11px] font-semibold text-white">
                <Upload className="size-3.5" />
                Upload Master Creative
              </button>
              <p className="mt-2 text-[10px] leading-4 text-[#687797]">Recommended: 1920x1080 or higher</p>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-1.5">
              {DEFAULT_FORMATS.map((format) => (
                <div key={format} className="rounded-sm border border-[#DDE6F1] bg-[#F8FAFC] p-1.5 text-center">
                  <span className="grid h-8 place-items-center rounded bg-white text-[8px] font-semibold text-[#526385]">{format.split(" ")[0]}</span>
                  <small className="mt-0.5 block text-[7px] text-[#8791A4]">{format.split(" ").slice(1).join(" ")}</small>
                </div>
              ))}
              {customFormats.map((format, idx) => (
                <div key={`custom-${idx}`} className="group relative rounded-sm border border-[#C4B5FD] bg-[#F5F3FF] p-1.5 text-center">
                  <button onClick={() => removeCustomFormat(idx)} className="absolute -right-1 -top-1 hidden size-4 place-items-center rounded-sm bg-[#E11D28] text-white group-hover:grid">
                    <X className="size-2.5" />
                  </button>
                  <span className="grid h-8 place-items-center rounded bg-[#EDE9FE] text-[8px] font-semibold text-[#7C3AED]">{format.ratio}</span>
                  <small className="mt-0.5 block text-[7px] text-[#7C3AED]">{format.label}</small>
                </div>
              ))}
              {!showCustomInput ? (
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="rounded-sm border border-dashed border-[#C4B5FD] bg-[#F5F3FF] p-1.5 text-center transition-colors hover:border-[#7C3AED] hover:bg-[#EDE9FE]"
                >
                  <span className="grid h-8 place-items-center rounded bg-[#EDE9FE] text-[#7C3AED]">
                    <Plus className="size-4" />
                  </span>
                  <small className="mt-0.5 block text-[7px] font-semibold text-[#7C3AED]">Custom</small>
                </button>
              ) : (
                <div className="rounded-sm border border-[#7C3AED] bg-[#F5F3FF] p-1.5">
                  <SpellCheckedInput
                    value={newRatio}
                    onChangeValue={(val) => setNewRatio(val)}
                    placeholder="Ratio"
                    className="mb-1 w-full rounded bg-white px-1.5 py-1 text-center text-[8px] font-semibold text-[#526385] outline-none ring-1 ring-[#C4B5FD] placeholder:text-[#9CA3AF]"
                  />
                  <SpellCheckedInput
                    value={newLabel}
                    onChangeValue={(val) => setNewLabel(val)}
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

          <div className="rounded-sm border border-[#E7EDF5] bg-white p-3">
            <SectionTitle icon={Sparkles} title="AI Adapt Options" caption="Select what AI should generate for each platform." />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {AI_ADAPTATIONS.map(({ label, desc }) => (
                <div key={label} className="flex items-center gap-2 rounded-sm bg-[#F8FAFC] px-2.5 py-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-[#EEF2FF] text-[#4F46E5]">
                    <Sparkles className="size-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block text-[10px] font-semibold text-[#34415F]">{label}</b>
                    <small className="block text-[8.5px] text-[#8791A4]">{desc}</small>
                  </div>
                  <button className="h-5 w-8 shrink-0 rounded-sm bg-[#18B875] p-0.5">
                    <i className="block size-4 translate-x-3 rounded-sm bg-white" />
                  </button>
                </div>
              ))}
            </div>
            <button className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-sm bg-[#4F46E5] text-[11px] font-semibold text-white">
              <Sparkles className="size-3.5" />
              Generate All Adaptations
            </button>
          </div>
        </div>
      </Panel>

      <Panel letter="C" icon={BarChart3} title="Platform-Specific Content" caption="Customize content for each platform with individual captions, media and settings.">
        <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-[#E7EDF5] pb-0">
          {PLATFORM_TABS.map((tab) => {
            const isTabActive = activePlatformTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 text-[10.5px] font-semibold transition-all",
                  isTabActive
                    ? "border-[#DDE6F1] bg-white text-[#155EEF] shadow-xs font-bold"
                    : "border-transparent text-[#687797] hover:text-[#111827] hover:bg-slate-50",
                )}
              >
                <ChannelLogo channel={tab.channel} className="size-4" />
                {tab.id}
                {tab.channel === "WhatsApp" && templates.length > 0 && (
                  <span className="ml-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-700">
                    {templates.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activePlatformTab === "WhatsApp Broadcast" ? (
          /* ================= WHATSAPP BROADCAST STUDIO ================= */
          <div className="grid gap-3 rounded-b-lg border-x border-b border-[#E7EDF5] p-3.5 xl:grid-cols-[minmax(340px,1fr)_minmax(340px,1fr)_minmax(340px,1fr)]">
            {/* Column 1: Template Selection & Variables */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionTitle icon={MessageCircle} title="WhatsApp Template" caption="Meta-approved message template from AiSensy." />
                {loadingWhatsApp && <RefreshCw className="size-3.5 animate-spin text-[#155EEF]" />}
              </div>

              {templates.length > 0 ? (
                <div className="space-y-2.5">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Select Approved Template
                    <div className="relative mt-1">
                      <select
                        value={draft.whatsappTemplateId || templates[0]?.id}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        className="w-full rounded-sm border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 shadow-2xs outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.language}) {t.category ? `· ${t.category}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>

                  {selectedTemplate && (
                    <div className="rounded-sm border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-600 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-[11.5px]">{selectedTemplate.name}</span>
                        <span className="inline-flex rounded-sm bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-800">
                          {selectedTemplate.status}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500">
                        Language: <b className="text-slate-700">{selectedTemplate.language}</b>
                        {selectedTemplate.category && <> · Category: <b className="text-slate-700">{selectedTemplate.category}</b></>}
                      </p>
                      {selectedTemplate.footer && (
                        <p className="text-[10px] italic text-slate-400">Footer: {selectedTemplate.footer}</p>
                      )}
                    </div>
                  )}

                  {/* Template Variable Inputs */}
                  {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                    <div className="rounded-sm border border-indigo-100 bg-indigo-50/40 p-2.5 space-y-2">
                      <p className="text-[11px] font-semibold text-indigo-900">
                        Template Variables ({selectedTemplate.variables.length})
                      </p>
                      <div className="space-y-1.5">
                        {selectedTemplate.variables.map((variable) => (
                          <div key={variable} className="flex items-center gap-2">
                            <span className="w-20 shrink-0 font-mono text-[10.5px] font-semibold text-indigo-700">
                              {`{{${variable}}}`}
                            </span>
                            <input
                              type="text"
                              value={draft.whatsappVariables?.[variable] ?? ""}
                              onChange={(e) => handleVariableChange(variable, e.target.value)}
                              placeholder={`Value for ${variable}`}
                              className="h-7 min-w-0 flex-1 rounded border border-indigo-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-indigo-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Immediate Dispatch Toggle */}
                  <label className="flex items-start gap-2 rounded-sm border border-slate-200 bg-white p-2.5 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.whatsappBroadcastNow)}
                      onChange={(e) => set("whatsappBroadcastNow", e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-[11px] leading-tight">
                      <b className="block font-semibold text-slate-800">Broadcast Messages on Campaign Launch</b>
                      <span className="text-[10px] text-slate-500">
                        When enabled, AiSensy will dispatch live WhatsApp messages immediately upon campaign launch.
                      </span>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="size-4 shrink-0 text-amber-600" />
                    <span>No approved templates detected</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Templates from your connected AiSensy account will sync automatically. You can still save or launch this campaign; a WhatsApp campaign registry will be created.
                  </p>
                  <a
                    href="/admin/whatsapp"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"
                  >
                    Manage Templates in WhatsApp Channel <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Column 2: Audience & Recipient Targeting */}
            <div className="space-y-3">
              <SectionTitle icon={Users} title="Audience & Recipients" caption="Target client contacts or specify phone numbers." />

              <div className="space-y-2.5">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Manual Phone Numbers (CSV or Newline)
                  <textarea
                    rows={4}
                    value={draft.whatsappManualRecipients || ""}
                    onChange={(e) => handleManualPhonesChange(e.target.value)}
                    placeholder="+919876543210&#10;+919812345678&#10;+919800000000"
                    className="mt-1 w-full rounded-sm border border-slate-200 bg-white p-2 font-mono text-xs text-slate-800 shadow-2xs outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </label>

                {contacts.length > 0 && (
                  <label className="flex items-center gap-2 rounded-sm border border-slate-200 bg-white p-2.5 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.whatsappIncludeAllContacts)}
                      onChange={(e) => handleToggleIncludeAllContacts(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-[11px] leading-tight">
                      <b className="font-semibold text-slate-800">Include all registered Client Contacts</b>
                      <span className="block text-[10px] text-slate-500">
                        {contacts.length} saved contact(s) available in this client workspace.
                      </span>
                    </div>
                  </label>
                )}

                <div className="rounded-sm border border-slate-200 bg-slate-50 p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Total WhatsApp Audience</span>
                    <span className="rounded bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white">
                      {(draft.whatsappRecipients?.length || 0)} recipients
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Standard WhatsApp Business messaging policy applies. Only opt-in recipients will be contacted.
                  </p>
                </div>
              </div>
            </div>

            {/* Column 3: Live WhatsApp Chat Simulation */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <SectionTitle icon={Phone} title="WhatsApp Live Preview" caption="Real-time recipient handset preview." />
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-700 border border-emerald-200">
                  AiSensy Verified
                </span>
              </div>

              {/* Realistic WhatsApp Chat Card */}
              <div className="overflow-hidden rounded-md border border-slate-300 bg-[#E5DDD5] shadow-sm">
                {/* Chat Top Bar */}
                <div className="flex items-center gap-2 bg-[#075E54] px-3 py-2 text-white">
                  <div className="size-7 rounded-full bg-emerald-400/20 text-white flex items-center justify-center font-bold text-xs ring-1 ring-white/30">
                    WA
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-xs font-semibold leading-tight">{draft.client || "Brand Support"}</p>
                      <CheckCircle2 className="size-3 shrink-0 text-emerald-300" />
                    </div>
                    <p className="text-[9px] text-emerald-100">Official Business Account</p>
                  </div>
                </div>

                {/* Message Bubble Container */}
                <div className="p-3 space-y-2 min-h-[220px]">
                  <div className="mx-auto my-1 rounded bg-[#FDFEFA]/80 px-2.5 py-0.5 text-center text-[9px] font-semibold text-slate-600 shadow-2xs w-fit">
                    TODAY
                  </div>

                  <div className="relative max-w-[92%] rounded-lg bg-white p-2.5 shadow-2xs text-xs text-slate-800 space-y-1">
                    <p className="whitespace-pre-wrap leading-relaxed text-[11.5px] font-normal text-slate-900">
                      {renderedWhatsAppBody}
                    </p>

                    {selectedTemplate?.footer && (
                      <p className="text-[9.5px] text-slate-400 border-t border-slate-100 pt-1">
                        {selectedTemplate.footer}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 pt-0.5">
                      <span>10:45 AM</span>
                      <span className="text-emerald-600 font-bold">✔✔</span>
                    </div>
                  </div>

                  {draft.cta && (
                    <div className="max-w-[92%]">
                      <div className="rounded bg-white/95 px-3 py-1.5 text-center text-xs font-semibold text-[#00A884] shadow-2xs hover:bg-white cursor-pointer border-t border-slate-100">
                        {draft.cta}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================= STANDARD PLATFORM (INSTAGRAM, ETC.) ================= */
          <div className="grid gap-3 rounded-b-lg border-x border-b border-[#E7EDF5] p-3 xl:grid-cols-[minmax(360px,1fr)_360px_minmax(460px,1fr)]">
            <div>
              <SectionTitle icon={FileText} title={`${activePlatformTab} Settings`} caption={`Customize content for ${activePlatformTab}.`} />
              <Field label="Caption">
                <Textarea value={draft.masterCaption} onChange={(v) => set("masterCaption", v)} rows={6} max={2200} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Media">
                <span className="relative block h-[96px] overflow-hidden rounded-sm border border-[#DDE6F1]">
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
                    <span className="h-5 w-9 rounded-sm bg-[#18B875] p-0.5"><i className="block size-4 translate-x-4 rounded-sm bg-white" /></span>
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
        )}
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
              <span key={platform} className="grid place-items-center rounded-sm bg-[#F8FAFC] px-1 py-1.5">
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
              <div key={label} className={cn("rounded-sm p-2 text-center", color)}>
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
    <section className="rounded-sm border border-[#DDE6F1] bg-white p-3 shadow-[0_1px_4px_rgb(15_23_42/0.05)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#FFE6EA] text-[13px] font-black text-[#EB0711]">{letter}</span>
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
      <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-[#EAF2FF] text-[#155EEF]"><Icon className="size-4" /></span>
      <span>
        <b className="block text-[12px] font-semibold text-[#111827]">{title}</b>
        {caption && <small className="block text-[10.5px] text-[#64748B]">{caption}</small>}
      </span>
    </div>
  );
}

function PostPreview() {
  return (
    <div>
      <b className="mb-2 block text-[12px] font-semibold text-[#111827]">Preview</b>
      <div className="overflow-hidden rounded-sm border border-[#DDE6F1] bg-white">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="relative size-6 overflow-hidden rounded-sm"><Image src="/campaigns/save-rivers/square.png" alt="" fill sizes="40px" className="object-cover" /></span>
          <span><b className="block text-[9.5px] font-semibold text-[#111827]">moksha.sewa</b><small className="text-[8.5px] text-[#64748B]">India</small></span>
        </div>
        <span className="relative block aspect-square"><Image src="/campaigns/save-rivers/square.png" alt="" fill sizes="220px" className="object-cover" /></span>
        <div className="flex gap-2 px-2 py-1.5 text-[#111827]"><ThumbsUp className="size-3.5" /><MessageCircle className="size-3.5" /></div>
      </div>
    </div>
  );
}

function BottomCard({ icon: Icon, title, caption, children }: { icon: typeof ImageIcon; title: string; caption?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-[#DDE6F1] bg-white p-3 shadow-[0_1px_4px_rgb(15_23_42/0.05)]">
      <div className="mb-2 flex items-start gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-[#EAF2FF] text-[#155EEF]"><Icon className="size-4" /></span>
        <span>
          <b className="block text-[12px] font-semibold text-[#111827]">{title}</b>
          {caption && <small className="block text-[10px] leading-3 text-[#64748B]">{caption}</small>}
        </span>
      </div>
      {children}
    </section>
  );
}
