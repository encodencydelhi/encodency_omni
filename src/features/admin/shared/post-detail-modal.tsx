"use client";

import {
  X,
  User,
  CheckCircle,
  Clock,
  Tag,
  Pencil,
  CalendarDays,
  FileText,
  ExternalLink,
  Link2,
  MapPin,
  AlertTriangle,
  MessageSquare,
  Share2,
  Eye,
  Heart,
  Hash,
  Users,
  TrendingUp,
  StickyNote,
} from "lucide-react";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaWhatsapp,
} from "react-icons/fa";

type EventType = "fb" | "ig" | "li" | "yt" | "wa" | "gmb" | "link";

type PostDetailData = {
  name: string;
  time: string;
  type: EventType;
  creator: string;
  approver: string;
  description: string;
  image: string;
  status: "Scheduled" | "Draft" | "Published" | "Pending";
  campaign: string;
  hashtags?: string[];
  location?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  contentType?: string;
  notes?: string;
  engagement?: { likes: number; comments: number; shares: number };
  reach?: string;
  scheduledDate?: string;
};

function PlatformIcon({ type, size = 14 }: { type: EventType; size?: number }) {
  const base =
    "grid h-[16px] w-[16px] shrink-0 place-items-center rounded-[4px] text-white";

  if (type === "fb")
    return (
      <span className={`${base} bg-[#1877f2]`}>
        <FaFacebook size={size} />
      </span>
    );
  if (type === "ig")
    return (
      <span className={`${base} bg-[linear-gradient(135deg,#f58529,#dd2a7b,#8134af)]`}>
        <FaInstagram size={size} />
      </span>
    );
  if (type === "li")
    return (
      <span className={`${base} bg-[#0a66c2]`}>
        <FaLinkedin size={size} />
      </span>
    );
  if (type === "yt")
    return (
      <span className={`${base} bg-[#e6212a]`}>
        <FaYoutube size={size} />
      </span>
    );
  if (type === "wa")
    return (
      <span className={`${base} bg-[#16b866]`}>
        <FaWhatsapp size={size} />
      </span>
    );
  if (type === "gmb")
    return (
      <span className="grid h-[16px] w-[16px] shrink-0 place-items-center rounded-[4px] border border-[#dfe4ec] bg-white text-[10px] font-[850] text-[#4285f4]">
        G
      </span>
    );
  return (
    <span className="grid h-[16px] w-[16px] shrink-0 place-items-center rounded-[4px] bg-[#edf1f6] text-[#4b5b73]">
      <ExternalLink size={size} strokeWidth={2.2} />
    </span>
  );
}

function getPlatformLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    fb: "Facebook",
    ig: "Instagram",
    li: "LinkedIn",
    yt: "YouTube",
    wa: "WhatsApp",
    gmb: "Google My Business",
    link: "Website",
  };
  return labels[type];
}

function getPlatformColor(type: EventType): { bg: string; text: string } {
  const colors: Record<EventType, { bg: string; text: string }> = {
    fb: { bg: "bg-[#e8f0fe]", text: "text-[#1877f2]" },
    ig: { bg: "bg-[#fbe8f3]", text: "text-[#7a2fc0]" },
    li: { bg: "bg-[#e8f4fd]", text: "text-[#0a66c2]" },
    yt: { bg: "bg-[#fde8e8]", text: "text-[#e6212a]" },
    wa: { bg: "bg-[#e6f9ef]", text: "text-[#16b866]" },
    gmb: { bg: "bg-[#e8f0fe]", text: "text-[#4285f4]" },
    link: { bg: "bg-[#f0eaff]", text: "text-[#8055d2]" },
  };
  return colors[type];
}

function getStatusClasses(status: string): string {
  switch (status) {
    case "Scheduled":
      return "bg-[#eaf4ff] text-[#2874cc]";
    case "Draft":
      return "bg-[#eef1f5] text-[#65738a]";
    case "Published":
      return "bg-[#e5f7ef] text-[#078359]";
    default:
      return "bg-[#fff8e1] text-[#b8860b]";
  }
}

