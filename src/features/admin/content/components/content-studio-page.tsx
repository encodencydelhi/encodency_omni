"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  AlarmClock,
  AlignLeft,
  BarChart3,
  Bell,
  Bookmark,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Globe2,
  Grid2X2,
  Heart,
  Image as ImageIcon,
  Info,
  Link2,
  List,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Play,
  Plus,
  Quote,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Sparkles,
  Tag,
  ThumbsUp,
  UploadCloud,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import {
  FaFacebookF,
  FaGoogle,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa6";

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

type PostType =
  | "Image"
  | "Video"
  | "Short / Reel"
  | "Carousel"
  | "Story"
  | "Blog / Article";

const platformMeta: Record<
  Platform,
  { icon: React.ReactNode; className: string; bg: string }
> = {
  Instagram: {
    icon: <FaInstagram />,
    className: "text-[#E1306C]",
    bg: "bg-[#fff0f5]",
  },
  Facebook: {
    icon: <FaFacebookF />,
    className: "text-[#1877F2]",
    bg: "bg-[#edf5ff]",
  },
  LinkedIn: {
    icon: <FaLinkedinIn />,
    className: "text-[#0A66C2]",
    bg: "bg-[#edf6ff]",
  },
  "Google Business": {
    icon: <FaGoogle />,
    className: "text-[#4285F4]",
    bg: "bg-[#f0f6ff]",
  },
  WhatsApp: {
    icon: <FaWhatsapp />,
    className: "text-[#25D366]",
    bg: "bg-[#effcf4]",
  },
  YouTube: {
    icon: <FaYoutube />,
    className: "text-[#FF0000]",
    bg: "bg-[#fff0f0]",
  },
  Website: {
    icon: <Globe2 className="h-4 w-4" />,
    className: "text-[#60708d]",
    bg: "bg-[#f1f4f8]",
  },
};

const imageUrls = {
  river:
    "https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?auto=format&fit=crop&w=900&q=85",
  lake:
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85",
  cleanup:
    "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=900&q=85",
  nature:
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=85",
  people:
    "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=900&q=85",
  water:
    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=900&q=85",
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function PlatformIcon({
  platform,
  size = "md",
}: {
  platform: Platform;
  size?: "sm" | "md" | "lg";
}) {
  const item = platformMeta[platform];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        item.bg,
        item.className,
        size === "sm" && "h-6 w-6 text-[12px]",
        size === "md" && "h-7 w-7 text-[14px]",
        size === "lg" && "h-8 w-8 text-[16px]"
      )}
    >
      {item.icon}
    </span>
  );
}

