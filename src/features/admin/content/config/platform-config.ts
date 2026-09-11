import type { Platform, ContentType, MediaRatio } from "../types/content.types";

/* ── Ratio metadata ── */
export type RatioMeta = {
  ratio: MediaRatio;
  label: string;
  resolution: string;
};

export const RATIO_OPTIONS: RatioMeta[] = [
  { ratio: "1:1", label: "Square", resolution: "1080 × 1080" },
  { ratio: "4:5", label: "Portrait", resolution: "1080 × 1350" },
  { ratio: "9:16", label: "Story / Reel", resolution: "1080 × 1920" },
  { ratio: "16:9", label: "Landscape", resolution: "1920 × 1080" },
  { ratio: "1.91:1", label: "Wide", resolution: "1200 × 627" },
];

/* ── Platform icon / label / color ── */
export type PlatformMeta = {
  label: string;
  short: string;
  color: string;
  bg: string;
  icon: string;
};

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  instagram:       { label: "Instagram",       short: "Instagram",  color: "#E1306C", bg: "#FDF0F4", icon: "📷" },
  facebook:        { label: "Facebook",         short: "Facebook",   color: "#1877F2", bg: "#EDF5FF", icon: "📘" },
  linkedin:        { label: "LinkedIn",         short: "LinkedIn",   color: "#0A66C2", bg: "#EDF6FF", icon: "💼" },
  "google-business": { label: "Google Business", short: "Google Biz", color: "#4285F4", bg: "#F0F6FF", icon: "📍" },
  whatsapp:        { label: "WhatsApp",         short: "WhatsApp",   color: "#25D366", bg: "#EFFCF4", icon: "💬" },
  youtube:         { label: "YouTube",          short: "YouTube",    color: "#FF0000", bg: "#FFF0F0", icon: "▶️" },
  website:         { label: "Website",          short: "Website",    color: "#60708D", bg: "#F1F4F8", icon: "🌐" },
};

/* ── Content types per platform ── */
export const PLATFORM_CONTENT_TYPES: Record<Platform, ContentType[]> = {
  instagram: ["image", "video", "reel", "story", "carousel"],
  facebook: ["image", "video", "reel", "story", "carousel"],
  linkedin: ["image", "video", "carousel", "article"],
  "google-business": ["image", "video"],
  whatsapp: ["image", "video", "document"],
  youtube: ["video", "reel"],
  website: ["article", "image"],
};

/* ── Placements per content type per platform ── */
export const PLACEMENTS: Record<Platform, Record<string, string[]>> = {
  instagram: {
    image: ["Feed Post", "Carousel"],
    video: ["Feed Video"],
    reel: ["Reel"],
    story: ["Story"],
    carousel: ["Carousel"],
  },
  facebook: {
    image: ["Feed", "Story"],
    video: ["Feed", "Reel"],
    reel: ["Reel"],
    story: ["Story"],
    carousel: ["Carousel"],
  },
  linkedin: {
    image: ["Image Post", "Link Post"],
    video: ["Video"],
    carousel: ["Document / Carousel"],
    article: ["Article"],
  },
  "google-business": {
    image: ["Photo", "Update"],
    video: ["Video"],
  },
  whatsapp: {
    image: ["Image", "Template"],
    video: ["Video", "Template"],
    document: ["Document"],
  },
  youtube: {
    video: ["Video"],
    reel: ["Short"],
  },
  website: {
    article: ["Blog", "Announcement"],
    image: ["Banner"],
  },
};

/* ── Default ratio per platform ── */
export const DEFAULT_RATIO: Record<Platform, MediaRatio> = {
  instagram: "4:5",
  facebook: "1:1",
  linkedin: "1.91:1",
  "google-business": "4:5",
  whatsapp: "1:1",
  youtube: "16:9",
  website: "16:9",
};

/* ── Ratio overrides for auto-adapt ── */
export const AUTO_ADAPT_MAP: Record<MediaRatio, Record<Platform, MediaRatio>> = {
  "1:1":   { instagram: "1:1", facebook: "1:1", linkedin: "1.91:1", "google-business": "1:1", whatsapp: "1:1", youtube: "16:9", website: "16:9" },
  "4:5":   { instagram: "4:5", facebook: "1:1", linkedin: "1.91:1", "google-business": "4:5", whatsapp: "1:1", youtube: "16:9", website: "16:9" },
  "9:16":  { instagram: "9:16", facebook: "9:16", linkedin: "1.91:1", "google-business": "4:5", whatsapp: "1:1", youtube: "9:16", website: "16:9" },
  "16:9":  { instagram: "16:9", facebook: "16:9", linkedin: "1.91:1", "google-business": "16:9", whatsapp: "1:1", youtube: "16:9", website: "16:9" },
  "1.91:1": { instagram: "1.91:1", facebook: "1.91:1", linkedin: "1.91:1", "google-business": "1.91:1", whatsapp: "1:1", youtube: "16:9", website: "16:9" },
};

/* ── Connection mock ── */
export const MOCK_CONNECTIONS: Record<Platform, { status: "connected" | "disconnected" | "pending"; account: string }> = {
  instagram: { status: "connected", account: "@mokshasewa" },
  facebook: { status: "connected", account: "Moksha Sewa" },
  linkedin: { status: "connected", account: "Moksha Sewa Foundation" },
  "google-business": { status: "connected", account: "Moksha Sewa, Varanasi" },
  whatsapp: { status: "connected", account: "+91 98765 43210" },
  youtube: { status: "connected", account: "Moksha Sewa" },
  website: { status: "connected", account: "mokshasewa.org" },
};

/* ── All platforms list ── */
export const ALL_PLATFORMS: Platform[] = ["instagram", "facebook", "linkedin", "google-business", "whatsapp", "youtube", "website"];