function InstagramPreview({ event }: { event: PostDetailData }) {
  return (
    <div className="flex h-full w-full max-w-none flex-col overflow-hidden rounded-[10px] border border-[#e4e8ef] bg-white shadow-sm">
      <div className="flex items-center justify-between px-[10px] pt-[8px] pb-[6px]">
        <div className="flex items-center gap-[8px]">
          <div className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5]">
            <FaInstagram size={14} className="text-white" />
          </div>
          <span className="text-[12px] font-[650] text-[#111827]">Instagram</span>
        </div>
        <div className="flex items-center gap-[2px]">
          <span className="h-[3px] w-[3px] rounded-full bg-[#111827]" />
          <span className="h-[3px] w-[3px] rounded-full bg-[#111827]" />
          <span className="h-[3px] w-[3px] rounded-full bg-[#111827]" />
        </div>
      </div>

      <div className="relative mx-[10px] flex-1 min-h-0 overflow-hidden bg-[#edf2f7]">
        <img src={event.image} alt={event.name} className="h-full w-full object-cover" />
      </div>

      <div className="flex items-center justify-between px-[12px] pt-[8px]">
        <div className="flex items-center gap-[12px]">
          <button type="button" className="text-[#ef2029]">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
              <path d="M20.8 8.8c0 5.5-8.8 10.4-8.8 10.4S3.2 14.3 3.2 8.8A4.8 4.8 0 0 1 8 4c1.7 0 3.2.9 4 2.2A4.6 4.6 0 0 1 16 4a4.8 4.8 0 0 1 4.8 4.8Z" />
            </svg>
          </button>
          <button type="button" className="text-[#111827]">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5c-1.4 0-2.7-.3-3.8-.9L4 19.5l1.4-3.8A7.2 7.2 0 0 1 4.5 12c0-4.1 3.4-7.5 7.5-7.5s8 2.9 8 7Z" />
            </svg>
          </button>
          <button type="button" className="text-[#111827]">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
              <path d="m21 3-7.4 18-3.5-7.1L3 10.4 21 3Z" />
            </svg>
          </button>
        </div>
        <button type="button" className="text-[#111827]">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />
          </svg>
        </button>
      </div>

      <div className="px-[12px] pt-[6px] text-[11px] font-[700] text-[#1c2743]">
        1,246 likes
      </div>

      <div className="px-[10px] pb-[8px] pt-[4px] text-[10px] leading-[1.4] text-[#29354f]">
        <span className="font-[700]">{event.campaign}</span>{" "}
        A glimpse of our team in action!
        <br />
        <span className="text-[#1268d4]">#CleanGanga2025 #BehindTheScenes</span>
      </div>
    </div>
  );
}

