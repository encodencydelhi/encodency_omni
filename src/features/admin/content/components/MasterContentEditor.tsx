"use client";
import { useState } from "react";
import { Sparkles, X, Plus, Hash, AtSign, MapPin, MessageSquare, Link2, Type, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import RichTextEditor from "@/components/layout/rich-text-editor";
import { SpellCheckedInput, SpellCheckedTextarea } from "@/components/ui/spellchecked-input";
import type { MasterContent } from "../types/content.types";

const AI_ACTIONS = ["Improve", "Rewrite", "Shorten", "Expand", "Change Tone", "Translate", "Generate Hashtags", "Generate CTA"];

type Props = {
  content: MasterContent;
  onChange: (content: MasterContent) => void;
};

type Tab = "Caption" | "Headline" | "Description" | "CTA" | "Hashtags" | "Mentions" | "Media" | "Link" | "Location" | "Alt Text" | "First Comment" | "AI";

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: "Caption", icon: <Type className="size-2.5" />, label: "Caption" },
  { id: "Headline", icon: <FileText className="size-2.5" />, label: "Headline" },
  { id: "Description", icon: <FileText className="size-2.5" />, label: "Description" },
  { id: "CTA", icon: <Link2 className="size-2.5" />, label: "CTA" },
  { id: "Hashtags", icon: <Hash className="size-2.5" />, label: "Hashtags" },
  { id: "Mentions", icon: <AtSign className="size-2.5" />, label: "Mentions" },
  { id: "Media", icon: <span className="text-[10px]">📎</span>, label: "Media" },
  { id: "Link", icon: <Link2 className="size-2.5" />, label: "Link" },
  { id: "Location", icon: <MapPin className="size-2.5" />, label: "Location" },
  { id: "Alt Text", icon: <MessageSquare className="size-2.5" />, label: "Alt Text" },
  { id: "First Comment", icon: <MessageSquare className="size-2.5" />, label: "1st Comment" },
  { id: "AI", icon: <Sparkles className="size-2.5 text-purple-500" />, label: "AI" },
];

