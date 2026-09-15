"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  X,
  Sparkles,
  ImageIcon,
  Video,
  FileText,
  BarChart3,
  Calendar,
  Award,
  Globe2,
  Plus,
  Trash2,
  Send,
  Clock,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import RichTextEditor from "@/components/layout/rich-text-editor";

const getPlainText = (html: string) => {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
};

type AttachmentType = "none" | "media" | "video" | "document" | "poll" | "event" | "occasion";

const hashtagPresets = [
  "#CleanGanga",
  "#NamoGangeTrust",
  "#EnvironmentalCSR",
  "#VolunteerIndia",
  "#SocialImpact",
  "#GreenInitiative",
  "#RiverConservation",
];

const aiPrompts = [
  "Create an engaging announcement about our upcoming Ganga Cleanup Drive",
  "Write a heartfelt thank-you post for our 500+ volunteers",
  "Draft a professional CSR partnership appeal for corporate sponsors",
];

/* ─── SHARED BOX (Matching LinkedIn & WhatsApp) ─── */
function Box({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs flex flex-col transition-all hover:shadow-md", className)}>
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-800 uppercase">{title}</h2>
        {action && <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">{action}</div>}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">{children}</div>
    </section>
  );
}

export default function LinkedInCreatePostPage() {
  const router = useRouter();
  const [author, setAuthor] = useState<"company" | "personal">("company");
  const [visibility, setVisibility] = useState<"anyone" | "connections" | "group">("anyone");
  const [content, setContent] = useState(
    "<p>🌊 We are excited to announce the next phase of our <b>Clean Ganga Initiative</b>!</p><p><br></p><p>Together with <b>500+ passionate volunteers</b>, Namo Gange Trust has restored 12km of riverfront lines across Delhi &amp; Uttarakhand. Join us this Sunday for our community awareness drive.</p><p><br></p><p><span class=\"text-[#0A66C2] font-semibold\">#CleanGanga #NamoGangeTrust #SocialImpact</span></p>"
  );
  const [attachmentType, setAttachmentType] = useState<AttachmentType>("media");

  // Media Attachment State
  const [mediaList, setMediaList] = useState<string[]>([
    "/campaigns/river-cleanup.jpg",
    "/campaigns/clean-river.jpg",
  ]);

  // Video Attachment State
  const [videoTitle] = useState("Clean_Ganga_Impact_2025.mp4");

  // Document PDF State
  const [docName] = useState("Namo_Gange_Impact_Report_2025.pdf");
  const [docPage, setDocPage] = useState(1);
  const totalDocPages = 5;

  // Poll State
  const [pollQuestion, setPollQuestion] = useState("Which river conservation activity would you participate in?");
  const [pollOptions, setPollOptions] = useState(["Riverfront Cleaning Drive", "Tree Plantation", "Awareness Workshop", "Donation Drive"]);
  const [pollDuration] = useState("7 days");

  // Event State
  const [eventTitle, setEventTitle] = useState("Namo Gange Mega Volunteer Drive 2025");
  const [eventDate, setEventDate] = useState("2025-04-20");
  const [eventTime, setEventTime] = useState("10:00 AM");

  // Occasion Badge State
  const [occasionBadge, setOccasionBadge] = useState("We're Hiring 🎯");

  // Scheduling State
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("2025-04-18");
  const [scheduleTime, setScheduleTime] = useState("10:00 AM");

  // AI Generation State
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handleAddHashtag = (tag: string) => {
    if (!content.includes(tag)) {
      if (content.includes("</p>")) {
        const lastPIdx = content.lastIndexOf("</p>");
        const before = content.slice(0, lastPIdx);
        const after = content.slice(lastPIdx);
        setContent(`${before} <span class="text-[#0A66C2] font-semibold">${tag}</span>${after}`);
      } else {
        setContent((prev) => `${prev} <span class="text-[#0A66C2] font-semibold">${tag}</span>`);
      }
    }
  };

  const handleAiGenerate = (promptText?: string) => {
    setIsAiGenerating(true);
    setTimeout(() => {
      setIsAiGenerating(false);
      const generatedHtml = promptText
        ? `<p>✨ <b>${promptText}</b></p><p><br></p><p>Join <b>Namo Gange Trust</b> as we lead impactful riverfront conservation efforts across North India. Every action counts! Learn more and register your participation today.</p><p><br></p><p><span class="text-[#0A66C2] font-semibold">#CleanGanga #NamoGangeTrust #VolunteerIndia #CSR</span></p>`
        : `<p>✨ <b>Namo Gange Trust</b> is driving sustainable river conservation and community health awareness. Over <b>12,000 lives impacted</b> this quarter! Let's shape a cleaner future together.</p><p><br></p><p><span class="text-[#0A66C2] font-semibold">#NamoGangeTrust #CleanGanga #SocialImpact</span></p>`;
      setContent(generatedHtml);
      toast.success("AI Caption Generated!");
    }, 800);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`]);
    }
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const handlePublish = () => {
    if (isScheduling) {
      toast.success("Post Scheduled Successfully!", {
        description: `Scheduled for ${scheduleDate} at ${scheduleTime} on LinkedIn.`,
      });
    } else {
      toast.success("Published to LinkedIn Page!", {
        description: "Your post is now live on Namo Gange Trust Official LinkedIn.",
      });
    }
    router.push("/admin/linkedin");
  };

  return (
    <div className="pb-8">
      {/* Top Composer Action Bar */}
      <div className="-mx-4 -mt-5 mb-2 bg-white px-4 py-3 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6 shadow-xs border-b border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/linkedin")}
              className="flex size-8 items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              title="Back to LinkedIn Dashboard"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900">Create LinkedIn Post</h1>
                <span className="inline-flex items-center gap-1 rounded-sm bg-blue-50 px-2 py-0.5 text-[10.5px] font-bold text-[#0A66C2] border border-blue-100">
                  Draft
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Draft, format with RichText, attach media, and schedule directly to Namo Gange Trust LinkedIn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/admin/linkedin")}
              className="flex h-8 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={handlePublish}
              className="flex h-8 items-center gap-1.5 rounded-sm bg-[#0A66C2] hover:bg-[#084e96] px-4 text-xs font-bold text-white shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              {isScheduling ? <CalendarDays className="size-3.5" /> : <Send className="size-3.5" />}
              <span>{isScheduling ? "Schedule Post" : "Publish Post"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-2 bg-slate-50/30 p-1 rounded-sm">

        {/* 2-Column Grid (Editor & Live Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">
          {/* Left Column: Editor Controls */}
          <div className="space-y-2 lg:col-span-7">
            {/* Author & Visibility Selector Box */}
            <Box title="Author & Visibility">
              <div className="p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative size-9 shrink-0">
                    <Image
                      src="/campaigns/river-cleanup.jpg"
                      alt="Namo Gange"
                      fill
                      className="rounded-sm object-cover border border-slate-200 shadow-2xs"
                    />
                  </div>
                  <div>
                    <select
                      value={author}
                      onChange={(e) => setAuthor(e.target.value as "company" | "personal")}
                      className="text-xs font-bold text-slate-900 bg-transparent border-0 outline-none cursor-pointer p-0"
                    >
                      <option value="company">Namo Gange Trust (Company Page)</option>
                      <option value="personal">Manish Sirohi (Personal Profile)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 font-medium">42,800 Followers • Official Partner</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-2.5 py-1 shadow-2xs">
                  <Globe2 className="size-3 text-[#0A66C2]" />
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="text-xs font-bold text-slate-700 bg-transparent border-0 outline-none cursor-pointer pr-1"
                  >
                    <option value="anyone">Anyone (Public)</option>
                    <option value="connections">Connections Only</option>
                    <option value="group">Group Members</option>
                  </select>
                </div>
              </div>
            </Box>

            {/* Post Content Area with RichTextEditor */}
            <Box
              title="Post Caption"
              action={
                <span className={cn("text-[11px] font-bold tabular-nums", getPlainText(content).length > 2800 ? "text-rose-600" : "text-slate-500")}>
                  {getPlainText(content).length} / 3,000
                </span>
              }
            >
              <div className="p-3 space-y-2.5">
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="What do you want to talk about? Share an update, article, or announcement..."
                  minHeight="140px"
                  className="rounded-sm border-slate-200"
                />

                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                  <button
                    onClick={() => handleAiGenerate()}
                    disabled={isAiGenerating}
                    className="flex items-center gap-1.5 rounded-sm bg-purple-50 border border-purple-200 px-2.5 py-1 text-purple-700 font-bold hover:bg-purple-100 transition-all shadow-2xs cursor-pointer"
                  >
                    <Sparkles className={cn("size-3.5 text-purple-600", isAiGenerating && "animate-spin")} />
                    <span>{isAiGenerating ? "Writing..." : "AI Caption Assistant"}</span>
                  </button>

                  <div className="flex items-center gap-1 text-slate-400 text-[10.5px]">
                    <Clock className="size-3" /> Auto-saved draft
                  </div>
                </div>
              </div>
            </Box>

            {/* AI Prompts & Hashtags Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Box title="AI Quick Prompts">
                <div className="p-2.5 space-y-1.5">
                  {aiPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAiGenerate(p)}
                      className="w-full text-left rounded-sm border border-purple-100 bg-purple-50/50 p-1.5 text-[10.5px] font-semibold text-purple-800 hover:bg-purple-100/80 transition-all truncate block cursor-pointer"
                    >
                      + {p}
                    </button>
                  ))}
                </div>
              </Box>

              <Box title="Suggested Hashtags">
                <div className="p-2.5 flex flex-wrap gap-1.5">
                  {hashtagPresets.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleAddHashtag(tag)}
                      className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-[#0A66C2] transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </Box>
            </div>

            {/* Attachment Type Selector */}
            <Box title="Media & Attachments">
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { id: "media", label: "Photo", icon: ImageIcon, color: "text-blue-600" },
                    { id: "video", label: "Video", icon: Video, color: "text-emerald-600" },
                    { id: "document", label: "PDF Slide", icon: FileText, color: "text-purple-600" },
                    { id: "poll", label: "Poll", icon: BarChart3, color: "text-amber-600" },
                    { id: "event", label: "Event", icon: Calendar, color: "text-rose-600" },
                    { id: "occasion", label: "Badge", icon: Award, color: "text-teal-600" },
                  ].map((att) => (
                    <button
                      key={att.id}
                      onClick={() => setAttachmentType(att.id as AttachmentType)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-sm border text-center transition-all cursor-pointer",
                        attachmentType === att.id
                          ? "border-[#0A66C2] bg-blue-50/70 font-bold shadow-2xs text-[#0A66C2]"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <att.icon className={cn("size-4 mb-1", att.color)} />
                      <span className="text-[10.5px] font-semibold leading-tight">{att.label}</span>
                    </button>
                  ))}
                </div>

                {/* Photo Gallery Builder */}
                {attachmentType === "media" && (
                  <div className="space-y-2 rounded-sm border border-slate-100 bg-slate-50/50 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon className="size-3.5 text-blue-600" /> Photo Attachments ({mediaList.length})
                      </span>
                      <button
                        onClick={() => setMediaList([...mediaList, "/campaigns/ganga-tourism.jpg"])}
                        className="text-[11px] font-bold text-[#0A66C2] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="size-3" /> Add Image
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {mediaList.map((img, i) => (
                        <div key={i} className="relative aspect-video rounded-sm overflow-hidden border border-slate-200 group">
                          <Image src={img} alt="Uploaded photo" fill className="object-cover" />
                          <button
                            onClick={() => setMediaList(mediaList.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 grid size-5 place-items-center rounded-sm bg-slate-900/80 text-white hover:bg-rose-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video Builder */}
                {attachmentType === "video" && (
                  <div className="flex items-center gap-3 p-2.5 rounded-sm border border-slate-200 bg-slate-50">
                    <div className="grid size-9 place-items-center rounded-sm bg-emerald-50 text-emerald-600 font-bold">
                      <Video className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{videoTitle}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">1080p Full HD • 45 Seconds • 24.8 MB</p>
                    </div>
                    <button className="text-xs font-bold text-rose-600 hover:underline cursor-pointer">Replace</button>
                  </div>
                )}

                {/* PDF Document Builder */}
                {attachmentType === "document" && (
                  <div className="rounded-sm border border-purple-200 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-purple-600" />
                        <span className="text-xs font-bold text-slate-800">{docName}</span>
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-sm">Page {docPage} of {totalDocPages}</span>
                    </div>

                    <div className="aspect-video rounded-sm bg-linear-to-tr from-slate-900 to-indigo-950 p-4 text-white flex flex-col justify-between relative">
                      <div className="flex justify-between items-center text-[10px] font-bold tracking-wider uppercase text-purple-300">
                        <span>Namo Gange Trust</span>
                        <span>Slide {docPage}/{totalDocPages}</span>
                      </div>
                      <div className="my-auto text-center space-y-1">
                        <h4 className="text-sm font-bold">Clean Ganga Impact Report 2025</h4>
                        <p className="text-[11px] text-slate-300">Section {docPage}: Key Milestones & Volunteer Achievements</p>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-700/60 pt-2 text-[9px] text-slate-400">
                        <span>Swipe to view slides →</span>
                        <span>www.namogangetrust.org</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        disabled={docPage === 1}
                        onClick={() => setDocPage((p) => Math.max(1, p - 1))}
                        className="flex items-center gap-1 text-xs font-bold text-slate-600 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="size-3.5" /> Previous Slide
                      </button>
                      <button
                        disabled={docPage === totalDocPages}
                        onClick={() => setDocPage((p) => Math.min(totalDocPages, p + 1))}
                        className="flex items-center gap-1 text-xs font-bold text-[#0A66C2] disabled:opacity-40 cursor-pointer"
                      >
                        Next Slide <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Poll Builder */}
                {attachmentType === "poll" && (
                  <div className="space-y-2 rounded-sm border border-slate-100 bg-slate-50/50 p-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600">Question</label>
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs font-semibold rounded-sm border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600">Options</label>
                      {pollOptions.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...pollOptions];
                              newOpts[i] = e.target.value;
                              setPollOptions(newOpts);
                            }}
                            className="flex-1 h-8 px-2.5 text-xs rounded-sm border border-slate-200 bg-white"
                          />
                          {pollOptions.length > 2 && (
                            <button onClick={() => handleRemovePollOption(i)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {pollOptions.length < 4 && (
                        <button onClick={handleAddPollOption} className="text-xs font-bold text-[#0A66C2] hover:underline flex items-center gap-1 pt-0.5 cursor-pointer">
                          <Plus className="size-3" /> Add Option
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Event Builder */}
                {attachmentType === "event" && (
                  <div className="space-y-2 rounded-sm border border-slate-100 bg-slate-50/50 p-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600">Event Title</label>
                      <input
                        type="text"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs font-semibold rounded-sm border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Event Date</label>
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full h-8 px-2 text-xs rounded-sm border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Start Time</label>
                        <input
                          type="text"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          className="w-full h-8 px-2 text-xs rounded-sm border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Occasion Badge Builder */}
                {attachmentType === "occasion" && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      "We're Hiring 🎯",
                      "Project Milestone 🎉",
                      "Welcome to Team 🤝",
                      "Award Won 🏆",
                      "Work Anniversary 👏",
                      "New Initiative 🚀",
                    ].map((b) => (
                      <button
                        key={b}
                        onClick={() => setOccasionBadge(b)}
                        className={cn(
                          "p-2 text-xs font-bold rounded-sm border transition-all text-left cursor-pointer",
                          occasionBadge === b
                            ? "bg-teal-50 border-teal-500 text-teal-900 shadow-2xs"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Box>

            {/* Schedule Section Box */}
            <Box title="Publishing & Schedule">
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-[#0A66C2]" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Schedule for Later</p>
                      <p className="text-[10.5px] text-slate-500 font-medium">Auto-publish at optimal LinkedIn engagement hours</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isScheduling}
                    onChange={(e) => setIsScheduling(e.target.checked)}
                    className="size-4 rounded-sm accent-[#0A66C2] cursor-pointer"
                  />
                </div>

                {isScheduling && (
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-sm border border-blue-200 bg-blue-50/50">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">Schedule Date</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full h-8 px-2 text-xs font-bold rounded-sm border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">Schedule Time</label>
                      <input
                        type="text"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full h-8 px-2 text-xs font-bold rounded-sm border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Box>
          </div>

          {/* Right Column: Live LinkedIn Feed Preview */}
          <div className="space-y-2 lg:col-span-5">
            <Box
              title="Live LinkedIn Feed Preview"
              action={
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                  Exact Desktop Render
                </span>
              }
            >
              <div className="p-3">
                {/* LinkedIn Feed Post Container */}
                <div className="rounded-sm border border-slate-200 bg-white shadow-2xs overflow-hidden text-slate-900">
                  {/* Post Author Header */}
                  <div className="flex items-start justify-between p-3 border-b border-slate-100">
                    <div className="flex items-start gap-2.5">
                      <div className="relative size-9 shrink-0">
                        <Image
                          src="/campaigns/river-cleanup.jpg"
                          alt="Author"
                          fill
                          className="rounded-sm object-cover border border-slate-200"
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {author === "company" ? "Namo Gange Trust Official" : "Manish Sirohi"}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium leading-tight">
                          {author === "company" ? "Non-profit Organization • 42.8K Followers" : "Co-Founder & Director at EnCodency"}
                        </p>
                        <p className="text-[9.5px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>Just now</span> • <Globe2 className="size-2.5" />
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#0A66C2] hover:underline cursor-pointer">+ Follow</span>
                  </div>

                  {/* Post Content */}
                  <div
                    className="px-3 py-2.5 text-xs leading-relaxed text-slate-800 wrap-break-word [&_p]:mb-2 [&_p:last-child]:mb-0 [&_b]:font-bold [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-[#0A66C2] [&_a]:underline"
                    dangerouslySetInnerHTML={{
                      __html: content || "<p class='text-slate-400'>Your post caption will appear here...</p>",
                    }}
                  />

                  {/* Media Attachment Previews */}
                  {attachmentType === "media" && mediaList.length > 0 && (
                    <div className="grid grid-cols-2 gap-0.5 bg-slate-100 border-y border-slate-100">
                      {mediaList.map((img, idx) => (
                        <div key={idx} className="relative aspect-video">
                          <Image src={img} alt="Post media" fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Poll Preview */}
                  {attachmentType === "poll" && (
                    <div className="p-3 bg-slate-50 border-y border-slate-200 space-y-1.5">
                      <p className="text-xs font-bold text-slate-900">{pollQuestion}</p>
                      <div className="space-y-1.5">
                        {pollOptions.map((opt, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-sm border border-slate-200 bg-white text-xs font-semibold text-slate-700">
                            <span>{opt}</span>
                            <span className="text-[10px] text-slate-400 font-bold">0%</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold">0 votes • {pollDuration} left</p>
                    </div>
                  )}

                  {/* Event Preview */}
                  {attachmentType === "event" && (
                    <div className="p-3 bg-blue-50/60 border-y border-blue-200 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-rose-600" />
                        <span className="text-xs font-bold text-slate-900">{eventTitle}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">📅 {eventDate} at {eventTime}</p>
                    </div>
                  )}

                  {/* Occasion Badge Preview */}
                  {attachmentType === "occasion" && (
                    <div className="p-3 bg-teal-50 border-y border-teal-200 text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-800 bg-teal-100/80 px-3 py-1 rounded-sm">
                        {occasionBadge}
                      </span>
                    </div>
                  )}

                  {/* Interaction Footer Stats */}
                  <div className="flex items-center justify-between px-3 py-1.5 text-[10.5px] text-slate-500 font-medium border-b border-slate-100">
                    <span className="flex items-center gap-1">
                      <span className="grid size-4 place-items-center rounded-sm bg-[#0A66C2] text-white text-[8px]">👍</span>
                      <span className="font-bold text-slate-700">Namo Gange Trust & 12 others</span>
                    </span>
                    <span>4 comments • 2 reposts</span>
                  </div>

                  {/* LinkedIn Action Buttons */}
                  <div className="grid grid-cols-4 text-center py-1 text-xs font-bold text-slate-600 border-t border-slate-100">
                    <button className="flex items-center justify-center gap-1 py-1 hover:bg-slate-50 transition-colors">
                      <ThumbsUp className="size-3.5" /> Like
                    </button>
                    <button className="flex items-center justify-center gap-1 py-1 hover:bg-slate-50 transition-colors">
                      <MessageSquare className="size-3.5" /> Comment
                    </button>
                    <button className="flex items-center justify-center gap-1 py-1 hover:bg-slate-50 transition-colors">
                      <Repeat2 className="size-3.5" /> Repost
                    </button>
                    <button className="flex items-center justify-center gap-1 py-1 hover:bg-slate-50 transition-colors">
                      <Send className="size-3.5" /> Send
                    </button>
                  </div>
                </div>
              </div>
            </Box>

            {/* Sticky Action Footer Card */}
            <Box title="Actions">
              <div className="p-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => toast.info("Post draft saved successfully!")}
                  className="h-8 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Save Draft
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push("/admin/linkedin")}
                    className="h-8 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    className="h-8 px-4 text-xs font-bold rounded-sm bg-[#0A66C2] hover:bg-[#084e96] text-white transition-all shadow-xs flex items-center gap-1.5 active:scale-98 cursor-pointer"
                  >
                    <Send className="size-3" />
                    <span>{isScheduling ? "Schedule Post" : "Post Now"}</span>
                  </button>
                </div>
              </div>
            </Box>
          </div>
        </div>
      </div>
    </div>
  );
}