function FacebookPreview({ event }: { event: PostDetailData }) {
  return (
    <div className="flex h-full w-full max-w-none flex-col overflow-hidden rounded-[10px] border border-[#e4e8ef] bg-white shadow-sm">
      <div className="flex items-center gap-[8px] px-[10px] pt-[8px] pb-[6px]">
        <div className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[#1877f2]">
          <FaFacebook size={14} className="text-white" />
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-[650] text-[#1c2743]">{event.campaign}</span>
          <span className="text-[9px] text-[#65738a]">{event.time}</span>
        </div>
      </div>
      <div className="px-[12px] pb-[8px] text-[10px] leading-[1.4] text-[#29354f]">
        {event.description}
      </div>
      <div className="relative mx-[10px] aspect-video overflow-hidden bg-[#edf2f7]">
        <img src={event.image} alt={event.name} className="h-full w-full object-cover" />
      </div>
      <div className="flex items-center justify-between px-[12px] py-[8px] text-[10px] text-[#65738a]">
        <span>👍 856</span>
        <span>42 Comments · 18 Shares</span>
      </div>
    </div>
  );
}

function LinkedInPreview({ event }: { event: PostDetailData }) {
  return (
    <div className="flex h-full w-full max-w-none flex-col overflow-hidden rounded-[10px] border border-[#e4e8ef] bg-white shadow-sm">
      <div className="flex items-center gap-[8px] px-[10px] pt-[8px] pb-[6px]">
        <div className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[#0a66c2]">
          <FaLinkedin size={14} className="text-white" />
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-[650] text-[#1c2743]">{event.campaign}</span>
          <span className="text-[9px] text-[#65738a]">{event.time}</span>
        </div>
      </div>
      <div className="px-[12px] pb-[8px] text-[10px] leading-[1.4] text-[#29354f]">
        {event.description}
      </div>
      <div className="relative mx-[10px] flex-1 min-h-0 overflow-hidden bg-[#edf2f7]">
        <img src={event.image} alt={event.name} className="h-full w-full object-cover" />
      </div>
      <div className="px-[12px] py-[8px] text-[10px] text-[#65738a]">
        1,246 reactions · 42 comments
      </div>
    </div>
  );
}

function YouTubePreview({ event }: { event: PostDetailData }) {
  const isShort = /short/i.test(event.name);
  return (
    <div className="flex h-full w-full max-w-none flex-col overflow-hidden rounded-[10px] border border-[#e4e8ef] bg-white shadow-sm">
      <div className={`relative mx-[10px] overflow-hidden bg-[#0f0f0f] ${isShort ? "aspect-[9/16] max-h-[400px]" : "aspect-video"}`}>
        <img src={event.image} alt={event.name} className="h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid h-[44px] w-[44px] place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="h-[20px] w-[20px] pl-1" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-[6px] py-[2px] text-[9px] text-white">
          {isShort ? "0:30" : "3:45"}
        </span>
        {isShort && (
          <span className="absolute top-2 right-2 rounded bg-[#e6212a] px-[6px] py-[2px] text-[8px] font-[650] text-white">
            SHORT
          </span>
        )}
      </div>
      <div className="px-[12px] pt-[8px]">
        <span className="block text-[11px] font-[700] text-[#1c2743]">{event.name}</span>
        <span className="block text-[9px] text-[#65738a]">{event.campaign} · {isShort ? "2.1M views" : "12K views"}</span>
      </div>
      <div className="px-[12px] pb-[10px] pt-[4px] text-[10px] leading-[1.4] text-[#52617a]">
        {event.description}
      </div>
    </div>
  );
}

function WhatsAppPreview({ event }: { event: PostDetailData }) {
  return (
    <div className="flex h-full w-full max-w-none flex-col overflow-hidden rounded-[10px] bg-[#e5ddd5] shadow-sm">
      <div className="bg-[#075e54] px-[12px] py-[10px]">
        <div className="flex items-center gap-[8px]">
          <div className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[#16b866]">
            <FaWhatsapp size={14} className="text-white" />
          </div>
          <span className="text-[11px] font-[650] text-white">{event.campaign}</span>
        </div>
      </div>

      <div className="flex-1 p-[10px]">
        <div className="ml-auto max-w-[85%] rounded-[8px] rounded-tr-none bg-white p-[8px] shadow-sm">
          <p className="m-0 text-[10px] leading-[1.4] text-[#303030]">{event.description}</p>
          <div className="relative mt-[6px] overflow-hidden rounded-[4px]">
            <img src={event.image} alt={event.name} className="w-full object-cover" />
          </div>
          <span className="mt-[4px] block text-right text-[8px] text-[#66738a]">{event.time} ✓✓</span>
        </div>
      </div>
    </div>
  );
}

function GMBPreview({ event }: { event: PostDetailData }) {
  return (
    <div className="flex h-full w-full max-w-none flex-col overflow-hidden rounded-[10px] border border-[#e4e8ef] bg-white shadow-sm">
      <div className="flex items-center gap-[8px] px-[10px] pt-[8px] pb-[6px]">
        <div className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[#4285f4] text-[11px] font-[800] text-white">
          G
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-[650] text-[#1c2743]">{event.campaign}</span>
          <span className="text-[9px] text-[#65738a]">Google Business</span>
        </div>
      </div>
      <div className="relative mx-[10px] aspect-video overflow-hidden bg-[#edf2f7]">
        <img src={event.image} alt={event.name} className="h-full w-full object-cover" />
      </div>
      <div className="px-[12px] py-[10px]">
        <span className="block text-[11px] font-[700] text-[#1c2743]">{event.name}</span>
        <p className="m-0 mt-[2px] text-[10px] leading-[1.4] text-[#52617a]">{event.description}</p>
      </div>
    </div>
  );
}

function WebsitePreview({ event }: { event: PostDetailData }) {
  return (
    <div className="flex h-full w-full max-w-none flex-col overflow-hidden rounded-[10px] border border-[#e4e8ef] bg-white shadow-sm">
      <div className="border-b border-[#e8ecf2] px-[12px] py-[6px]">
        <span className="text-[10px] font-[600] text-[#1c2743]">Blog Post</span>
      </div>
      <div className="relative aspect-video overflow-hidden bg-[#edf2f7]">
        <img src={event.image} alt={event.name} className="h-full w-full object-cover" />
      </div>
      <div className="px-[12px] py-[8px]">
        <span className="block text-[11px] font-[700] text-[#1c2743]">{event.name}</span>
        <p className="m-0 mt-[2px] text-[10px] leading-[1.4] text-[#52617a]">{event.description}</p>
      </div>
    </div>
  );
}

const platformPreviews: Record<EventType, React.ComponentType<{ event: PostDetailData }>> = {
  fb: FacebookPreview,
  ig: InstagramPreview,
  li: LinkedInPreview,
  yt: YouTubePreview,
  wa: WhatsAppPreview,
  gmb: GMBPreview,
  link: WebsitePreview,
};

export function PostDetailModal({
  event,
  onClose,
}: {
  event: PostDetailData;
  onClose: () => void;
}) {
  const PreviewComponent = platformPreviews[event.type];
  const platformColor = getPlatformColor(event.type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 max-[768px]:p-3 max-[480px]:p-2"
      onClick={onClose}
    >
      <div
        className="relative flex h-auto max-h-[90vh] w-full max-w-[65%] min-w-[500px] overflow-hidden rounded-[16px] bg-white shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] max-[900px]:max-w-[80%] max-[900px]:min-w-0 max-[900px]:flex-col max-[900px]:max-h-[95vh] max-[900px]:overflow-y-auto max-[600px]:max-w-[95%] max-[600px]:min-w-0 max-[480px]:rounded-[12px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-[10px] top-[10px] z-50 grid h-[30px] w-[30px] place-items-center rounded-full bg-gradient-to-br from-[#ef2029] to-[#d91922] text-white shadow-lg shadow-red-200/50 transition-all hover:bg-[#d91922] hover:scale-110 hover:shadow-xl max-[480px]:right-[8px] max-[480px]:top-[8px] max-[480px]:h-[26px] max-[480px]:w-[26px]"
        >
          <X size={14} strokeWidth={2.2} />
        </button>

        {/* Left — Platform Preview */}
        <div className="flex w-[45%] shrink-0 items-stretch justify-center overflow-y-auto bg-gradient-to-br from-[#fafbfc] via-[#f5f7fa] to-[#f0f2f5] px-[12px] py-[12px] max-[900px]:w-full max-[900px]:px-[16px] max-[900px]:py-[14px] max-[480px]:px-[10px] max-[480px]:py-[10px]">
          <div className="w-full max-w-[320px]">
            <PreviewComponent event={event} />
          </div>
        </div>

        {/* Right — Post Details */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-white px-[20px] py-[18px] max-[900px]:px-[18px] max-[480px]:px-[12px] max-[480px]:py-[14px]">
          {/* Decorative Header Accent */}
          <div className="mb-[14px] h-[3px] w-full rounded-full bg-gradient-to-r from-[#ef2029] via-[#f59e0b] to-[#8055d2]" />

          {/* Title */}
          <h2 className="m-0 mb-[6px] pr-[30px] text-[16px] font-[750] leading-[1.2] text-[#1c2743] max-[480px]:text-[14px]">
            {event.name}
          </h2>

          {/* Platform / Status / Time / Priority */}
          <div className="mb-[8px] flex flex-wrap items-center gap-[6px]">
            <span className={`flex h-[26px] items-center gap-[5px] rounded-full ${platformColor.bg} px-[10px] text-[10px] font-[650] ${platformColor.text}`}>
              <PlatformIcon type={event.type} size={12} />
              {getPlatformLabel(event.type)}
            </span>
            <span className={`flex h-[26px] items-center rounded-full px-[10px] text-[10px] font-[650] ${getStatusClasses(event.status)}`}>
              {event.status}
            </span>
            <span className="flex h-[26px] items-center gap-[4px] rounded-full bg-[#f5f7fa] px-[10px] text-[10px] font-[500] text-[#66738a]">
              <Clock size={11} strokeWidth={1.8} />
              {event.time}
            </span>
            {event.priority && (
              <span className={`flex h-[26px] items-center gap-[4px] rounded-full px-[10px] text-[10px] font-[650] ${
                event.priority === "Urgent" ? "bg-[#fef2f2] text-[#dc2626]" :
                event.priority === "High" ? "bg-[#fff7ed] text-[#ea580c]" :
                event.priority === "Medium" ? "bg-[#fefce8] text-[#ca8a04]" :
                "bg-[#f0fdf4] text-[#16a34a]"
              }`}>
                <AlertTriangle size={10} strokeWidth={1.8} />
                {event.priority}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="mb-[10px] rounded-[8px] bg-[#f7f9fc] px-[12px] py-[8px]">
            <p className="m-0 text-[11px] font-[450] leading-[1.5] text-[#52617a]">
              {event.description}
            </p>
          </div>

          {/* Created By / Approved By */}
          <div className="mb-[10px] grid grid-cols-2 gap-[8px]">
            <div className="flex items-center gap-[8px] rounded-[8px] border border-[#e7ebf1] bg-white px-[10px] py-[8px]">
              <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[#fff0f2] text-[#e12630]">
                <User size={14} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <span className="block text-[8px] text-[#8a94a5]">Created by</span>
                <b className="block truncate text-[10px] font-[700] text-[#1c2743]">{event.creator}</b>
              </div>
            </div>
            <div className="flex items-center gap-[8px] rounded-[8px] border border-[#e7ebf1] bg-white px-[10px] py-[8px]">
              <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[#e5f7ef] text-[#078359]">
                <CheckCircle size={14} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <span className="block text-[8px] text-[#8a94a5]">Approved by</span>
                <b className="block truncate text-[10px] font-[700] text-[#1c2743]">{event.approver}</b>
              </div>
            </div>
          </div>

          {/* Campaign */}
          <div className="mb-[10px] flex items-center gap-[8px] rounded-[8px] border border-[#e7ebf1] bg-white px-[10px] py-[8px]">
            <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[#f0eaff] text-[#8055d2]">
              <Tag size={14} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <span className="block text-[8px] text-[#8a94a5]">Campaign</span>
              <b className="block truncate text-[10px] font-[700] text-[#1c2743]">{event.campaign}</b>
            </div>
          </div>

          {/* Divider */}
          <div className="mb-[10px] h-px w-full bg-[#e8ebf0]" />

          {/* Caption */}
          <div className="mb-[10px] flex items-start gap-[8px]">
            <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[#edf2f8] text-[#29354f]">
              <FileText size={14} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <span className="mb-[4px] block text-[10px] font-[700] text-[#29354f]">Caption</span>
              <div className="rounded-[8px] bg-[#f7f9fc] px-[10px] py-[8px] text-[10px] leading-[1.4] text-[#52617a]">
                A glimpse of our team in action!
                <br />
                Together for a cleaner, healthier Ganga.
                <br />
                {event.hashtags && event.hashtags.length > 0 && (
                  <span className="text-[#155fc2]">{event.hashtags.join(" ")}</span>
                )}
              </div>
            </div>
          </div>

          {/* Content Type */}
          {event.contentType && (
            <div className="mb-[10px] flex items-center gap-[8px]">
              <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[#fef3c7] text-[#d97706]">
                <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </span>
              <div>
                <span className="block text-[10px] font-[700] text-[#29354f]">Content Type</span>
                <p className="m-0 text-[10px] font-[450] text-[#52617a]">{event.contentType}</p>
              </div>
            </div>
          )}

          {/* Post Date & Time */}
          <div className="mb-[10px] flex items-center gap-[8px]">
            <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[#edf2f8] text-[#29354f]">
              <CalendarDays size={14} strokeWidth={1.8} />
            </span>
            <div>
              <span className="block text-[10px] font-[700] text-[#29354f]">Post Date & Time</span>
              <p className="m-0 text-[10px] font-[450] text-[#52617a]">
                {event.scheduledDate || "Apr 25, 2025"} <span className="text-[#c5cbd4]">|</span> {event.time}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="mb-[10px] flex items-center gap-[8px]">
              <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[#fef2f2] text-[#dc2626]">
                <MapPin size={14} strokeWidth={1.8} />
              </span>
              <div>
                <span className="block text-[10px] font-[700] text-[#29354f]">Location</span>
                <p className="m-0 text-[10px] font-[450] text-[#52617a]">{event.location}</p>
              </div>
            </div>
          )}

          {/* Hashtags */}
          {event.hashtags && event.hashtags.length > 0 && (
            <div className="mb-[10px] flex items-start gap-[8px]">
              <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[#ede9fe] text-[#7c3aed]">
                <Hash size={14} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-[700] text-[#29354f]">Hashtags</span>
                <div className="mt-[4px] flex flex-wrap gap-[4px]">
                  {event.hashtags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#f0eaff] px-[8px] py-[2px] text-[9px] font-[600] text-[#7c3aed]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Estimated Reach */}
          {event.reach && (
            <div className="mb-[10px] flex items-center gap-[8px]">
              <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[#e0f2fe] text-[#0284c7]">
                <Eye size={14} strokeWidth={1.8} />
              </span>
              <div>
                <span className="block text-[10px] font-[700] text-[#29354f]">Estimated Reach</span>
                <p className="m-0 text-[10px] font-[450] text-[#52617a]">{event.reach}</p>
              </div>
            </div>
          )}

          {/* Engagement Preview */}
          {event.engagement && (
            <div className="mb-[10px] rounded-[8px] border border-[#e7ebf1] bg-gradient-to-br from-[#f8fafc] to-[#f0f4f8] px-[12px] py-[10px]">
              <span className="mb-[8px] block text-[10px] font-[700] text-[#29354f]">Engagement Preview</span>
              <div className="grid grid-cols-3 gap-[8px]">
                <div className="flex flex-col items-center gap-[2px]">
                  <span className="grid h-[28px] w-[28px] place-items-center rounded-full bg-[#fff0f2] text-[#e12630]">
                    <Heart size={12} strokeWidth={1.8} />
                  </span>
                  <span className="text-[12px] font-[700] text-[#1c2743]">{event.engagement.likes}</span>
                  <span className="text-[8px] text-[#8a94a5]">Likes</span>
                </div>
                <div className="flex flex-col items-center gap-[2px]">
                  <span className="grid h-[28px] w-[28px] place-items-center rounded-full bg-[#e0f2fe] text-[#0284c7]">
                    <MessageSquare size={12} strokeWidth={1.8} />
                  </span>
                  <span className="text-[12px] font-[700] text-[#1c2743]">{event.engagement.comments}</span>
                  <span className="text-[8px] text-[#8a94a5]">Comments</span>
                </div>
                <div className="flex flex-col items-center gap-[2px]">
                  <span className="grid h-[28px] w-[28px] place-items-center rounded-full bg-[#e5f7ef] text-[#078359]">
                    <Share2 size={12} strokeWidth={1.8} />
                  </span>
                  <span className="text-[12px] font-[700] text-[#1c2743]">{event.engagement.shares}</span>
                  <span className="text-[8px] text-[#8a94a5]">Shares</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="mb-[10px] flex items-start gap-[8px]">
              <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[#fefce8] text-[#ca8a04]">
                <StickyNote size={14} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-[700] text-[#29354f]">Notes</span>
                <div className="mt-[4px] rounded-[8px] bg-[#fffbeb] border border-[#fde68a] px-[10px] py-[8px] text-[10px] leading-[1.4] text-[#92400e]">
                  {event.notes}
                </div>
              </div>
            </div>
          )}

          {/* Media */}
          <div className="mb-[12px] flex items-center gap-[8px]">
            <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-[#edf2f8] text-[#29354f]">
              <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-[700] text-[#29354f]">Media</span>
              <p className="m-0 text-[10px] font-[450] text-[#52617a]">1 Image (1080 × 1920)</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-[8px]">
            <button
              type="button"
              className="flex h-[34px] flex-1 items-center justify-center gap-[6px] rounded-[8px] bg-gradient-to-r from-[#ef2029] to-[#d91922] px-[14px] text-[11px] font-[700] text-white shadow-md shadow-red-200/50 transition-all hover:shadow-lg hover:shadow-red-200/60 hover:scale-[1.02]"
            >
              <Pencil size={13} strokeWidth={1.9} />
              Edit Post
            </button>
            <button
              type="button"
              className="flex h-[34px] flex-1 items-center justify-center gap-[6px] rounded-[8px] border border-[#dce3eb] bg-gradient-to-r from-white to-[#f8fafc] px-[14px] text-[11px] font-[650] text-[#29354f] transition-all hover:bg-[#f0f4f8] hover:scale-[1.02]"
            >
              <Clock size={13} strokeWidth={1.9} />
              Reschedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