export function MasterContentEditor({ content, onChange }: Props) {
  const [tab, setTab] = useState<Tab>("Caption");
  const [newHashtag, setNewHashtag] = useState("");
  const [newMention, setNewMention] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const update = <K extends keyof MasterContent>(key: K, value: MasterContent[K]) => {
    onChange({ ...content, [key]: value });
  };

  const addHashtag = () => {
    if (newHashtag.trim()) {
      update("hashtags", [...content.hashtags, newHashtag.trim().startsWith("#") ? newHashtag.trim() : `#${newHashtag.trim()}`]);
      setNewHashtag("");
    }
  };

  const addMention = () => {
    if (newMention.trim()) {
      update("mentions", [...content.mentions, newMention.trim().startsWith("@") ? newMention.trim() : `@${newMention.trim()}`]);
      setNewMention("");
    }
  };

  return (
    <section className="overflow-hidden rounded-sm border border-[#E2E8F0] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 border-b border-[#EDF1F5] px-3 py-2.5 text-left transition hover:bg-slate-50"
      >
        <div className="min-w-0">
          <h3 className="truncate text-[13.5px] font-semibold text-[#172044]">Master Content</h3>
          <p className="mt-0.5 text-[11.5px] text-[#7A87A0]">Create once, adapt across platforms</p>
        </div>
        {isOpen ? <ChevronDown className="size-4 text-[#7A87A0]" /> : <ChevronRight className="size-4 text-[#7A87A0]" />}
      </button>

      {isOpen && (
        <div className="p-3">
          {/* Tabs */}
          <div className="mb-2 flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1 h-6 rounded-sm border px-2 text-[10.5px] font-semibold transition",
                  tab === t.id ? "border-red-200 bg-red-50 text-red-600" : "border-[#E2E8F0] text-[#687797] hover:bg-slate-50"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "Caption" && (
            <div>
              <RichTextEditor
                value={content.caption}
                onChange={(val) => update("caption", val)}
                placeholder="Write your caption here..."
                minHeight="100px"
              />
              <div className="flex items-center justify-between border-t border-slate-100 bg-[#F8FAFD] px-2.5 py-1 text-[10.5px] text-[#7A87A0] rounded-b-lg">
                <span>{content.caption.replace(/<[^>]*>/g, "").length} / 2,200</span>
                <div className="flex items-center gap-0.5">
                  {AI_ACTIONS.slice(0, 4).map((a) => (
                    <button key={a} className="rounded px-1.5 py-0.5 font-semibold text-[#1769DF] hover:bg-blue-50">{a}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "Headline" && (
            <div>
              <div className="h-9 w-full rounded-sm border border-[#D9E1EC] bg-white px-2.5 text-[12.5px] text-[#24365A] transition hover:border-[#1769DF] focus-within:border-[#1769DF] flex items-center">
                <SpellCheckedInput
                  name="headline"
                  id="master-headline"
                  value={content.headline}
                  onChangeValue={(val) => update("headline", val)}
                  placeholder="Enter headline..."
                  className="w-full bg-transparent outline-none"
                />
              </div>
              <p className="mt-1 text-[10px] text-[#7A87A0]">{content.headline.length} / 150 characters</p>
            </div>
          )}

          {tab === "Description" && (
            <div className="w-full rounded-sm border border-[#D9E1EC] bg-white p-2.5 text-[12.5px] leading-5 text-[#24365A] transition hover:border-[#1769DF] focus-within:border-[#1769DF]">
              <SpellCheckedTextarea
                name="description"
                id="master-description"
                value={content.description}
                onChangeValue={(val) => update("description", val)}
                rows={3}
                placeholder="Enter description..."
                className="w-full bg-transparent outline-none"
              />
            </div>
          )}

          {tab === "CTA" && (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-[#4B5B76]">CTA Text</span>
                <div className="h-9 w-full rounded-sm border border-[#D9E1EC] bg-white px-2.5 text-[12.5px] text-[#24365A] transition hover:border-[#1769DF] focus-within:border-[#1769DF] flex items-center">
                  <SpellCheckedInput
                    name="cta"
                    id="master-cta"
                    value={content.cta}
                    onChangeValue={(val) => update("cta", val)}
                    placeholder="e.g. Learn More, Sign Up, Shop Now"
                    className="w-full bg-transparent outline-none"
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-[#4B5B76]">CTA URL</span>
                <input
                  name="ctaUrl"
                  id="master-cta-url"
                  value={content.ctaUrl}
                  onChange={(e) => update("ctaUrl", e.target.value)}
                  placeholder="https://..."
                  className="h-9 w-full rounded-sm border border-[#D9E1EC] bg-white px-2.5 text-[12.5px] text-[#24365A] outline-none transition hover:border-[#1769DF] focus:border-[#1769DF]"
                />
              </label>
            </div>
          )}

          {tab === "Hashtags" && (
            <div className="rounded-sm border border-[#E2E8F0] bg-[#F8FAFD] p-2.5">
              <div className="flex flex-wrap gap-1">
                {content.hashtags.map((h) => (
                  <span key={h} className="flex items-center gap-1 rounded-sm bg-[#F0F6FF] px-2 py-0.5 text-[10.5px] font-semibold text-[#1769DF]">
                    {h}
                    <button onClick={() => update("hashtags", content.hashtags.filter(x => x !== h))} className="text-slate-400 hover:text-red-500">
                      <X className="size-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  name="newHashtag"
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHashtag()}
                  placeholder="Add hashtag..."
                  className="h-6 flex-1 rounded border border-[#E2E8F0] px-2 text-[10.5px] outline-none focus:border-[#1769DF]"
                />
                <button onClick={addHashtag} className="flex h-6 items-center gap-1 rounded bg-[#F0F6FF] px-2 text-[10.5px] font-semibold text-[#1769DF]">
                  <Plus className="size-2.5" /> Add
                </button>
                <button className="flex h-6 items-center gap-1 rounded bg-purple-50 px-2 text-[10.5px] font-semibold text-purple-600">
                  <Sparkles className="size-2.5" /> Generate
                </button>
              </div>
            </div>
          )}

          {tab === "Mentions" && (
            <div className="rounded-sm border border-[#E2E8F0] bg-[#F8FAFD] p-2.5">
              <div className="flex flex-wrap gap-1">
                {content.mentions.map((m) => (
                  <span key={m} className="flex items-center gap-1 rounded-sm bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                    {m}
                    <button onClick={() => update("mentions", content.mentions.filter(x => x !== m))} className="text-slate-400 hover:text-red-500">
                      <X className="size-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  name="newMention"
                  value={newMention}
                  onChange={(e) => setNewMention(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMention()}
                  placeholder="Add mention..."
                  className="h-6 flex-1 rounded border border-[#E2E8F0] px-2 text-[10.5px] outline-none focus:border-[#1769DF]"
                />
                <button onClick={addMention} className="flex h-6 items-center gap-1 rounded bg-[#F0F6FF] px-2 text-[10.5px] font-semibold text-[#1769DF]">
                  <Plus className="size-2.5" /> Add
                </button>
              </div>
            </div>
          )}

          {tab === "Media" && (
            <div className="rounded-sm border-2 border-dashed border-[#B9CFF2] bg-[#F7FAFF] py-4 text-center">
              <p className="text-[12px] font-semibold text-[#24365A]">Drag & drop files here, or click to browse</p>
              <button className="mt-1.5 h-7 rounded-sm bg-[#1769DF] px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#1259BD]">Upload from device</button>
              <p className="mt-1 text-[10px] text-[#7A87A0]">Images, Videos, GIFs, Documents up to 100MB</p>
            </div>
          )}

          {tab === "Link" && (
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-[#4B5B76]">Destination Link</span>
              <input
                name="link"
                id="master-link"
                value={content.link}
                onChange={(e) => update("link", e.target.value)}
                placeholder="https://..."
                className="h-9 w-full rounded-sm border border-[#D9E1EC] bg-white px-2.5 text-[12.5px] text-[#24365A] outline-none transition hover:border-[#1769DF] focus:border-[#1769DF]"
              />
            </label>
          )}

          {tab === "Location" && (
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-[#4B5B76]">Location</span>
              <div className="h-9 w-full rounded-sm border border-[#D9E1EC] bg-white px-2.5 text-[12.5px] text-[#24365A] transition hover:border-[#1769DF] focus-within:border-[#1769DF] flex items-center">
                <SpellCheckedInput
                  name="location"
                  id="master-location"
                  value={content.location}
                  onChangeValue={(val) => update("location", val)}
                  placeholder="e.g. Varanasi, India"
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </label>
          )}

          {tab === "Alt Text" && (
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-[#4B5B76]">Alt Text</span>
              <div className="w-full rounded-sm border border-[#D9E1EC] bg-white p-2.5 text-[12.5px] leading-5 text-[#24365A] transition hover:border-[#1769DF] focus-within:border-[#1769DF]">
                <SpellCheckedTextarea
                  name="altText"
                  id="master-alt-text"
                  value={content.altText}
                  onChangeValue={(val) => update("altText", val)}
                  rows={2}
                  placeholder="Describe the image for accessibility..."
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </label>
          )}

          {tab === "First Comment" && (
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[#4B5B76]">First Comment</label>
              <RichTextEditor
                value={content.firstComment}
                onChange={(val) => update("firstComment", val)}
                placeholder="Write your first comment..."
                minHeight="80px"
              />
            </div>
          )}

          {tab === "AI" && (
            <div className="space-y-1.5">
              <div className="rounded-sm border border-purple-200 bg-purple-50/50 p-2.5">
                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-purple-700">
                  <Sparkles className="size-3.5" /> AI Content Actions
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {AI_ACTIONS.map((a) => (
                    <button key={a} className="flex items-center gap-1 rounded-sm border border-purple-200 bg-white px-2 py-1 text-[10.5px] font-semibold text-purple-700 transition hover:bg-purple-50">
                      <Sparkles className="size-2.5" />
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-sm border border-blue-200 bg-blue-50/50 p-2.5">
                <p className="text-[11px] font-semibold text-blue-700">Generate Platform Variations</p>
                <p className="mt-0.5 text-[10px] text-blue-600/70">AI will rewrite your master content for each selected platform</p>
                <button className="mt-1.5 h-7 rounded-sm bg-[#1769DF] px-3 text-[11px] font-semibold text-white hover:bg-[#1259BD]">Generate All Variations</button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