function PillButton({
  children,
  active,
  onClick,
  className,
  icon,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[11px] font-medium transition",
        active
          ? "border-[#1877f2] bg-[#eef6ff] text-[#1666d9]"
          : "border-[#e3eaf3] bg-white text-[#51627f] hover:border-[#cbd7e8]",
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function SectionTitle({
  number,
  children,
}: {
  number?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-[#13264a]">
      {number && (
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#1769df] to-[#0a4ab5] text-[9px] font-bold text-white shadow-sm shadow-[#1769df]/20">
          {number}
        </span>
      )}
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  required,
}: {
  label: string;
  value: string;
  required?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-[10px] font-medium text-[#71809a]">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <button className="flex h-9 w-full items-center justify-between rounded-md border border-[#dce5f0] bg-white px-3 text-left text-[11px] font-medium text-[#25385d]">
        <span className="truncate">{value}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#7d8da7]" />
      </button>
    </div>
  );
}

function ChannelStrip({
  selected,
  onSelect,
  all = false,
}: {
  selected: Platform | "All Platforms" | "All Channels";
  onSelect?: (value: Platform | "All Platforms" | "All Channels") => void;
  all?: boolean;
}) {
  const items: Array<Platform | "All Platforms" | "All Channels"> = all
    ? [
      "All Platforms",
      "Instagram",
      "Facebook",
      "LinkedIn",
      "Google Business",
      "WhatsApp",
      "YouTube",
      "Website",
    ]
    : [
      "Facebook",
      "Instagram",
      "LinkedIn",
      "Google Business",
      "WhatsApp",
      "YouTube",
      "Website",
    ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[#edf1f6] pb-2.5">
      {items.map((item) => {
        const isAll = item === "All Platforms" || item === "All Channels";
        return (
          <button
            key={item}
            onClick={() => onSelect?.(item)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-[10px] font-medium",
              selected === item
                ? "border-[#dce8fa] bg-[#f2f7ff] text-[#1769df]"
                : "border-transparent bg-white text-[#586a87] hover:bg-[#f7f9fc]"
            )}
          >
            {isAll ? (
              <Grid2X2 className="h-3.5 w-3.5" />
            ) : (
              <PlatformIcon platform={item as Platform} size="sm" />
            )}
            {item}
          </button>
        );
      })}
    </div>
  );
}

function PreviewCard({
  platform = "Instagram",
  draft = false,
}: {
  platform?: Platform;
  draft?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe7f1] bg-white shadow-[0_4px_15px_rgba(24,42,70,0.05)]">
      <div className="flex items-center justify-between border-b border-[#edf1f6] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} />
          <span className="text-[11px] font-semibold text-[#ef3340]">
            {platform}
          </span>
        </div>
        <MoreHorizontal className="h-4 w-4 text-[#8a97aa]" />
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eef8e9] text-[#66a640]">
          🌿
        </div>
        <div>
          <div className="text-[11px] font-semibold text-[#1c2d4c]">
            Moksha Sewa
          </div>
          <div className="text-[9px] text-[#8793a7]">
            Just now · {draft ? "Draft" : "Public"}
          </div>
        </div>
      </div>

      <div className="relative mx-3 overflow-hidden rounded-lg">
        <img
          src={imageUrls.river}
          alt="Clean river campaign"
          className="h-[285px] w-full object-cover"
        />
        <div className="absolute inset-x-4 bottom-5">
          <div className="max-w-[210px] text-[27px] font-extrabold leading-[0.98] tracking-[-0.8px] text-white drop-shadow-lg">
            CLEAN RIVERS
            <br />
            BRIGHTER
            <br />
            TOMORROW <span className="text-[#a7df37]">✓</span>
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="flex items-center justify-between py-2 text-[#1d2f50]">
          <div className="flex items-center gap-4">
            <Heart className="h-5 w-5 fill-[#f32739] text-[#f32739]" />
            <MessageCircle className="h-5 w-5" />
            <Send className="h-5 w-5" />
          </div>
          <Bookmark className="h-5 w-5" />
        </div>
        <div className="text-[10px] font-semibold text-[#1c2d4c]">
          1,246 likes
        </div>
        <div className="mt-1 text-[10px] leading-4 text-[#51627f]">
          <b className="text-[#26395a]">Moksha Sewa</b> Small actions create a
          cleaner tomorrow... <span className="text-[#60728f]">more</span>
        </div>
        <div className="mt-1 text-[10px] leading-4 text-[#1769df]">
          #CleanGanga #HealthyIndia #Sustainability #MokshaSewa
        </div>
      </div>
    </div>
  );
}

const postTypes: Array<{
  name: PostType;
  subtitle: string;
  icon: React.ReactNode;
}> = [
    { name: "Image", subtitle: "Single photo post", icon: <ImageIcon /> },
    { name: "Video", subtitle: "Standard video post", icon: <Video /> },
    {
      name: "Short / Reel",
      subtitle: "Short vertical video",
      icon: <Play />,
    },
    { name: "Carousel", subtitle: "Multiple images", icon: <Grid2X2 /> },
    { name: "Story", subtitle: "24h disappearing", icon: <Camera /> },
    { name: "Blog / Article", subtitle: "Link post with preview", icon: <FileText /> },
  ];

function PostTypeSelector({
  selected,
  onChange,
}: {
  selected: PostType;
  onChange: (type: PostType) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {postTypes.map((item) => (
        <button
          key={item.name}
          onClick={() => onChange(item.name)}
          className={cn(
            "min-h-[76px] rounded-xl border px-2 py-2 text-center transition-all duration-200",
            selected === item.name
              ? "border-[#f02736]/30 bg-gradient-to-b from-[#fff5f5] to-white shadow-md shadow-[#f02736]/10"
              : "border-[#e0e7f0] bg-white hover:border-[#c8d8f0] hover:shadow-sm"
          )}
        >
          <span
            className={cn(
              "mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg transition-all",
              selected === item.name
                ? "bg-gradient-to-br from-[#f02736] to-[#ff6b35] text-white shadow-sm shadow-[#f02736]/30"
                : "bg-[#f3f6fa] text-[#657590]"
            )}
          >
            {React.cloneElement(item.icon as React.ReactElement<any>, {
              className: "h-3.5 w-3.5",
            })}
          </span>
          <div className="text-[10px] font-semibold leading-3 text-[#233658]">
            {item.name}
          </div>
          <div className="mt-1 text-[8.5px] leading-3 text-[#8390a6]">
            {item.subtitle}
          </div>
        </button>
      ))}
    </div>
  );
}

function ContentEditor({
  postType,
  setPostType,
}: {
  postType: PostType;
  setPostType: (type: PostType) => void;
}) {
  const [contentTab, setContentTab] = useState("Post Caption");

  return (
    <div className="space-y-3">
      <SectionTitle number="1">Post Type</SectionTitle>
      <PostTypeSelector selected={postType} onChange={setPostType} />

      <SectionTitle number="1">Project & Campaign</SectionTitle>
      <div className="flex gap-2">
        <Field label="Project" value="🌿  Moksha Sewa" />
        <Field label="Campaign (Optional)" value="🌿  Clean Ganga Awareness" />
        <button className="mt-[17px] h-9 shrink-0 rounded-md border border-[#b8d5ff] bg-[#eef6ff] px-3 text-[10px] font-semibold text-[#1769df]">
          <Plus className="mr-1 inline h-3 w-3" />
          Create New Campaign
        </button>
      </div>

      <SectionTitle number="2">Content</SectionTitle>
      <div className="flex gap-1 overflow-x-auto">
        {[
          ["Post Caption", <Pencil />],
          ["Hashtags", <Tag />],
          ["Caption Variations", <AlignLeft />],
          ["First Comment", <MessageCircle />],
          ["Platform Settings", <Settings2 />],
          ["Language & Tone", <Globe2 />],
          ["AI Improve", <Sparkles />],
        ].map(([label, icon]) => (
          <button
            key={label as string}
            onClick={() => setContentTab(label as string)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-[9.5px] font-medium transition-all duration-200",
              contentTab === label
                ? "border-[#f02736]/20 bg-gradient-to-r from-[#fff0f1] to-[#fff8f8] text-[#ee2433] shadow-sm shadow-[#f02736]/10"
                : "border-[#e3e9f1] bg-white text-[#60718c] hover:border-[#c8d8f0] hover:text-[#3a4f6e]"
            )}
          >
            {React.cloneElement(icon as React.ReactElement<any>, {
              className: "h-3 w-3",
            })}
            {label}
          </button>
        ))}
      </div>

      {contentTab === "Post Caption" && (
        <>
          <div className="rounded-lg border border-[#dce5f0] bg-white">
            <textarea
              defaultValue={
                "Small actions create a cleaner tomorrow.\n\nLet’s work together for a healthier, greener and cleaner India.\n\n#CleanGanga #HealthyIndia #Sustainability #MokshaSewa"
              }
              className="h-[115px] w-full resize-none bg-transparent p-3 text-[11px] leading-5 text-[#324563] outline-none"
            />
            <div className="flex items-center justify-between border-t border-[#edf1f6] px-3 py-2">
              <span className="text-[9px] text-[#8390a6]">160/3000</span>
              <span className="text-[9px] text-[#8390a6]">Instagram · 3,000 max</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {["AI Improve", "Rewrite", "Shorten", "Expand", "Change Tone", "Translate", "Emojis", "Add CTA"].map(
              (x) => (
                <PillButton key={x} icon={<Sparkles className="h-3 w-3" />}>
                  {x}
                </PillButton>
              )
            )}
          </div>
        </>
      )}

      {contentTab === "Hashtags" && (
        <div className="rounded-lg border border-[#dce5f0] bg-white p-3">
          <div className="mb-2 text-[10px] font-semibold text-[#243758]">
            Hashtag Set
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              "#CleanGanga",
              "#HealthyIndia",
              "#Sustainability",
              "#MokshaSewa",
              "#SaveWater",
              "#Environment",
              "#CleanIndia",
            ].map((x) => (
              <span
                key={x}
                className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-[9px] font-medium text-[#1769df]"
              >
                {x}
              </span>
            ))}
          </div>
          <button className="mt-3 rounded-md border border-[#e1e8f1] px-3 py-1.5 text-[9px] font-medium text-[#5b6d89]">
            <Sparkles className="mr-1 inline h-3 w-3" />
            Generate more
          </button>
        </div>
      )}

      {contentTab === "Caption Variations" && (
        <div className="space-y-2">
          {[
            "Small actions create a cleaner tomorrow. Together, we can protect every river.",
            "Cleaner rivers begin with everyday choices. Let’s make a difference together.",
            "A healthier India starts with cleaner water. Join us in keeping our rivers clean.",
          ].map((text, i) => (
            <div
              key={text}
              className="rounded-lg border border-[#dce5f0] bg-white p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-semibold text-[#1769df]">
                  Variation {i + 1}
                </span>
                <button className="text-[9px] text-[#657590]">
                  <Copy className="mr-1 inline h-3 w-3" />
                  Copy
                </button>
              </div>
              <p className="text-[10px] leading-4 text-[#4d607d]">{text}</p>
            </div>
          ))}
        </div>
      )}

      {contentTab === "First Comment" && (
        <div className="rounded-lg border border-[#dce5f0] bg-white p-3">
          <div className="mb-2 text-[10px] font-semibold text-[#243758]">
            First Comment
          </div>
          <textarea
            defaultValue="What small action will you take today? 💚"
            className="h-20 w-full resize-none rounded-md border border-[#e2e8f0] p-2.5 text-[10px] text-[#445875] outline-none"
          />
        </div>
      )}

      {contentTab === "Language & Tone" && (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Language" value="English" />
          <Field label="Tone" value="Positive" />
          <Field label="Audience" value="General Public" />
        </div>
      )}

      {contentTab === "Platform Settings" && (
        <div className="rounded-lg border border-[#dce5f0] bg-white p-3">
          <div className="mb-2 text-[10px] font-semibold text-[#243758]">
            Platform-specific overrides
          </div>
          <div className="grid grid-cols-2 gap-2">
            {["Instagram", "Facebook", "LinkedIn", "Google Business"].map(
              (platform) => (
                <div
                  key={platform}
                  className="flex items-center justify-between rounded-md border border-[#e7edf4] px-2.5 py-2"
                >
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={platform as Platform} size="sm" />
                    <span className="text-[9px] font-medium text-[#445875]">
                      {platform}
                    </span>
                  </div>
                  <span className="text-[9px] text-[#1db66b]">Ready</span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {contentTab === "AI Improve" && (
        <div className="rounded-lg border border-[#d9ccff] bg-[#faf8ff] p-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-[#6636d9]">
            <Sparkles className="h-3.5 w-3.5" />
            AI Content Suggestions
          </div>
          <ul className="mt-2 space-y-1.5 text-[9.5px] leading-4 text-[#5e6080]">
            <li>• Add a clearer call-to-action.</li>
            <li>• Use 3–5 high-intent hashtags for better discoverability.</li>
            <li>• Shorten the first sentence for stronger hook retention.</li>
          </ul>
        </div>
      )}

      <SectionTitle number="4">Media</SectionTitle>
      <div className="flex items-center gap-4 border-b border-[#edf1f6] pb-2">
        {["Images", "Videos", "Carousel", "Documents", "GIFs", "Poll", "Location", "Product Tag"].map(
          (x, i) => (
            <button
              key={x}
              className={cn(
                "pb-1 text-[9px] font-medium",
                i === 0
                  ? "border-b-2 border-[#f22f3e] text-[#f22f3e]"
                  : "text-[#75849c]"
              )}
            >
              {x}
            </button>
          )
        )}
      </div>

      <div className="rounded-xl border-2 border-dashed border-[#b8d0f0] bg-gradient-to-br from-[#f8faff] to-[#f0f6ff] p-5 text-center transition-all hover:border-[#1769df] hover:from-[#f0f6ff] hover:to-[#e8f2ff]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1769df] to-[#0a4ab5] shadow-lg shadow-[#1769df]/20">
          <UploadCloud className="h-6 w-6 text-white" />
        </div>
        <div className="mt-2 text-[11px] font-semibold text-[#3a5070]">
          Drag & drop media here or
        </div>
        <button className="mt-2.5 rounded-lg bg-gradient-to-r from-[#1769df] to-[#0a4ab5] px-5 py-2 text-[10px] font-semibold text-white shadow-md shadow-[#1769df]/25 transition hover:shadow-lg hover:shadow-[#1769df]/30">
          Upload from device
          <ChevronDown className="ml-1 inline h-3 w-3" />
        </button>
        <div className="mt-1.5 text-[8.5px] text-[#7a8ea6]">
          Supports: JPG, PNG, GIF, MP4, MOV, WEBM (Max 100MB)
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["Media Library", "Canva", "Unsplash", "Google Drive", "Pexels", "AI Generate"].map(
          (x) => (
            <PillButton
              key={x}
              icon={
                x === "AI Generate" ? (
                  <Sparkles className="h-3 w-3" />
                ) : (
                  <ImageIcon className="h-3 w-3" />
                )
              }
            >
              {x}
            </PillButton>
          )
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[imageUrls.river, imageUrls.lake, imageUrls.cleanup].map((src, i) => (
          <div
            key={src}
            className="relative overflow-hidden rounded-lg border border-[#dce5f0]"
          >
            <span className="absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded bg-[#1769df] text-[9px] font-bold text-white">
              {i + 1}
            </span>
            <img src={src} alt="" className="h-24 w-full object-cover" />
            <button className="absolute right-1.5 top-1.5 rounded bg-white/90 p-1">
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-[#ccd8e7] text-[#657590]">
          <Plus className="h-5 w-5" />
          <span className="mt-1 text-[9px]">Add More</span>
        </button>
      </div>
    </div>
  );
}

function InstagramSettings({ postType }: { postType: PostType }) {
  const [ratio, setRatio] = useState("4:5");
  const [toggles, setToggles] = useState({
    location: true,
    people: true,
    product: false,
    music: false,
    captions: true,
    branded: false,
  });

  const toggle = (key: keyof typeof toggles) =>
    setToggles((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-3">
      <SectionTitle number="5">Platform Settings (Instagram)</SectionTitle>
      <div>
        <div className="mb-1.5 text-[9px] font-medium text-[#71809a]">
          Post Type
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {["Post", "Reel", "Story"].map((x) => (
            <button
              key={x}
              className={cn(
                "h-8 rounded-md border text-[9px] font-medium",
                (postType === "Short / Reel" && x === "Reel") ||
                  (postType === "Story" && x === "Story") ||
                  (postType !== "Short / Reel" &&
                    postType !== "Story" &&
                    x === "Post")
                  ? "border-[#1877f2] bg-[#eef6ff] text-[#1769df]"
                  : "border-[#e2e8f0] text-[#687993]"
              )}
            >
              {x}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[9px] font-medium text-[#71809a]">
          Media Ratio
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            ["1:1", "Square"],
            ["4:5", "Portrait"],
            ["1.91:1", "Landscape"],
            ["9:16", "Story/Reel"],
          ].map(([r, label]) => (
            <button
              key={r}
              onClick={() => setRatio(r as string)}
              className={cn(
                "rounded-md border px-1 py-2",
                ratio === r
                  ? "border-[#1877f2] bg-[#eef6ff]"
                  : "border-[#e1e8f0] bg-white"
              )}
            >
              <div className="mx-auto h-5 w-4 rounded-sm border border-[#7f8da4]" />
              <div className="mt-1 text-[9px] font-semibold text-[#3e526f]">
                {r}
              </div>
              <div className="text-[8px] text-[#8a97aa]">{label}</div>
            </button>
          ))}
        </div>
      </div>

      <SettingRow
        icon={<MapPin />}
        label="Add Location"
        value={toggles.location}
        onToggle={() => toggle("location")}
      />
      {toggles.location && (
        <div className="ml-6 -mt-2 rounded-md border border-[#e0e7ef] px-2.5 py-2 text-[9px] text-[#687993]">
          Varanasi, Uttar Pradesh
          <X className="float-right h-3 w-3" />
        </div>
      )}

      <SettingRow
        icon={<Users />}
        label="Tag People"
        value={toggles.people}
        onToggle={() => toggle("people")}
      />
      {toggles.people && (
        <div className="ml-6 -mt-2 rounded-md border border-[#e0e7ef] px-2.5 py-2 text-[9px] text-[#8a97aa]">
          Search users...
        </div>
      )}

      <SettingRow
        icon={<Tag />}
        label="Add Product Tag"
        value={toggles.product}
        onToggle={() => toggle("product")}
      />
      <SettingRow
        icon={<Clock3 />}
        label="Add Music (Reels only)"
        value={toggles.music}
        onToggle={() => toggle("music")}
      />
      <SettingRow
        icon={<FileText />}
        label="Add AI Captions (Reels only)"
        value={toggles.captions}
        onToggle={() => toggle("captions")}
      />
      <SettingRow
        icon={<BriefcaseBusiness />}
        label="Branded Content"
        value={toggles.branded}
        onToggle={() => toggle("branded")}
      />

      <SectionTitle number="6">Select Channels</SectionTitle>
      <div className="space-y-1">
        {(
          [
            "Instagram",
            "Facebook",
            "LinkedIn",
            "Google Business",
            "WhatsApp",
            "YouTube",
            "Website",
          ] as Platform[]
        ).map((p, i) => (
          <label
            key={p}
            className="flex h-7 items-center gap-2 rounded-md px-1.5 hover:bg-[#f7f9fc]"
          >
            <input
              type="checkbox"
              defaultChecked={i < 3}
              className="h-3 w-3 accent-[#1769df]"
            />
            <PlatformIcon platform={p} size="sm" />
            <span className="flex-1 text-[9.5px] font-medium text-[#435674]">
              {p}
            </span>
            <ChevronDown className="h-3 w-3 text-[#8693a8]" />
          </label>
        ))}
      </div>

      <SectionTitle number="7">Schedule</SectionTitle>
      <div className="space-y-1.5 text-[10px] text-[#51627f]">
        {["Publish Now", "Schedule for later", "Save as Draft"].map((x, i) => (
          <label key={x} className="flex items-center gap-2">
            <input
              type="radio"
              name="schedule"
              defaultChecked={i === 0}
              className="accent-[#ef3340]"
            />
            {x}
          </label>
        ))}
      </div>

      <div className="rounded-md border border-[#cfe0ff] bg-[#f3f8ff] p-2.5">
        <div className="text-[9px] font-semibold text-[#1769df]">
          <Info className="mr-1 inline h-3 w-3" />
          Best time to post
        </div>
        <div className="mt-0.5 text-[9px] text-[#526986]">
          Today, 11:00 AM – 1:00 PM
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#edf1f6] pt-2.5 text-[10px] font-semibold text-[#243758]">
        <span>8. Advanced Options</span>
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#7a8aa2] [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <span className="flex-1 text-[9.5px] font-medium text-[#536580]">
        {label}
      </span>
      <button
        onClick={onToggle}
        className={cn(
          "relative h-4.5 w-7 rounded-full transition",
          value ? "bg-[#1769df]" : "bg-[#dce3ed]"
        )}
        aria-label={label}
      >
        <span
          className={cn(
            "absolute top-[2px] h-3.5 w-3.5 rounded-full bg-white shadow-sm transition",
            value ? "right-[2px]" : "left-[2px]"
          )}
        />
      </button>
    </div>
  );
}

function CreateTab({
  postType,
  setPostType,
}: {
  postType: PostType;
  setPostType: (type: PostType) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)_310px] gap-2.5">
      <div className="min-w-0 rounded-xl border border-[#e0e7f0] bg-white p-3">
        <ContentEditor postType={postType} setPostType={setPostType} />
      </div>

      <div className="min-w-0 rounded-xl border border-[#e0e7f0] bg-white p-3">
        <InstagramSettings postType={postType} />
      </div>

      <div className="min-w-0 space-y-2.5">
        <div className="rounded-xl border border-[#e0e7f0] bg-white p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-[#17294b]">
              Post Preview
            </h3>
            <div className="flex gap-1">
              <ChevronLeft className="h-4 w-4 text-[#7d8ca3]" />
              <ChevronRight className="h-4 w-4 text-[#7d8ca3]" />
            </div>
          </div>
          <PreviewCard />
        </div>

        <Checklist />
      </div>
    </div>
  );
}

function Checklist() {
  const items = [
    ["Project selected", true],
    ["Post type selected", true],
    ["Caption added", true],
    ["Media added", true],
    ["Platform settings configured", true],
    ["At least one channel selected", true],
    ["Hashtags added", false],
    ["Schedule or publish", false],
  ];

  return (
    <div className="rounded-xl border border-[#e0e7f0] bg-white p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-[#17294b]">
          Content Checklist
        </h3>
        <span className="text-[10px] font-semibold text-[#536580]">6/8</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8edf3]">
        <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#14b8a6] to-[#20b77a] shadow-sm shadow-[#20b77a]/30" />
      </div>
      <div className="mt-3 space-y-2">
        {items.map(([text, done]) => (
          <div key={text as string} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full",
                done ? "bg-[#dff7ec] text-[#1eae72]" : "border border-[#d9e0e9]"
              )}
            >
              {done && <Check className="h-2.5 w-2.5" />}
            </span>
            <span
              className={cn(
                "text-[9.5px]",
                done ? "text-[#405673]" : "text-[#8a97aa]"
              )}
            >
              {text as string}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const aiTypes = [
  ["Social Post", "Generate engaging posts with images", MessageCircle],
  ["Carousel", "Multi-slide content with key points", Grid2X2],
  ["Reel / Short Video", "Script + visuals for short videos", Video],
  ["Story", "Quick, engaging story content", Camera],
  ["Blog / Article", "Long-form content for website", BookOpen],
  ["Ad Copy", "Conversion focused ad creatives", Zap],
  ["Hashtag Ideas", "Relevant & trending hashtags", Tag],
  ["Caption Variations", "Multiple caption options", AlignLeft],
] as const;

function AIAssistantTab() {
  const [selected, setSelected] = useState("Social Post");
  const [tone, setTone] = useState("Positive");

  return (
    <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_310px] gap-2.5">
      <div className="rounded-xl border border-[#e0e7f0] bg-white p-3">
        <SectionTitle number="1">Choose What to Create</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {aiTypes.map(([name, desc, Icon]) => (
            <button
              key={name}
              onClick={() => setSelected(name)}
              className={cn(
                "min-h-[83px] rounded-xl border p-2 text-left transition-all duration-200",
                selected === name
                  ? "border-[#7c3aed]/30 bg-gradient-to-b from-[#f5f0ff] to-white shadow-md shadow-[#7c3aed]/10"
                  : "border-[#e0e7f0] bg-white hover:border-[#c8d8f0] hover:shadow-sm"
              )}
            >
              <span
                className={cn(
                  "mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                  selected === name
                    ? "bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white shadow-sm shadow-[#7c3aed]/30"
                    : "bg-[#f3f5f8] text-[#677791]"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="text-[9.5px] font-semibold text-[#26395a]">
                {name}
              </div>
              <div className="mt-0.5 text-[8.5px] leading-3 text-[#8490a4]">
                {desc}
              </div>
            </button>
          ))}
        </div>

        <button className="mt-2 flex w-full items-center gap-2 rounded-lg border border-[#dce5f0] p-2 text-left">
          <Link2 className="h-4 w-4 text-[#1769df]" />
          <span className="text-[10px] font-semibold text-[#1769df]">
            Custom Prompt
          </span>
          <span className="text-[9px] text-[#8996a9]">
            Tell AI exactly what you need
          </span>
        </button>

        <SectionTitle number="2">Provide Details</SectionTitle>
        <div className="grid grid-cols-[1fr_125px] gap-2">
          <div>
            <div className="mb-1 text-[9px] font-medium text-[#71809a]">
              Topic / Prompt <span className="text-red-500">*</span>
            </div>
            <textarea
              defaultValue="Create an Instagram post about Clean Ganga awareness with a motivating message. Make it eco-friendly and use a positive tone."
              className="h-[100px] w-full resize-none rounded-lg border border-[#dce5f0] p-2.5 text-[10px] leading-4 text-[#4e617e] outline-none"
            />
            <div className="mt-2 text-[9px] font-medium text-[#71809a]">
              Additional Context (Optional)
            </div>
            <textarea
              placeholder="Add specific points, campaign details, or call to action..."
              className="mt-1 h-[62px] w-full resize-none rounded-lg border border-[#dce5f0] p-2.5 text-[10px] outline-none"
            />
          </div>

          <div className="space-y-2">
            <Field label="Target Audience" value="General Public" />
            <Field label="Tone" value={tone} />
            <Field label="Language" value="English" />
            <button className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-[#dce5f0] text-[9px] font-medium text-[#566984]">
              <Paperclip className="h-3 w-3" />
              Add Reference
            </button>
          </div>
        </div>

        <div className="mt-2 text-[9px] font-medium text-[#71809a]">
          Select Image Style
        </div>
        <div className="mt-1.5 grid grid-cols-6 gap-1.5">
          {["Realistic", "Illustration", "Minimal", "Professional", "Nature", "Custom"].map(
            (x, i) => (
              <button
                key={x}
                className={cn(
                  "overflow-hidden rounded-md border text-center",
                  i === 0
                    ? "border-[#1769df] bg-[#f4f8ff]"
                    : "border-[#e1e8f0]"
                )}
              >
                <img
                  src={
                    [imageUrls.river, imageUrls.nature, imageUrls.water, imageUrls.people, imageUrls.lake][
                    i % 5
                    ]
                  }
                  alt=""
                  className="h-10 w-full object-cover"
                />
                <span className="block px-1 py-1 text-[8px] font-medium text-[#556884]">
                  {x}
                </span>
              </button>
            )
          )}
        </div>

        <button className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-[10px] font-semibold text-white shadow-lg shadow-[#7c3aed]/25 transition hover:shadow-xl hover:shadow-[#7c3aed]/30">
          <Sparkles className="h-4 w-4" />
          Generate Content
        </button>
      </div>

      <div className="rounded-xl border border-[#e0e7f0] bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <SectionTitle number="3">AI Generated Content</SectionTitle>
          <button className="flex items-center gap-1 rounded-md border border-[#dce5f0] px-2.5 py-1.5 text-[9px] text-[#526580]">
            <RefreshCw className="h-3 w-3" />
            Regenerate
          </button>
        </div>
        <div className="flex gap-1.5 border-b border-[#edf1f6] pb-2">
          {["Post 1", "Post 2", "Post 3"].map((x, i) => (
            <button
              key={x}
              className={cn(
                "rounded-md px-3 py-1.5 text-[9px] font-semibold",
                i === 0
                  ? "bg-[#fff0f2] text-[#ef3340]"
                  : "text-[#687993]"
              )}
            >
              {x}
            </button>
          ))}
        </div>

        <div className="mt-2 overflow-hidden rounded-lg border border-[#e0e7f0]">
          <div className="p-3 text-[10px] leading-5 text-[#3f5574]">
            Small actions create a cleaner tomorrow.
            <br />
            <br />
            Let’s work together for a healthier, greener and cleaner India. 💙🌱
            <br />
            <br />
            <span className="text-[#1769df]">
              #CleanGanga #HealthyIndia #Sustainability #MokshaSewa
            </span>
          </div>
          <img
            src={imageUrls.people}
            alt=""
            className="h-[310px] w-full object-cover"
          />
        </div>

        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {[imageUrls.people, imageUrls.cleanup, imageUrls.river, imageUrls.lake].map(
            (src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className={cn(
                  "h-14 w-full rounded-md object-cover",
                  i === 0 && "ring-2 ring-[#1769df]"
                )}
              />
            )
          )}
          <button className="flex h-14 items-center justify-center rounded-md border border-dashed border-[#cbd8e8]">
            <Plus className="h-4 w-4 text-[#657590]" />
          </button>
        </div>

        <div className="mt-2 flex gap-1.5">
          {["Download", "Edit in Canva", "Use This"].map((x, i) => (
            <button
              key={x}
              className={cn(
                "flex h-8 flex-1 items-center justify-center gap-1 rounded-md border text-[9px] font-semibold",
                i === 2
                  ? "border-[#1769df] bg-[#eef6ff] text-[#1769df]"
                  : "border-[#dce5f0] text-[#526580]"
              )}
            >
              {i === 0 && <Download className="h-3 w-3" />}
              {i === 1 && <ExternalLink className="h-3 w-3" />}
              {i === 2 && <Check className="h-3 w-3" />}
              {x}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="rounded-xl border border-[#e0e7f0] bg-white p-2.5">
          <h3 className="mb-2 text-[12px] font-semibold text-[#17294b]">
            Post Preview
          </h3>
          <PreviewCard />
        </div>
        <div className="rounded-xl border border-[#e0e7f0] bg-white p-3">
          <h3 className="text-[11px] font-semibold text-[#17294b]">
            Post Improvements
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {[
              "Make it shorter",
              "Add CTA",
              "Change tone",
              "Add more hashtags",
              "Translate to Hindi",
              "Add emoji",
              "Generate more options",
            ].map((x) => (
              <button
                key={x}
                className="rounded-lg border border-[#e1e8f0] bg-gradient-to-r from-white to-[#f8faff] px-2 py-1.5 text-left text-[8.5px] font-medium text-[#5c6f8c] transition-all hover:border-[#7c3aed]/30 hover:shadow-sm hover:text-[#5a3d9a]"
              >
                <Sparkles className="mr-1 inline h-2.5 w-2.5 text-[#1769df]" />
                {x}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const templates = [
  ["Clean Ganga Campaign", "Social Awareness", imageUrls.river],
  ["Motivational Quote", "Quotes & Motivation", imageUrls.lake],
  ["Environment Day", "Festival & Events", imageUrls.nature],
  ["Impact Story", "Behind the Scenes", imageUrls.cleanup],
  ["Campaign Announcement", "Announcements", imageUrls.people],
  ["Educational Tips", "Tips & Education", imageUrls.water],
  ["Recruitment Post", "Recruitment", imageUrls.people],
  ["Special Offer", "Offers & Promotions", imageUrls.lake],
  ["Client Testimonial", "Testimonials", imageUrls.people],
  ["Behind the Scenes", "Behind the Scenes", imageUrls.cleanup],
  ["Poll Template", "Polls & Engagement", imageUrls.lake],
  ["Social Links", "Announcements", imageUrls.nature],
];

function TemplatesTab() {
  const [platform, setPlatform] = useState<Platform | "All Platforms" | "All Channels">(
    "Instagram"
  );
  const [selected, setSelected] = useState(0);
  const [category, setCategory] = useState("All Templates");

  return (
    <div className="grid grid-cols-[190px_minmax(0,1fr)_310px] gap-2.5">
      <div className="rounded-xl border border-[#e0e7f0] bg-white p-2.5">
        <div className="mb-2 text-[12px] font-semibold text-[#243758]">
          Template Categories
        </div>
        <div className="space-y-1">
          {[
            ["All Templates", 124, Grid2X2],
            ["Festival & Events", 18, CalendarDays],
            ["Social Awareness", 16, Activity],
            ["Product/Service", 20, Send],
            ["Quotes & Motivation", 12, Quote],
            ["Offers & Promotions", 14, Tag],
            ["Behind the Scenes", 10, Camera],
            ["Announcements", 8, Bell],
            ["Tips & Education", 10, BookOpen],
            ["Testimonials", 6, ThumbsUp],
            ["Polls & Engagement", 8, BarChart3],
            ["Recruitment", 4, Users],
            ["Custom Templates", 8, Settings2],
          ].map(([x, count, Icon]) => {
            const LucideIcon = Icon as React.FC<{ className?: string }>;
            return (
              <button
                key={x as string}
                onClick={() => setCategory(x as string)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-all duration-200",
                  category === x ? "bg-gradient-to-r from-[#eef6ff] to-[#f0f8ff] text-[#1769df] shadow-sm shadow-[#1769df]/10" : "text-[#556884] hover:bg-[#f7f9fc]"
                )}
              >
                <LucideIcon className="h-3.5 w-3.5" />
                <span className="flex-1 text-[9.5px] font-medium">{x as string}</span>
                <span className="rounded bg-[#f0f3f7] px-1.5 py-0.5 text-[8px] text-[#73829a]">
                  {count as number}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-[#e0e7f0] bg-white p-2.5">
        <ChannelStrip
          all
          selected={platform}
          onSelect={(x) => setPlatform(x)}
        />
        <div className="mt-2.5 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[#17294b]">
            All Templates <span className="text-[#7b89a0]">(124)</span>
          </h3>
          <button className="flex items-center gap-1 rounded-md border border-[#dce5f0] px-2.5 py-1.5 text-[9px] text-[#586a87]">
            Most Popular <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2.5">
          {templates.map(([title, cat, src], i) => (
            <button
              key={title}
              onClick={() => setSelected(i)}
              className={cn(
                "overflow-hidden rounded-xl border bg-white text-left transition-all duration-200",
                selected === i
                  ? "border-[#1769df]/40 shadow-lg shadow-[#1769df]/15 ring-1 ring-[#1769df]/20"
                  : "border-[#e0e7f0] hover:border-[#c0d0e8] hover:shadow-md"
              )}
            >
              <div className="relative">
                <img
                  src={src as string}
                  alt=""
                  className="h-[145px] w-full object-cover"
                />
                {i % 3 === 0 && (
                  <span className="absolute right-1.5 top-1.5 rounded bg-[#ffcc45] px-1.5 py-1 text-[7px] font-bold text-[#594200]">
                    PRO
                  </span>
                )}
              </div>
              <div className="p-2">
                <div className="truncate text-[9.5px] font-semibold text-[#243758]">
                  {title as string}
                </div>
                <div className="mt-1 text-[8px] text-[#78869d]">{cat as string}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-[9px] text-[#62738f]">
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="rounded border border-[#1769df] bg-[#eef6ff] px-2 py-1 text-[#1769df]">
            1
          </span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
          <span>...</span>
          <span>13</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="rounded-xl border border-[#e0e7f0] bg-white p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-[#17294b]">
            Template Preview
          </h3>
          <Heart className="h-4 w-4 text-[#f02e3e]" />
        </div>
        <img
          src={templates[selected]![2] as string}
          alt=""
          className="h-[325px] w-full rounded-lg object-cover"
        />
        <div className="mt-2 text-[12px] font-semibold text-[#243758]">
          {templates[selected]![0] as string}
        </div>
        <p className="mt-1 text-[9.5px] leading-4 text-[#6a7891]">
          A clean and impactful template for social awareness, environmental
          campaigns and community participation.
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {["#Environment", "#CleanGanga", "#Awareness", "#Sustainability"].map(
            (x) => (
              <span
                key={x}
                className="rounded-full bg-[#eef5ff] px-2 py-1 text-[8px] text-[#1769df]"
              >
                {x}
              </span>
            )
          )}
        </div>
        <button className="mt-3 h-9 w-full rounded-xl bg-gradient-to-r from-[#f02736] to-[#ff6b35] text-[10px] font-semibold text-white shadow-md shadow-[#f02736]/20 transition hover:shadow-lg hover:shadow-[#f02736]/30">
          <Camera className="mr-1 inline h-3 w-3" />
          Use This Template
        </button>
        <button className="mt-1.5 h-9 w-full rounded-md border border-[#dce5f0] text-[10px] font-semibold text-[#435674]">
          <Pencil className="mr-1 inline h-3 w-3" />
          Customize in Editor
        </button>
        <div className="mt-3 border-t border-[#edf1f6] pt-3">
          <h4 className="text-[10px] font-semibold text-[#243758]">
            Template Details
          </h4>
          <div className="mt-2 grid grid-cols-2 gap-y-2 text-[8.5px]">
            <span className="text-[#8996a9]">Platform</span>
            <span className="text-right font-medium text-[#51627f]">
              Instagram
            </span>
            <span className="text-[#8996a9]">Image Ratio</span>
            <span className="text-right font-medium text-[#51627f]">
              1080 × 1350 (4:5)
            </span>
            <span className="text-[#8996a9]">Media Type</span>
            <span className="text-right font-medium text-[#51627f]">
              Image (JPG, PNG)
            </span>
            <span className="text-[#8996a9]">Preset Text</span>
            <span className="text-right font-medium text-[#51627f]">
              Fully Editable
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const drafts = [
  ["Cleaner Rivers Brighter Tomorrow", "Instagram", "Clean Ganga Awareness", "Sep 4, 2025", imageUrls.river],
  ["Behind the Scenes", "Facebook", "Volunteer Stories", "Sep 3, 2025", imageUrls.cleanup],
  ["World Environment Day", "LinkedIn", "Environment Day", "Sep 1, 2025", imageUrls.nature],
  ["This or That?", "Instagram", "Engagement", "Aug 28, 2025", imageUrls.lake],
  ["Tips for a Cleaner India", "WhatsApp", "Educational", "Aug 26, 2025", imageUrls.water],
  ["Special Offer", "Google Business", "Offers & Promotions", "Aug 24, 2025", imageUrls.lake],
  ["Motivational Quote", "YouTube", "Quotes & Motivation", "Aug 20, 2025", imageUrls.nature],
  ["Join Our Mission", "Website", "Recruitment", "Aug 18, 2025", imageUrls.people],
];

function SavedDraftsTab() {
  const [view, setView] = useState<"list" | "grid">("list");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_310px] gap-2.5">
      <div className="rounded-xl border border-[#e0e7f0] bg-white p-2.5">
        <ChannelStrip all selected="All Channels" />
        <div className="mt-2.5 flex gap-2">
          <div className="flex h-9 flex-1 items-center gap-2 rounded-md border border-[#dce5f0] px-3 text-[10px] text-[#8a97aa]">
            <Search className="h-3.5 w-3.5" />
            Search drafts...
          </div>
          {["All Projects", "All Campaigns", "All Channels", "Last Modified"].map(
            (x) => (
              <button
                key={x}
                className="flex h-9 items-center gap-2 rounded-md border border-[#dce5f0] px-3 text-[9px] font-medium text-[#586a87]"
              >
                {x}
                <ChevronDown className="h-3 w-3" />
              </button>
            )
          )}
          <button
            onClick={() => setView("list")}
            className={cn(
              "rounded-md border px-2.5",
              view === "list"
                ? "border-[#1769df] bg-[#eef6ff] text-[#1769df]"
                : "border-[#dce5f0]"
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={cn(
              "rounded-md border px-2.5",
              view === "grid"
                ? "border-[#1769df] bg-[#eef6ff] text-[#1769df]"
                : "border-[#dce5f0]"
            )}
          >
            <Grid2X2 className="h-4 w-4" />
          </button>
        </div>

        {view === "list" ? (
          <div className="mt-2 overflow-hidden rounded-lg border border-[#e5ebf2]">
            <div className="grid grid-cols-[30px_minmax(240px,1.6fr)_140px_170px_110px_105px_80px] gap-2 bg-[#f8fafc] px-2.5 py-2 text-[8.5px] font-semibold uppercase tracking-wide text-[#7a889e]">
              <span />
              <span>Content</span>
              <span>Channel</span>
              <span>Project / Campaign</span>
              <span>Last Modified</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {drafts.map(([title, channel, campaign, date, src], i) => (
              <div
                key={title}
                className="grid grid-cols-[30px_minmax(240px,1.6fr)_140px_170px_110px_105px_80px] items-center gap-2 border-t border-[#edf1f6] px-2.5 py-2"
              >
                <input type="checkbox" defaultChecked={i === 0} className="accent-[#1769df]" />
                <div className="flex min-w-0 items-center gap-2">
                  <img
                    src={src}
                    alt=""
                    className="h-9 w-12 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[9.5px] font-semibold text-[#26395a]">
                      {title}
                    </div>
                    <div className="truncate text-[8.5px] text-[#8490a4]">
                      Small actions create a cleaner...
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-medium text-[#526580]">
                  <PlatformIcon platform={channel as Platform} size="sm" />
                  {channel}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[9px] font-semibold text-[#526580]">
                    Moksha Sewa
                  </div>
                  <div className="truncate text-[8px] text-[#8793a7]">
                    {campaign}
                  </div>
                </div>
                <div className="text-[8.5px] text-[#667893]">
                  {date}
                  <br />
                  02:14 PM
                </div>
                <span className="w-fit rounded-full bg-[#f0f3f7] px-2 py-1 text-[8px] font-semibold text-[#61718b]">
                  Draft
                </span>
                <div className="flex items-center gap-2 text-[#5e708d]">
                  <Pencil className="h-3.5 w-3.5" />
                  <Copy className="h-3.5 w-3.5" />
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-4 gap-2.5">
            {drafts.map(([title, channel, campaign, date, src]) => (
              <div
                key={title}
                className="overflow-hidden rounded-lg border border-[#e0e7f0]"
              >
                <img src={src} alt="" className="h-32 w-full object-cover" />
                <div className="p-2.5">
                  <div className="truncate text-[9.5px] font-semibold text-[#26395a]">
                    {title}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <PlatformIcon platform={channel as Platform} size="sm" />
                    <span className="text-[8.5px] text-[#687993]">{channel}</span>
                  </div>
                  <div className="mt-2 text-[8px] text-[#8793a7]">{date}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between border-t border-[#edf1f6] pt-2.5">
          <span className="text-[9px] text-[#687993]">Selected 1 draft</span>
          <div className="flex gap-1.5">
            {["Edit", "Duplicate", "Move to Campaign", "Delete"].map((x) => (
              <button
                key={x}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-[9px] font-semibold",
                  x === "Delete"
                    ? "border-[#ffd0d4] text-[#e72d3d]"
                    : "border-[#dce5f0] text-[#526580]"
                )}
              >
                {x}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="rounded-xl border border-[#e0e7f0] bg-white p-2.5">
          <h3 className="mb-2 text-[12px] font-semibold text-[#17294b]">
            Draft Preview
          </h3>
          <PreviewCard draft />
        </div>
        <div className="rounded-xl border border-[#e0e7f0] bg-white p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold text-[#17294b]">
              Draft Details
            </h3>
            <Edit3 className="h-3.5 w-3.5 text-[#1769df]" />
          </div>
          <div className="mt-2.5 space-y-2 text-[9px]">
            {[
              ["Project", "Moksha Sewa"],
              ["Campaign", "Clean Ganga Awareness"],
              ["Media", "1 Image (1080 × 1350)"],
              ["Created", "Sep 4, 2025, 02:14 PM"],
              ["Last Modified", "Sep 4, 2025, 02:14 PM"],
              ["Created by", "Manish Sirohi"],
            ].map(([a, b]) => (
              <div key={a} className="flex justify-between gap-2">
                <span className="text-[#8a97aa]">{a}</span>
                <span className="text-right font-medium text-[#526580]">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const ideas = [
  ["Clean Ganga Campaign", "Spread awareness about keeping our rivers clean for a better tomorrow.", "Image", imageUrls.river, "Environment"],
  ["Tips for a Cleaner India", "Simple everyday actions can make a big difference.", "Reel", imageUrls.nature, "Tips"],
  ["Behind the Scenes", "A glimpse of our team in action during the cleanup drive.", "Reel", imageUrls.cleanup, "Community"],
  ["Inspirational Quote", "Thoughtful words to inspire positive action.", "Image", imageUrls.lake, "Quotes"],
  ["World Environment Day", "Celebrate nature and take a pledge for a greener planet.", "Image", imageUrls.nature, "Environment"],
  ["Volunteer Stories", "Real stories of people making a difference.", "Video", imageUrls.people, "Community"],
  ["Save Water Awareness", "Every drop counts. Conserve water for a sustainable future.", "Image", imageUrls.water, "Awareness"],
  ["Festival Greetings", "Spread positivity with your festival wishes.", "Image", imageUrls.lake, "Festivals"],
];

function ContentIdeasTab() {
  const [idea, setIdea] = useState(0);
  const [platform, setPlatform] = useState<Platform | "All Platforms">(
    "All Platforms"
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_310px] gap-2.5">
      <div className="rounded-xl border border-[#e0e7f0] bg-white p-2.5">
        <ChannelStrip all selected={platform} onSelect={(x) => setPlatform(x as Platform | "All Platforms")} />

        <div className="mt-2.5 flex gap-2">
          <div className="flex h-9 flex-1 items-center gap-2 rounded-md border border-[#dce5f0] px-3 text-[10px] text-[#8996aa]">
            <Search className="h-3.5 w-3.5" />
            Search content ideas...
          </div>
          {["All Categories", "🔥 Trending", "All Content Types", "All Occasions"].map(
            (x) => (
              <button
                key={x}
                className="flex h-9 items-center gap-2 rounded-md border border-[#dce5f0] px-3 text-[9px] font-medium text-[#586a87]"
              >
                {x}
                <ChevronDown className="h-3 w-3" />
              </button>
            )
          )}
          <button className="flex h-9 items-center gap-1.5 rounded-md bg-[#f1eaff] px-3 text-[9px] font-semibold text-[#6a39d7]">
            <Sparkles className="h-3 w-3" />
            Generate with AI
          </button>
        </div>

        <div className="mt-2.5 flex gap-1.5 overflow-x-auto">
          {["All", "Environment", "Awareness", "Tips & How To", "Events", "Quotes", "Behind the Scenes", "Community", "Product/Service", "Festivals", "Trending"].map(
            (x, i) => (
              <button
                key={x}
                className={cn(
                  "flex h-9 shrink-0 items-center rounded-md border px-3 text-[9px] font-medium",
                  i === 0
                    ? "border-[#1769df] bg-[#eef6ff] text-[#1769df]"
                    : "border-[#e2e8f0] text-[#667893]"
                )}
              >
                {x}
              </button>
            )
          )}
        </div>

        <div className="mt-2.5 grid grid-cols-4 gap-2.5">
          {ideas.map(([title, desc, type, src, cat], i) => (
            <button
              key={title}
              onClick={() => setIdea(i)}
              className={cn(
                "overflow-hidden rounded-lg border bg-white text-left",
                idea === i ? "border-[#1769df]" : "border-[#e0e7f0]"
              )}
            >
              <div className="relative">
                <img src={src} alt="" className="h-32 w-full object-cover" />
                <span className="absolute right-1.5 top-1.5 rounded bg-white/90 px-1.5 py-1 text-[7.5px] font-semibold text-[#546680]">
                  {type}
                </span>
              </div>
              <div className="p-2">
                <div className="text-[10px] font-semibold text-[#243758]">{title}</div>
                <div className="mt-1 h-7 overflow-hidden text-[8.5px] leading-3.5 text-[#7a889e]">
                  {desc}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="rounded bg-[#eef5ff] px-1.5 py-0.5 text-[7.5px] text-[#1769df]">
                    #{String(cat).replace(/\s/g, "")}
                  </span>
                  <span className="rounded bg-[#eef5ff] px-1.5 py-0.5 text-[7.5px] text-[#1769df]">
                    #Sustainability
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="flex h-6 flex-1 items-center justify-center rounded-md border border-[#dce5f0] text-[8.5px] font-semibold text-[#1769df]">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Use Template
                  </span>
                  <span className="flex h-6 w-7 items-center justify-center rounded-md border border-[#dce5f0]">
                    <Bookmark className="h-3 w-3 text-[#657590]" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-[9px] text-[#62738f]">
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="rounded border border-[#1769df] bg-[#eef6ff] px-2 py-1 text-[#1769df]">1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
          <span>...</span>
          <span>12</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="rounded-xl border border-[#e0e7f0] bg-white p-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-[#17294b]">Idea Details</h3>
          <Heart className="h-4 w-4 text-[#f02e3e]" />
        </div>
        <img src={ideas[idea]![3]} alt="" className="mt-2 h-40 w-full rounded-lg object-cover" />
        <div className="mt-2 text-[14px] font-semibold text-[#243758]">{ideas[idea]![0]}</div>
        <p className="mt-1.5 text-[9.5px] leading-4 text-[#64748c]">{ideas[idea]![1]}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {["#CleanGanga", "#Awareness", "#Sustainability", "#MokshaSewa"].map((x) => (
            <span key={x} className="rounded-full bg-[#eef5ff] px-2 py-1 text-[8px] text-[#1769df]">{x}</span>
          ))}
        </div>
        <div className="my-3 border-t border-[#edf1f6] pt-3">
          {[
            ["Category", "Environment"],
            ["Content Type", ideas[idea]![2]],
            ["Suggested Platforms", "Instagram · Facebook · LinkedIn"],
            ["Best Time to Post", "09:00 AM – 11:00 AM"],
            ["Estimated Reach", "High ▮▮▮"],
            ["Trending Score", "92/100"],
          ].map(([a, b]) => (
            <div key={a} className="mb-2 flex justify-between gap-3 text-[8.5px]">
              <span className="text-[#8996a9]">{a}</span>
              <span className="text-right font-medium text-[#526580]">{b}</span>
            </div>
          ))}
        </div>
        <button className="h-9 w-full rounded-md bg-[#f02736] text-[10px] font-semibold text-white">
          <Send className="mr-1 inline h-3 w-3" />
          Use This Idea
        </button>
        <button className="mt-1.5 h-9 w-full rounded-md border border-[#dce5f0] text-[10px] font-semibold text-[#435674]">
          <Sparkles className="mr-1 inline h-3 w-3" />
          Customize with AI
        </button>
      </div>
    </div>
  );
}

const approvals = [
  ["Cleaner Rivers Brighter Tomorrow", "Instagram", "Manish Sirohi", "Sep 4, 2025", "Pending", imageUrls.river],
  ["Behind the Scenes", "Facebook", "Prateeksha", "Sep 3, 2025", "Approved", imageUrls.cleanup],
  ["Small Actions Big Change", "LinkedIn", "Ankit Kumar", "Sep 2, 2025", "Changes Requested", imageUrls.water],
  ["World Environment Day", "YouTube", "Ritu Pandey", "Aug 30, 2025", "Pending", imageUrls.nature],
  ["Tips for a Cleaner India", "WhatsApp", "Neha Sharma", "Aug 29, 2025", "Approved", imageUrls.water],
  ["Save Water Save Life", "Instagram", "Manish Sirohi", "Aug 26, 2025", "Pending", imageUrls.water],
  ["Festival Greetings", "Google Business", "Prateeksha", "Aug 24, 2025", "Approved", imageUrls.lake],
  ["Join Our Mission", "Website", "Ankit Kumar", "Aug 22, 2025", "Changes Requested", imageUrls.people],
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending: "bg-gradient-to-r from-[#fef3cd] to-[#fff6df] text-[#b8860b] border border-[#ffeaa0]",
    Approved: "bg-gradient-to-r from-[#d4f8e8] to-[#e9f9f1] text-[#15803d] border border-[#a7f3d0]",
    "Changes Requested": "bg-gradient-to-r from-[#ffe0e3] to-[#ffe9eb] text-[#dc2626] border border-[#fecaca]",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-semibold shadow-sm", map[status])}>
      {status}
    </span>
  );
}

function ApprovalsTab() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_310px] gap-2.5">
      <div className="rounded-xl border border-[#e0e7f0] bg-white p-2.5">
        <ChannelStrip all selected="All Channels" />
        <div className="mt-2.5 grid grid-cols-4 gap-2">
          {[
            ["12", "Pending Review", "bg-[#fff6df] text-[#c88900]", AlarmClock],
            ["8", "Approved", "bg-[#e9f9f1] text-[#1aa86a]", Check],
            ["3", "Changes Requested", "bg-[#ffe9eb] text-[#e72d3d]", FileText],
            ["5", "Scheduled", "bg-[#eef5ff] text-[#1769df]", CalendarDays],
          ].map(([n, label, color, Icon]) => {
            const LucideIcon = Icon as React.FC<{ className?: string }>;
            return (
              <div key={label as string} className="rounded-lg border border-[#e0e7f0] p-2.5">
                <div className="flex items-center gap-2">
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", color as string)}>
                    <LucideIcon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-[#243758]">{n as string}</div>
                    <div className="text-[8.5px] text-[#75849c]">{label as string}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2.5 flex gap-2">
          <div className="flex h-9 flex-1 items-center gap-2 rounded-md border border-[#dce5f0] px-3 text-[10px] text-[#8996aa]">
            <Search className="h-3.5 w-3.5" />
            Search posts, campaigns...
          </div>
          {["All Projects", "All Campaigns", "All Channels", "All Statuses", "Newest First"].map((x) => (
            <button key={x} className="flex h-9 items-center gap-2 rounded-md border border-[#dce5f0] px-3 text-[9px] font-medium text-[#586a87]">
              {x}<ChevronDown className="h-3 w-3" />
            </button>
          ))}
        </div>

        <div className="mt-2 overflow-hidden rounded-lg border border-[#e5ebf2]">
          <div className="grid grid-cols-[30px_minmax(220px,1.6fr)_120px_145px_115px_110px_70px] gap-2 bg-[#f8fafc] px-2.5 py-2 text-[8px] font-semibold uppercase tracking-wide text-[#7a889e]">
            <span />
            <span>Content</span><span>Channel</span><span>Project / Campaign</span>
            <span>Submitted By</span><span>Status</span><span>Actions</span>
          </div>
          {approvals.map(([title, channel, by, date, status, src], i) => (
            <button
              key={title}
              onClick={() => setSelected(i)}
              className={cn(
                "grid w-full grid-cols-[30px_minmax(220px,1.6fr)_120px_145px_115px_110px_70px] items-center gap-2 border-t border-[#edf1f6] px-2.5 py-2 text-left",
                selected === i && "bg-[#f8fbff]"
              )}
            >
              <input type="checkbox" className="accent-[#1769df]" onClick={(e) => e.stopPropagation()} />
              <div className="flex min-w-0 items-center gap-2">
                <img src={src} alt="" className="h-8 w-11 shrink-0 rounded object-cover" />
                <div className="min-w-0">
                  <div className="truncate text-[9px] font-semibold text-[#26395a]">{title}</div>
                  <div className="text-[8px] text-[#8793a7]">Image Post</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <PlatformIcon platform={channel as Platform} size="sm" />
                <span className="text-[8.5px] text-[#526580]">{channel}</span>
              </div>
              <div>
                <div className="text-[8.5px] font-semibold text-[#526580]">Moksha Sewa</div>
                <div className="text-[8px] text-[#8793a7]">Clean Ganga Awareness</div>
              </div>
              <div>
                <div className="text-[8.5px] font-semibold text-[#526580]">{by}</div>
                <div className="text-[8px] text-[#8793a7]">{date}</div>
              </div>
              <StatusBadge status={status!} />
              <div className="flex items-center gap-2 text-[#5f718d]">
                <MessageCircle className="h-3.5 w-3.5" />
                <MoreHorizontal className="h-3.5 w-3.5" />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[9px] text-[#6b7b94]">
          <span>0 of 8 selected</span>
          <div className="flex items-center gap-2">
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="rounded border border-[#1769df] bg-[#eef6ff] px-2 py-1 text-[#1769df]">1</span>
            <span>2</span><span>3</span><span>4</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
          <span>Showing 1–8 of 28 items</span>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="rounded-xl border border-[#e0e7f0] bg-white p-2.5">
          <h3 className="mb-2 text-[12px] font-semibold text-[#17294b]">Post Preview</h3>
          <PreviewCard />
        </div>

        <div className="rounded-xl border border-[#e0e7f0] bg-white p-3">
          <h3 className="text-[11px] font-semibold text-[#17294b]">Approval Workflow</h3>
          <div className="mt-3 border-l-2 border-[#dfe7f1] pl-4">
            {[
              ["Draft Created", "by Manish Sirohi", true],
              ["Pending Approval", "Content Team · Waiting for review", true],
              ["Approved", "Waiting", false],
              ["Scheduled", "Waiting", false],
            ].map(([title, sub, done], i) => (
              <div key={title as string} className="relative mb-4">
                <span className={cn("absolute -left-[23px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white", done ? "bg-[#20b77a] text-white" : "bg-white border-[#d8e0eb]")}>
                  {done && <Check className="h-2.5 w-2.5" />}
                </span>
                <div className={cn("text-[9.5px] font-semibold", i === 1 ? "text-[#1769df]" : "text-[#526580]")}>{title as string}</div>
                <div className="mt-0.5 text-[8.5px] text-[#8996a9]">{sub as string}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#edf1f6] pt-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-semibold text-[#243758]">Approval Comments (2)</h4>
              <span className="text-[8.5px] text-[#1769df]">View All</span>
            </div>
            <div className="mt-2 flex gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eaf0fa] text-[8px] font-bold text-[#526580]">AK</span>
              <div>
                <div className="text-[9px] font-semibold text-[#526580]">Ankit Kumar</div>
                <div className="text-[8px] text-[#8a97aa]">Sep 4, 2025, 03:10 PM</div>
                <p className="mt-1 text-[9px] leading-4 text-[#657590]">
                  Looks good! Can we change the tagline to “Together for a Cleaner Tomorrow”?
                </p>
              </div>
            </div>
            <div className="mt-2 flex gap-1.5">
              <input className="h-8 flex-1 rounded-md border border-[#dce5f0] px-2 text-[9px] outline-none" placeholder="Add a comment..." />
              <button className="w-8 rounded-md border border-[#dce5f0] text-[#526580]"><Send className="mx-auto h-3 w-3" /></button>
            </div>
            <div className="mt-3 flex gap-1.5">
              <button className="h-8 flex-1 rounded-md bg-[#f02736] text-[9px] font-semibold text-white">✓ Approve</button>
              <button className="h-8 flex-1 rounded-md border border-[#f02736] text-[9px] font-semibold text-[#f02736]">Request Changes</button>
              <button className="h-8 rounded-md border border-[#dce5f0] px-2 text-[9px] font-semibold text-[#526580]">Reject</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopActions({
  activeTab,
}: {
  activeTab: Tab;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between rounded-xl bg-gradient-to-r from-[#1a2b5c] via-[#1e3a7a] to-[#1769df] px-5 py-3.5 shadow-lg shadow-[#1769df]/10">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.5px] text-white">
            Content Studio
          </h1>
          <p className="mt-0.5 text-[11px] text-blue-200">
            Create, customize and publish content across all your channels.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="hidden text-right xl:block">
          <div className="text-[10px] italic text-blue-200">
            "One idea. Multiple platforms.
          </div>
          <div className="text-[10px] italic text-blue-200">
            Greater impact."
          </div>
        </div>
        <button className="h-9 rounded-lg border border-white/25 bg-white/10 px-3.5 text-[10px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
          <Bookmark className="mr-1.5 inline h-3 w-3" />
          Save Draft
        </button>
        <button className="h-9 rounded-lg bg-gradient-to-r from-[#f02736] to-[#ff6b35] px-4 text-[10px] font-semibold text-white shadow-md shadow-[#f02736]/25 transition hover:shadow-lg hover:shadow-[#f02736]/30">
          <Send className="mr-1.5 inline h-3 w-3" />
          Publish <ChevronDown className="ml-1 inline h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function ContentStudio() {
  const [activeTab, setActiveTab] = useState<Tab>("Create");
  const [postType, setPostType] = useState<PostType>("Image");

  const tabs: Tab[] = [
    "Create",
    "AI Assistant",
    "Templates",
    "Saved Drafts",
    "Content Ideas",
    "Approvals",
  ];

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case "Create":
        return <CreateTab postType={postType} setPostType={setPostType} />;
      case "AI Assistant":
        return <AIAssistantTab />;
      case "Templates":
        return <TemplatesTab />;
      case "Saved Drafts":
        return <SavedDraftsTab />;
      case "Content Ideas":
        return <ContentIdeasTab />;
      case "Approvals":
        return <ApprovalsTab />;
    }
  }, [activeTab, postType]);

  return (
    <div className="w-full min-w-0 bg-gradient-to-br from-[#f0f4ff] via-[#f7f9fc] to-[#fef4f5] text-[#243758]">
      {/* Layout intentionally excluded: sidebar, global topbar and footer belong to the parent app. */}
      <TopActions activeTab={activeTab} />

      <div className="rounded-xl border border-[#e0e7f0] bg-white px-2.5 shadow-sm shadow-black/[0.03]">
        <div className="flex h-11 items-end gap-0.5 overflow-x-auto border-b border-[#edf1f6]">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative h-11 shrink-0 px-4 text-[10.5px] font-semibold transition-all duration-200",
                activeTab === tab
                  ? "text-[#f02736]"
                  : "text-[#60718c] hover:text-[#26395a] hover:bg-[#f8fafc]"
              )}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-t-full bg-gradient-to-r from-[#f02736] to-[#ff6b35]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2.5">{activeContent}</div>
    </div>
  );
}
