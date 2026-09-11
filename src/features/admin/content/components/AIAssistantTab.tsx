"use client";
import { useState } from "react";
import { Sparkles, Camera, Grid2X2, Video, BookOpen, Zap, Tag, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { SelectField } from "./ui-fields";
import { MOCK_AI_CONTENT, IMG } from "../mocks/content.mock";
import { ContentPreviewPanel } from "./ContentPreview";


const AI_TYPES = [
  { id: "Social Post", desc: "Engaging posts with images", icon: <Sparkles className="size-4" /> },
  { id: "Carousel", desc: "Multi-slide content", icon: <Grid2X2 className="size-4" /> },
  { id: "Reel Script", desc: "Script for short videos", icon: <Video className="size-4" /> },
  { id: "Story", desc: "Quick engaging stories", icon: <Camera className="size-4" /> },
  { id: "Blog", desc: "Long-form content", icon: <BookOpen className="size-4" /> },
  { id: "Ad Copy", desc: "Conversion focused", icon: <Zap className="size-4" /> },
  { id: "Hashtags", desc: "Trending hashtags", icon: <Tag className="size-4" /> },
  { id: "Variations", desc: "Multiple options", icon: <AlignLeft className="size-4" /> },
];

export function AIAssistantTab() {
  const [selected, setSelected] = useState("Social Post");
  const [prompt, setPrompt] = useState("Create an Instagram post about Clean Ganga awareness with a motivating, eco-friendly tone.");
  const [generated, setGenerated] = useState(false);
  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
      <Card title="What would you like to create?">
        <div className="grid grid-cols-4 gap-1.5">
          {AI_TYPES.map((t) => (
            <button key={t.id} onClick={() => setSelected(t.id)} className={cn("rounded-lg border p-2 text-left transition", selected === t.id ? "border-purple-300 bg-purple-50 shadow-sm" : "border-[#E2E8F0] hover:border-[#CBD5E1]")}>
              <span className={cn("mb-1 grid size-7 place-items-center rounded-lg", selected === t.id ? "bg-[#7C3AED] text-white" : "bg-[#F1F5F9] text-[#64748B]")}>{t.icon}</span>
              <span className="block text-[10.5px] font-bold text-[#24365A]">{t.id}</span>
              <span className="block text-[9.5px] text-[#7A87A0]">{t.desc}</span>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-[11.5px] font-bold text-[#33445F]">Topic / prompt *</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="w-full resize-none rounded-lg border border-[#D9E1EC] p-2.5 text-[12px] leading-5 outline-none focus:border-[#7C3AED]" />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <SelectField label="Audience" value="General Public" />
          <SelectField label="Tone" value="Positive" />
          <SelectField label="Language" value="English" />
        </div>
        <p className="mb-1 mt-3 text-[11.5px] font-bold text-[#33445F]">Image style</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[IMG.river, IMG.nature, IMG.water, IMG.people, IMG.lake, IMG.forest].map((src, i) => (
            <button key={i} className={cn("overflow-hidden rounded-lg border text-left", i === 0 ? "border-[#7C3AED] ring-2 ring-purple-100" : "border-[#E2E8F0]")}>
              <img src={src} alt="" className="h-12 w-full object-cover" />
              <span className="block px-1.5 py-1 text-[9.5px] font-semibold text-[#687797]">{["Realistic", "Nature", "Minimal", "Community", "River", "Forest"][i]}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setGenerated(true)} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#7C3AED] text-[12.5px] font-bold text-white shadow-sm transition hover:bg-[#6D28D9]">
          <Sparkles className="size-4" /> Generate content
        </button>
      </Card>

      <Card title="AI result" subtitle="Review, then send to editor" action={<button className="text-[11px] font-bold text-[#1769DF]">Regenerate</button>}>
        {generated ? (
          <>
            <div className="rounded-lg border border-[#E2E8F0] p-2.5 text-[12px] leading-5 text-[#33445F]">
              {MOCK_AI_CONTENT.caption}
              <br /><br />
              <span className="font-semibold text-[#1769DF]">{MOCK_AI_CONTENT.hashtags.join(" ")}</span>
            </div>
            <img src={IMG.people} alt="" className="mt-2 aspect-video w-full rounded-lg object-cover" />
            <div className="mt-2 grid grid-cols-5 gap-1">
              {[IMG.people, IMG.cleanup, IMG.river, IMG.lake, IMG.nature].map((s, i) => (
                <img key={i} src={s} alt="" className={`h-12 w-full rounded object-cover ${i === 0 ? "ring-2 ring-[#1769DF]" : ""}`} />
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              <button className="h-8 flex-1 rounded-lg border text-[11px] font-bold text-[#687797]">Save draft</button>
              <button className="h-8 flex-1 rounded-lg bg-[#1769DF] text-[11px] font-bold text-white">Use this post</button>
            </div>
          </>
        ) : (
          <div className="grid min-h-[200px] place-items-center rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFD] p-6 text-center">
            <Sparkles className="size-7 text-[#CBD5E1]" />
            <p className="mt-2 text-[12px] font-semibold text-[#64748B]">Your AI result will appear here</p>
            <p className="mt-0.5 text-[11px] text-[#94A3B8]">Add a prompt and generate content</p>
          </div>
        )}
      </Card>

      <div className="space-y-2.5 xl:sticky xl:top-4">
        <ContentPreviewPanel platform="instagram" setPlatform={() => {}} channels={["instagram", "facebook"]} />
        <Card title="Quick refinements">
          <div className="grid grid-cols-2 gap-1">
            {["Make shorter", "Add CTA", "Change tone", "More hashtags", "Hindi version", "Add emojis"].map((x) => (
              <button key={x} className="rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-left text-[11px] font-semibold text-[#687797] hover:border-purple-200 hover:bg-purple-50/50">✨ {x}</button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}