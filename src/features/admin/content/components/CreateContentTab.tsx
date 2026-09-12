"use client";
import { useState } from "react";
import {
  Camera, Check, Clock3, Copy, Download, FileText, Grid2X2,
  Image as ImageIcon, MoreHorizontal, Play, Plus,
  Send, Sparkles, Video, X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./ui-card";
import { SelectField, TextField, Toggle } from "./ui-fields";
import { PlatformBadge } from "./ui-platform";
import type { Platform, ContentType, MediaRatio } from "../types/content.types";
import {
  ALL_PLATFORMS, PLATFORM_META, PLACEMENTS,
  AUTO_ADAPT_MAP, MOCK_CONNECTIONS, RATIO_OPTIONS,
} from "../config/platform-config";
import { MOCK_MEDIA, MOCK_CLIENTS, MOCK_CAMPAIGNS } from "../mocks/content.mock";
import { ContentPreviewPanel } from "./ContentPreview";
import { ContentChecklist } from "./ContentChecklist";
import RichTextEditor from "@/components/layout/rich-text-editor";

type PostType = ContentType;

const POST_TYPES: Array<{ id: PostType; label: string; icon: React.ReactNode }> = [
  { id: "image", label: "Image", icon: <ImageIcon className="size-3.5" /> },
  { id: "video", label: "Video", icon: <Video className="size-3.5" /> },
  { id: "reel", label: "Reel", icon: <Play className="size-3.5" /> },
  { id: "story", label: "Story", icon: <Camera className="size-3.5" /> },
  { id: "carousel", label: "Carousel", icon: <Grid2X2 className="size-3.5" /> },
  { id: "article", label: "Article", icon: <FileText className="size-3.5" /> },
];

const AI_ACTIONS = ["Improve", "Rewrite", "Shorten", "Expand", "Change Tone", "Translate", "Emojis", "Add CTA"];
const CONTENT_TABS = ["Caption", "Hashtags", "Variations", "First Comment", "Platform Overrides", "Language & Tone", "AI Improve"];

export function CreateContentTab() {
  const [postType, setPostType] = useState<PostType>("image");
  const [channels, setChannels] = useState<Platform[]>(["instagram", "facebook", "linkedin"]);
  const [ratio, setRatio] = useState<MediaRatio>("4:5");
  const [caption, setCaption] = useState("Small actions create a cleaner tomorrow.\n\nLet's work together for a healthier, greener and cleaner India.\n\n#CleanGanga #HealthyIndia #Sustainability #MokshaSewa");
  const [headline, setHeadline] = useState("CLEAN RIVERS BRIGHTER TOMORROW");
  const [hashtags] = useState("#CleanGanga #HealthyIndia #Sustainability #MokshaSewa");
  const [firstComment, setFirstComment] = useState("What small action will you take today? 💚");
  const [schedule, setSchedule] = useState<"now" | "later" | "draft">("later");
  const [selectedClient] = useState(MOCK_CLIENTS[0]!.name);
  const [selectedCampaign] = useState(MOCK_CAMPAIGNS[0]!.name);
  const [contentTab, setContentTab] = useState("Caption");
  const [mediaTab, setMediaTab] = useState("Images");
  const [autoAdapt, setAutoAdapt] = useState(true);
  const [igPlacements, setIgPlacements] = useState<string[]>(["Post"]);
  const [igLocation, setIgLocation] = useState("Varanasi, UP");
  const [igTagPeople, setIgTagPeople] = useState("");
  const [igProductTags, setIgProductTags] = useState("");
  const [igMusic, setIgMusic] = useState("");
  const [igAutoCaptions, setIgAutoCaptions] = useState("Off");
  const [showTracking, setShowTracking] = useState(false);
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("instagram");

  const toggleChannel = (p: Platform) => {
    setChannels((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
    if (!previewPlatform || !channels.includes(previewPlatform)) setPreviewPlatform(p);
  };

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px_320px]">
      {/* ─── LEFT: Editor ─── */}
      <div className="space-y-2.5 min-w-0">
        {/* Post Type — compact segmented control */}
        <Card>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-bold text-[#7A87A0]">Type</span>
            <div className="flex flex-1 gap-0.5 rounded-lg bg-[#F1F5F9] p-0.5">
              {POST_TYPES.map((t) => (
                <button key={t.id} onClick={() => setPostType(t.id)} className={cn("flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition", postType === t.id ? "bg-white text-[#172044] shadow-sm" : "text-[#687797] hover:text-[#33445F]")}>
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Client & Campaign — compact inline */}
        <Card>
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="Client" value={selectedClient} required />
            <SelectField label="Campaign" value={selectedCampaign} />
          </div>
        </Card>

        {/* Content Editor */}
        <Card>
          <div className="mb-2 flex flex-wrap gap-1">
            {CONTENT_TABS.map((t) => (
              <button key={t} onClick={() => setContentTab(t)} className={cn("h-6 rounded-md border px-2 text-[10.5px] font-semibold transition", contentTab === t ? "border-red-200 bg-red-50 text-red-600" : "border-[#E2E8F0] text-[#687797] hover:bg-slate-50")}>
                {t === "AI Improve" && <Sparkles className="mr-0.5 inline size-2.5 text-purple-500" />}
                {t}
              </button>
            ))}
          </div>

          {contentTab === "Caption" && (
            <div>
              <RichTextEditor
                value={caption}
                onChange={(val) => setCaption(val)}
                placeholder="Write your caption here..."
                minHeight="100px"
              />
              <div className="flex items-center justify-between border-t border-slate-100 bg-[#F8FAFD] px-2.5 py-1 text-[10.5px] text-[#7A87A0] rounded-b-lg">
                <span>{caption.replace(/<[^>]*>/g, "").length} / 2,200</span>
                <div className="flex items-center gap-0.5">
                  {AI_ACTIONS.slice(0, 4).map((a) => (
                    <button key={a} className="rounded px-1.5 py-0.5 font-semibold text-[#1769DF] hover:bg-blue-50">{a}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {contentTab === "Hashtags" && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFD] p-2.5">
              <div className="flex flex-wrap gap-1">
                {hashtags.split(" ").filter(Boolean).map((h) => (
                  <span key={h} className="flex items-center gap-1 rounded-full bg-[#F0F6FF] px-2 py-0.5 text-[10.5px] font-semibold text-[#1769DF]">
                    {h}
                    <button className="text-slate-400 hover:text-red-500"><X className="size-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <input placeholder="Add hashtag..." className="h-6 flex-1 rounded border border-[#E2E8F0] px-2 text-[10.5px] outline-none focus:border-[#1769DF]" />
                <button className="flex h-6 items-center gap-1 rounded bg-[#F0F6FF] px-2 text-[10.5px] font-bold text-[#1769DF]"><Sparkles className="size-2.5" /> Generate</button>
              </div>
            </div>
          )}

          {contentTab === "Variations" && (
            <div className="space-y-1.5">
              {["Small actions create a cleaner tomorrow. Together, we can protect every river.", "Cleaner rivers begin with everyday choices. Let's make a difference together.", "A healthier India starts with cleaner water. Join the movement today."].map((v, i) => (
                <div key={i} className="flex items-start justify-between gap-2 rounded-lg border border-[#E2E8F0] p-2">
                  <div className="min-w-0"><p className="text-[9.5px] font-bold uppercase tracking-wide text-[#1769DF]">Variation {i + 1}</p><p className="mt-0.5 text-[11.5px] leading-4 text-[#33445F]">{v}</p></div>
                  <button className="flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold text-[#687797] hover:bg-slate-50"><Copy className="size-2.5" /> Copy</button>
                </div>
              ))}
            </div>
          )}

          {contentTab === "First Comment" && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[#374766]">First Comment</label>
              <RichTextEditor
                value={firstComment}
                onChange={(val) => setFirstComment(val)}
                placeholder="Write your first comment..."
                minHeight="80px"
              />
            </div>
          )}

          {contentTab === "Platform Overrides" && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-[#7A87A0]">Enable per-platform override to customize caption, hashtags, or media for each channel.</p>
              {channels.map((p) => (
                <div key={p} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5"><PlatformBadge platform={p} size="sm" /><span className="text-[11.5px] font-semibold text-[#33445F]">{PLATFORM_META[p].label}</span></div>
                  <Toggle on={false} onChange={() => {}} label={`Override ${p}`} />
                </div>
              ))}
            </div>
          )}

          {contentTab === "Language & Tone" && (
            <div className="grid grid-cols-3 gap-1.5">
              <SelectField label="Language" value="English" />
              <SelectField label="Tone" value="Positive" />
              <SelectField label="Audience" value="General Public" />
            </div>
          )}

          {contentTab === "AI Improve" && (
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-2.5">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-purple-700"><Sparkles className="size-3.5" /> AI Suggestions</div>
              <ul className="mt-1.5 space-y-0.5 text-[11px] leading-4 text-purple-800/70">
                <li>• Add a clearer call-to-action</li>
                <li>• Use 3–5 high-intent hashtags</li>
                <li>• Shorten the first sentence for stronger hook</li>
              </ul>
            </div>
          )}
        </Card>

        {/* Media */}
        <Card title="Media" subtitle="JPG, PNG, GIF, MP4 up to 100MB">
          <div className="mb-1.5 flex gap-1 border-b border-[#EDF1F5] pb-1.5">
            {["Images", "Videos", "Carousel", "Documents", "GIFs"].map((t) => (
              <button key={t} onClick={() => setMediaTab(t)} className={cn("pb-1 text-[10.5px] font-semibold transition", mediaTab === t ? "border-b-2 border-[#EB0711] text-[#EB0711]" : "text-[#7A87A0]")}>{t}</button>
            ))}
          </div>

          <div className="rounded-lg border-2 border-dashed border-[#B9CFF2] bg-[#F7FAFF] py-4 text-center transition hover:border-[#1769DF] hover:bg-[#F0F6FF]">
            <p className="text-[12px] font-bold text-[#24365A]">Drag & drop files here, or click to browse</p>
            <button className="mt-1.5 h-7 rounded-lg bg-[#1769DF] px-3 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#1259BD]">Upload from device</button>
            <p className="mt-1 text-[10px] text-[#7A87A0]">Recommended 1080 × 1350 (4:5) for Instagram</p>
          </div>

          <div className="mt-2 grid grid-cols-5 gap-1">
            {MOCK_MEDIA.slice(0, 4).map((m, i) => (
              <div key={m.id} className="relative overflow-hidden rounded-lg border border-[#E2E8F0]">
                <img src={m.url} alt={m.alt} className="h-14 w-full object-cover" />
                <span className="absolute left-0.5 top-0.5 grid size-3.5 place-items-center rounded bg-[#172044]/80 text-[8px] font-bold text-white">{i + 1}</span>
                <button className="absolute right-0.5 top-0.5 rounded bg-white/90 p-0.5"><MoreHorizontal className="size-2.5 text-slate-500" /></button>
              </div>
            ))}
            <button className="grid h-14 place-items-center rounded-lg border border-dashed border-[#CBD5E1] text-[#7A87A0] hover:bg-slate-50">
              <Plus className="size-3.5" /><span className="mt-0.5 text-[9px] font-semibold">Add</span>
            </button>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-1">
            {["Media Library", "Unsplash", "Pexels", "Google Drive", "AI Generate"].map((s) => (
              <button key={s} className="flex h-6 items-center gap-1 rounded-md border border-[#E2E8F0] px-2 text-[10px] font-semibold text-[#687797] hover:bg-slate-50">
                {s === "AI Generate" && <Sparkles className="size-2.5 text-purple-500" />}
                {s}
              </button>
            ))}
          </div>
        </Card>

        {/* Ratio — compact single row */}
        <Card>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-bold text-[#7A87A0]">Ratio</span>
            <div className="flex flex-1 gap-1">
              {RATIO_OPTIONS.map((r) => (
                <button key={r.ratio} onClick={() => setRatio(r.ratio)} className={cn("flex flex-1 flex-col items-center rounded-lg border px-1 py-1.5 text-center transition", ratio === r.ratio ? "border-[#1769DF] bg-[#F0F6FF]" : "border-[#E2E8F0] hover:border-[#CBD5E1]")}>
                  <span className="text-[10.5px] font-bold text-[#24365A]">{r.ratio}</span>
                  <span className="text-[8.5px] text-[#7A87A0] leading-tight">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-lg border border-[#E2E8F0] px-2.5 py-1.5">
            <div><p className="text-[11.5px] font-semibold text-[#33445F]">Auto Adapt</p><p className="text-[10px] text-[#7A87A0]">Resize per platform</p></div>
            <Toggle on={autoAdapt} onChange={() => setAutoAdapt(!autoAdapt)} label="Auto adapt" />
          </div>
          {autoAdapt && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {channels.map((p) => {
                const adapted = AUTO_ADAPT_MAP[ratio]?.[p] ?? ratio;
                return (
                  <div key={p} className="flex items-center gap-1 rounded border border-[#E2E8F0] px-1.5 py-1">
                    <PlatformBadge platform={p} size="sm" />
                    <span className="text-[9.5px] font-bold text-[#33445F]">{adapted}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Channels + Placements — merged */}
        <Card title="Channels & placements" subtitle="Where this content will be published">
          <div className="space-y-0.5">
            {ALL_PLATFORMS.map((p) => {
              const conn = MOCK_CONNECTIONS[p];
              const on = channels.includes(p);
              const disabled = conn.status === "disconnected";
              const placements = PLACEMENTS[p]?.[postType] ?? [];
              return (
                <div key={p}>
                  <button onClick={() => !disabled && toggleChannel(p)} disabled={disabled} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition", disabled ? "opacity-50 cursor-not-allowed" : on ? "bg-[#F0F6FF]" : "hover:bg-slate-50")}>
                    <span className={cn("grid h-3.5 w-3.5 shrink-0 place-items-center rounded border transition", on ? "border-[#1769DF] bg-[#1769DF] text-white" : "border-[#CBD5E1] text-transparent")}><Check className="size-2" /></span>
                    <PlatformBadge platform={p} size="sm" />
                    <span className="flex-1 text-[11.5px] font-semibold text-[#33445F]">{PLATFORM_META[p].label}</span>
                    <span className="text-[9.5px] text-[#7A87A0]">{conn.account}</span>
                    {conn.status === "connected" && <span className="rounded bg-emerald-50 px-1 py-0.5 text-[9px] font-bold text-emerald-600">Connected</span>}
                    {conn.status === "disconnected" && <span className="rounded bg-red-50 px-1 py-0.5 text-[9px] font-bold text-red-500">Reconnect</span>}
                  </button>
                  {on && placements.length > 0 && (
                    <div className="ml-7 flex flex-wrap gap-1 py-1">
                      {placements.map((pl) => (
                        <button key={pl} className="rounded border border-[#E2E8F0] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#687797] transition hover:border-[#1769DF] hover:bg-[#F0F6FF] hover:text-[#1769DF]">{pl}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Tracking — collapsed by default */}
        <Card action={<button onClick={() => setShowTracking(!showTracking)} className="text-[11px] font-bold text-[#1769DF]">{showTracking ? "Collapse" : "Expand"}</button>}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#7A87A0]">Tracking</span>
            {!showTracking && <span className="text-[10px] text-[#94A3B8]">UTM parameters for campaign tracking</span>}
          </div>
          {showTracking && (
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <TextField label="Source" value={utmSource} placeholder="instagram" onChange={setUtmSource} />
              <TextField label="Medium" value={utmMedium} placeholder="social" onChange={setUtmMedium} />
              <TextField label="Campaign" value="" placeholder="clean_ganga" onChange={() => {}} />
            </div>
          )}
        </Card>
      </div>

      {/* ─── CENTER: Platform Settings ─── */}
      <div className="space-y-2.5 xl:sticky xl:top-4">
        <Card>
          <div className="mb-2 flex items-center gap-1.5 border-b border-[#EDF1F5] pb-2">
            <span className="text-[11px] font-bold text-[#7A87A0]">Configure</span>
            <div className="ml-auto flex gap-0.5">
              {channels.map((p) => (
                <button key={p} onClick={() => setPreviewPlatform(p)} className={cn("flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9.5px] font-semibold transition", previewPlatform === p ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#7A87A0] hover:bg-slate-50")}>
                  <PlatformBadge platform={p} size="sm" />
                  {PLATFORM_META[p].short}
                </button>
              ))}
            </div>
          </div>

          {previewPlatform && (
            <div className="space-y-3">
              {previewPlatform === "instagram" && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {["Post", "Reel", "Story"].map((t) => {
                      const selected = igPlacements.includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() => setIgPlacements([t])}
                          className={cn(
                            "flex items-center gap-0.5 rounded-md border px-2 py-1 text-[10.5px] font-semibold transition",
                            selected ? "border-[#1769DF] bg-[#F0F6FF] text-[#1769DF]" : "border-[#E2E8F0] text-[#687797] hover:border-[#CBD5E1]"
                          )}
                        >
                          {selected && <Check className="size-2.5" />}
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-4 gap-0.5">
                    {RATIO_OPTIONS.slice(0, 4).map((r) => (
                      <button key={r.ratio} className={cn("rounded border px-1 py-1 text-center text-[9.5px]", ratio === r.ratio ? "border-[#1769DF] bg-[#F0F6FF]" : "border-[#E2E8F0]")}>
                        <span className="block font-bold text-[#33445F]">{r.ratio}</span>
                        <span className="text-[8px] text-[#7A87A0]">{r.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2.5">
                    <SelectField label="Location" value={igLocation} onChange={setIgLocation} options={["Varanasi, UP", "Mumbai, MH", "Delhi, NCR", "Bangalore, KA", "Hyderabad, TS"]} />
                    <SelectField label="Tag people" value={igTagPeople} onChange={setIgTagPeople} options={["", "MokshaSewa Foundation", "Clean India Mission", "NGO Partner India", "Self"]} placeholder="Select accounts to tag" />
                    <SelectField label="Product tags" value={igProductTags} onChange={setIgProductTags} options={["", "Eco Bottle", "Bamboo Kit", "Reusable Bag", "Solar Lamp"]} placeholder="Select products" />
                    <SelectField label="Music" value={igMusic} onChange={setIgMusic} options={["", "Nature Sounds", "Inspirational Piano", "Indian Classical", "Upbeat Acoustic"]} placeholder="Add background music" />
                    <SelectField label="Auto captions" value={igAutoCaptions} onChange={setIgAutoCaptions} options={["Off", "English", "Hindi", "Bilingual"]} />
                  </div>
                </>
              )}

              {previewPlatform === "facebook" && (
                <div className="space-y-2.5">
                  <SelectField label="Placement" value="Feed" options={["Feed", "Stories", "Reels", "Right Column"]} />
                  <SelectField label="Audience" value="Public" options={["Public", "Friends", "Custom"]} />
                  <SelectField label="CTA Button" value="Learn More" options={["Learn More", "Sign Up", "Shop Now", "Contact Us"]} />
                  <Toggle on={false} onChange={() => {}} label="Link preview" />
                </div>
              )}

              {previewPlatform === "linkedin" && (
                <div className="space-y-2.5">
                  <SelectField label="Post Type" value="Image Post" options={["Image Post", "Video Post", "Article", "Poll"]} />
                  <SelectField label="Company Page" value="Moksha Sewa Foundation" />
                  <TextField label="Headline" value={headline} onChange={setHeadline} />
                  <SelectField label="Audience" value="Public" options={["Public", "Connections", "Company followers"]} />
                  <SelectField label="CTA" value="Learn More" options={["Learn More", "Sign Up", "Register", "Download"]} />
                </div>
              )}

              {previewPlatform === "google-business" && (
                <div className="space-y-2.5">
                  <SelectField label="Post Type" value="Update" options={["Update", "Event", "Offer", "Product"]} />
                  <TextField label="Title" value="" placeholder="Post title" onChange={() => {}} />
                  <SelectField label="CTA" value="Learn More" options={["Learn More", "Sign Up", "Call Now", "Order Online"]} />
                </div>
              )}

              {previewPlatform === "whatsapp" && (
                <div className="space-y-2.5">
                  <SelectField label="Message Type" value="Template" options={["Template", "Media", "Text"]} />
                  <SelectField label="Template" value="Clean Ganga Alert" />
                  <SelectField label="Language" value="English" options={["English", "Hindi", "Bilingual"]} />
                  <SelectField label="Audience Segment" value="All Subscribers" />
                  <div className="rounded-lg bg-emerald-50 p-2 text-[10px] font-bold text-emerald-700">Template Approved</div>
                </div>
              )}

              {previewPlatform === "youtube" && (
                <div className="space-y-2.5">
                  <SelectField label="Content Type" value={postType === "reel" ? "Short" : "Video"} options={["Video", "Short", "Live"]} />
                  <TextField label="Title" value="" placeholder="Video title" onChange={() => {}} />
                  <TextField label="Tags" value="" placeholder="Add tags" onChange={() => {}} />
                  <SelectField label="Visibility" value="Public" options={["Public", "Unlisted", "Private"]} />
                  <Toggle on={false} onChange={() => {}} label="Made for kids" />
                </div>
              )}

              {previewPlatform === "website" && (
                <div className="space-y-2.5">
                  <SelectField label="Content Type" value="Blog" options={["Blog", "Landing Page", "Product Page", "News"]} />
                  <TextField label="Title" value="" placeholder="Blog title" onChange={() => {}} />
                  <TextField label="Slug" value="" placeholder="blog-slug" onChange={() => {}} />
                  <TextField label="SEO Title" value="" placeholder="SEO optimized title" onChange={() => {}} />
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Schedule */}
        <Card>
          <div className="flex items-center gap-1.5 border-b border-[#EDF1F5] pb-2 mb-2">
            <Clock3 className="size-3.5 text-[#7A87A0]" />
            <span className="text-[11px] font-bold text-[#7A87A0]">Schedule</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {([["now", "Now"], ["later", "Schedule"], ["draft", "Draft"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setSchedule(val)} className={cn("rounded-lg border py-1.5 text-[10.5px] font-semibold transition", schedule === val ? "border-[#1769DF] bg-[#F0F6FF] text-[#172044]" : "border-[#E2E8F0] text-[#687797] hover:bg-slate-50")}>
                {label}
              </button>
            ))}
          </div>
          {schedule === "later" && (
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              <SelectField label="Date" value="Sep 14, 2026" />
              <SelectField label="Time" value="11:00 AM" />
            </div>
          )}
          <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 ring-1 ring-amber-100">
            <Clock3 className="mt-px size-3 shrink-0 text-amber-600" />
            <p className="text-[10.5px] leading-4 text-amber-900"><b>Best time:</b> Today 11 AM – 1 PM</p>
          </div>
        </Card>

        {/* Approval */}
        <Card>
          <SelectField label="Approver" value="Content Team" />
          <div className="mt-1.5 flex gap-1">
            <button className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-[#E2E8F0] text-[10.5px] font-bold text-[#687797] hover:bg-slate-50">Save Draft</button>
            <button className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-[#1769DF] text-[10.5px] font-bold text-white hover:bg-[#1259BD]">Send for Review</button>
          </div>
        </Card>
      </div>

      {/* ─── RIGHT: Preview + Checklist ─── */}
      <div className="space-y-2.5 xl:sticky xl:top-4">
        <ContentPreviewPanel platform={previewPlatform} setPlatform={setPreviewPlatform} channels={channels} />
        <ContentChecklist
          checks={[
            { label: "Client selected", done: true },
            { label: "Campaign selected", done: true },
            { label: "Content type selected", done: true },
            { label: "Caption added", done: caption.length > 0 },
            { label: "Media added", done: MOCK_MEDIA.length > 0 },
            { label: "Ratio selected", done: !!ratio },
            { label: "Channels selected", done: channels.length > 0 },
            { label: "Platform settings configured", done: true },
            { label: "Hashtags added", done: hashtags.length > 0 },
            { label: "Schedule configured", done: !!schedule },
          ]}
        />
        <div className="flex gap-1">
          <button className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-[#E2E8F0] text-[10.5px] font-bold text-[#687797] hover:bg-slate-50"><Download className="size-3" /> Export</button>
          <button className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-[#EB0711] text-[10.5px] font-bold text-white shadow-sm transition hover:bg-[#D60811]"><Send className="size-3" /> Publish</button>
        </div>
      </div>
    </div>
  );
}
