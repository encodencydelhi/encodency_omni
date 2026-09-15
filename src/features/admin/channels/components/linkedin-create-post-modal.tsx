"use client";

import { useState } from "react";
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
  Share2,
  Bot,
  Hash,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

interface LinkedInCreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export function LinkedInCreatePostModal({ isOpen, onClose }: LinkedInCreatePostModalProps) {
  const [author, setAuthor] = useState<"company" | "personal">("company");
  const [visibility, setVisibility] = useState<"anyone" | "connections" | "group">("anyone");
  const [content, setContent] = useState(
    "🌊 We are excited to announce the next phase of our Clean Ganga Initiative!\n\nTogether with 500+ passionate volunteers, Namo Gange Trust has restored 12km of riverfront lines across Delhi & Uttarakhand. Join us this Sunday for our community awareness drive.\n\n#CleanGanga #NamoGangeTrust #SocialImpact"
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
  const [pollDuration, setPollDuration] = useState("7 days");

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
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  if (!isOpen) return null;

  const handleAddHashtag = (tag: string) => {
    if (!content.includes(tag)) {
      setContent((prev) => `${prev} ${tag}`);
    }
  };

  const handleAiGenerate = (promptText?: string) => {
    setIsAiGenerating(true);
    setTimeout(() => {
      setIsAiGenerating(false);
      const generatedText = promptText
        ? `✨ ${promptText}:\n\nJoin Namo Gange Trust as we lead impactful riverfront conservation efforts across North India. Every action counts! Learn more and register your participation today.\n\n#CleanGanga #NamoGangeTrust #VolunteerIndia #CSR`
        : "✨ Namo Gange Trust is driving sustainable river conservation and community health awareness. Over 12,000 lives impacted this quarter! Let's shape a cleaner future together.\n\n#NamoGangeTrust #CleanGanga #SocialImpact";
      setContent(generatedText);
      toast.success("AI Caption Generated!");
    }, 1000);
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden transition-all my-auto">
        
        {/* Modal Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[#0A66C2] text-white shadow-xs">
              <Share2 className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Create LinkedIn Post</h2>
              <p className="text-[11px] text-slate-500 font-medium">Publish or schedule content directly to LinkedIn</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs (Desktop/Mobile preview toggle) */}
            <div className="flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-bold">
              <button
                onClick={() => setActiveTab("write")}
                className={cn(
                  "rounded-md px-3 py-1 transition-all",
                  activeTab === "write" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "rounded-md px-3 py-1 transition-all",
                  activeTab === "preview" ? "bg-white text-[#0A66C2] shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Live Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 scrollbar-thin">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Main Form Left Column */}
            <div className={cn("space-y-4", activeTab === "preview" ? "lg:col-span-6" : "lg:col-span-7")}>
              
              {/* Author & Visibility Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
                {/* Author selection */}
                <div className="flex items-center gap-2.5">
                  <div className="relative size-9 shrink-0">
                    <Image
                      src="/campaigns/river-cleanup.jpg"
                      alt="Namo Gange"
                      fill
                      className="rounded-full object-cover border border-slate-200 shadow-xs"
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
                    <p className="text-[10.5px] text-slate-500 font-medium">42,800 Followers • Official Partner</p>
                  </div>
                </div>

                {/* Visibility selector */}
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 shadow-2xs">
                  <Globe2 className="size-3.5 text-[#0A66C2]" />
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="text-[11px] font-bold text-slate-700 bg-transparent border-0 outline-none cursor-pointer pr-1"
                  >
                    <option value="anyone">Anyone (Public)</option>
                    <option value="connections">Connections Only</option>
                    <option value="group">Group Members</option>
                  </select>
                </div>
              </div>

              {/* Text Content Area */}
              <div className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2 focus-within:border-[#0A66C2] transition-colors">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What do you want to talk about? Share an update, article, or announcement..."
                  className="w-full min-h-[140px] text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 bg-transparent border-0 outline-none resize-none"
                />
                
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                  {/* AI Assistant Quick Actions */}
                  <button
                    onClick={() => handleAiGenerate()}
                    disabled={isAiGenerating}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 px-2.5 py-1 text-purple-700 font-bold hover:from-purple-100 hover:to-indigo-100 transition-all shadow-2xs"
                  >
                    <Sparkles className={cn("size-3.5 text-purple-600", isAiGenerating && "animate-spin")} />
                    <span>{isAiGenerating ? "Writing..." : "AI Caption Assistant"}</span>
                  </button>

                  <span className={cn("font-bold tabular-nums", content.length > 2800 ? "text-rose-600" : "text-slate-400")}>
                    {content.length} / 3,000
                  </span>
                </div>
              </div>

              {/* Preset AI Prompts */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Bot className="size-3 text-purple-600" /> AI Quick Prompts:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {aiPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAiGenerate(p)}
                      className="rounded-lg border border-purple-100 bg-purple-50/50 px-2.5 py-1 text-[10.5px] font-semibold text-purple-800 hover:bg-purple-100/70 transition-all"
                    >
                      + {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hashtag Presets */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Hash className="size-3 text-[#0A66C2]" /> Suggested Hashtags:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {hashtagPresets.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleAddHashtag(tag)}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-[#0A66C2] transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attachment Type Selector Bar */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Add Media or Interactive Element:</p>
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
                        "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer",
                        attachmentType === att.id
                          ? "border-[#0A66C2] bg-blue-50/60 font-bold shadow-xs"
                          : "border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <att.icon className={cn("size-4 mb-1", att.color)} />
                      <span className="text-[10.5px] font-semibold leading-tight">{att.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Attachment Builder Panel */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 space-y-3">
                
                {/* PHOTO GALLERY BUILDER */}
                {attachmentType === "media" && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon className="size-4 text-blue-600" /> Photo Attachments ({mediaList.length})
                      </span>
                      <button
                        onClick={() => setMediaList([...mediaList, "/campaigns/ganga-tourism.jpg"])}
                        className="text-[11px] font-bold text-[#0A66C2] hover:underline flex items-center gap-1"
                      >
                        <Plus className="size-3" /> Add Image
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {mediaList.map((img, i) => (
                        <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 group">
                          <Image src={img} alt="Uploaded photo" fill className="object-cover" />
                          <button
                            onClick={() => setMediaList(mediaList.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-slate-900/70 text-white hover:bg-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* VIDEO BUILDER */}
                {attachmentType === "video" && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Video className="size-4 text-emerald-600" /> Video Attachment
                    </span>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-white">
                      <div className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">
                        <Video className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{videoTitle}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">1080p Full HD • 45 Seconds • 24.8 MB</p>
                      </div>
                      <button className="text-xs font-bold text-rose-600 hover:underline">Replace</button>
                    </div>
                  </div>
                )}

                {/* PDF CAROUSEL SLIDE DECK */}
                {attachmentType === "document" && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="size-4 text-purple-600" /> PDF Document / Carousel Slide Deck
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">Page {docPage} of {totalDocPages}</span>
                    </div>

                    <div className="rounded-lg border border-purple-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-purple-600" />
                          <span className="text-xs font-bold text-slate-800">{docName}</span>
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">Slide Deck</span>
                      </div>

                      {/* Mock Slide Preview */}
                      <div className="aspect-video rounded-lg bg-gradient-to-tr from-slate-900 to-indigo-950 p-4 text-white flex flex-col justify-between relative">
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
                          className="flex items-center gap-1 text-xs font-bold text-slate-600 disabled:opacity-40"
                        >
                          <ChevronLeft className="size-3.5" /> Previous Slide
                        </button>
                        <button
                          disabled={docPage === totalDocPages}
                          onClick={() => setDocPage((p) => Math.min(totalDocPages, p + 1))}
                          className="flex items-center gap-1 text-xs font-bold text-[#0A66C2] disabled:opacity-40"
                        >
                          Next Slide <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* POLL CREATOR */}
                {attachmentType === "poll" && (
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BarChart3 className="size-4 text-amber-600" /> Create a LinkedIn Poll
                    </span>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Your Question</label>
                        <input
                          type="text"
                          value={pollQuestion}
                          onChange={(e) => setPollQuestion(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600">Options (2 to 4)</label>
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
                              className="flex-1 h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white"
                            />
                            {pollOptions.length > 2 && (
                              <button onClick={() => handleRemovePollOption(i)} className="text-rose-500 hover:text-rose-700">
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {pollOptions.length < 4 && (
                          <button onClick={handleAddPollOption} className="text-xs font-bold text-[#0A66C2] hover:underline flex items-center gap-1 pt-1">
                            <Plus className="size-3" /> Add Option
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="text-[11px] font-bold text-slate-600">Poll Duration</label>
                        <select
                          value={pollDuration}
                          onChange={(e) => setPollDuration(e.target.value)}
                          className="h-7 text-xs font-bold border border-slate-200 bg-white rounded-lg px-2"
                        >
                          <option value="1 day">1 day</option>
                          <option value="3 days">3 days</option>
                          <option value="7 days">7 days</option>
                          <option value="14 days">14 days</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* EVENT CREATOR */}
                {attachmentType === "event" && (
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="size-4 text-rose-600" /> LinkedIn Online / In-person Event
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600">Event Title</label>
                        <input
                          type="text"
                          value={eventTitle}
                          onChange={(e) => setEventTitle(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Event Date</label>
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Start Time</label>
                        <input
                          type="text"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* OCCASION BADGE */}
                {attachmentType === "occasion" && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Award className="size-4 text-teal-600" /> Celebrate an Occasion / Badge
                    </span>
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
                            "p-2 text-xs font-bold rounded-lg border transition-all text-left",
                            occasionBadge === b
                              ? "bg-teal-50 border-teal-500 text-teal-900 shadow-2xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Schedule Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-[#0A66C2]" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Schedule for Later</p>
                    <p className="text-[10.5px] text-slate-500 font-medium">Auto-publish post at peak engagement time</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isScheduling}
                  onChange={(e) => setIsScheduling(e.target.checked)}
                  className="size-4 accent-[#0A66C2] cursor-pointer"
                />
              </div>

              {isScheduling && (
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50/50">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Schedule Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Schedule Time</label>
                    <input
                      type="text"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Live LinkedIn Feed Preview Right Column */}
            <div className={cn("space-y-3", activeTab === "preview" ? "lg:col-span-6" : "lg:col-span-5")}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe2 className="size-3.5 text-[#0A66C2]" /> Live LinkedIn Feed Preview
                </p>
                <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  Exact Desktop Render
                </span>
              </div>

              {/* Exact LinkedIn Feed Post Box */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden text-slate-900">
                {/* Post Author Header */}
                <div className="flex items-start justify-between p-3.5 border-b border-slate-100">
                  <div className="flex items-start gap-2.5">
                    <div className="relative size-10 shrink-0">
                      <Image
                        src="/campaigns/river-cleanup.jpg"
                        alt="Author"
                        fill
                        className="rounded-full object-cover border border-slate-200"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {author === "company" ? "Namo Gange Trust Official" : "Manish Sirohi"}
                      </h4>
                      <p className="text-[10.5px] text-slate-500 font-medium leading-tight">
                        {author === "company" ? "Non-profit Organization • 42.8K Followers" : "Co-Founder & Director at EnCodency"}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>Just now</span> • <Globe2 className="size-2.5" />
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#0A66C2] hover:underline cursor-pointer">+ Follow</span>
                </div>

                {/* Post Content */}
                <div className="px-3.5 py-2.5 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {content || "Your post caption will appear here..."}
                </div>

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
                  <div className="p-3 bg-slate-50 border-y border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-900">{pollQuestion}</p>
                    <div className="space-y-1.5">
                      {pollOptions.map((opt, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700">
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
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-800 bg-teal-100/80 px-3 py-1 rounded-full">
                      {occasionBadge}
                    </span>
                  </div>
                )}

                {/* Interaction Footer Stats */}
                <div className="flex items-center justify-between px-3.5 py-2 text-[10.5px] text-slate-500 font-medium border-b border-slate-100">
                  <span className="flex items-center gap-1">
                    <span className="grid size-4 place-items-center rounded-full bg-[#0A66C2] text-white text-[8px]">👍</span>
                    <span className="font-bold text-slate-700">Namo Gange Trust & 12 others</span>
                  </span>
                  <span>4 comments • 2 reposts</span>
                </div>

                {/* LinkedIn Action Buttons */}
                <div className="grid grid-cols-4 text-center py-1.5 text-xs font-bold text-slate-600 border-t border-slate-100">
                  <button className="flex items-center justify-center gap-1 py-1.5 hover:bg-slate-100/70 transition-colors">
                    <ThumbsUp className="size-3.5" /> Like
                  </button>
                  <button className="flex items-center justify-center gap-1 py-1.5 hover:bg-slate-100/70 transition-colors">
                    <MessageSquare className="size-3.5" /> Comment
                  </button>
                  <button className="flex items-center justify-center gap-1 py-1.5 hover:bg-slate-100/70 transition-colors">
                    <Repeat2 className="size-3.5" /> Repost
                  </button>
                  <button className="flex items-center justify-center gap-1 py-1.5 hover:bg-slate-100/70 transition-colors">
                    <Send className="size-3.5" /> Send
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-5 py-3 shrink-0">
          <button
            onClick={() => toast.info("Post draft saved successfully!")}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Save as Draft
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              className="h-9 px-5 text-xs font-bold rounded-xl bg-[#0A66C2] hover:bg-[#0958A8] text-white transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 active:scale-98"
            >
              <Send className="size-3.5" />
              <span>{isScheduling ? "Schedule Post" : "Post Now"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
