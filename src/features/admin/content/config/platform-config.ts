import type { Platform, ContentType, MediaRatio, RatioSpec, PlatformContentTypeSpec } from "../types/content.types";

/* ── Platform icon / label / color ── */
export type PlatformMeta = {
  label: string;
  short: string;
  color: string;
  bg: string;
  icon: string;
};

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  instagram:        { label: "Instagram",        short: "IG",   color: "#E1306C", bg: "#FDF0F4", icon: "📷" },
  facebook:         { label: "Facebook",         short: "FB",   color: "#1877F2", bg: "#EDF5FF", icon: "📘" },
  linkedin:         { label: "LinkedIn",         short: "LI",   color: "#0A66C2", bg: "#EDF6FF", icon: "💼" },
  youtube:          { label: "YouTube",          short: "YT",   color: "#FF0000", bg: "#FFF0F0", icon: "▶️" },
  tiktok:           { label: "TikTok",           short: "TT",   color: "#000000", bg: "#F1F1F1", icon: "🎵" },
  x:                { label: "X",                short: "X",    color: "#000000", bg: "#F1F1F1", icon: "𝕏" },
  pinterest:        { label: "Pinterest",        short: "Pin",  color: "#E60023", bg: "#FFF0F0", icon: "📌" },
  threads:          { label: "Threads",          short: "Thr",  color: "#000000", bg: "#F1F1F1", icon: "@" },
  whatsapp:         { label: "WhatsApp",         short: "WA",   color: "#25D366", bg: "#EFFCF4", icon: "💬" },
  "google-business": { label: "Google Business", short: "GB",   color: "#4285F4", bg: "#F0F6FF", icon: "📍" },
  website:          { label: "Website",          short: "Web",  color: "#60708D", bg: "#F1F4F8", icon: "🌐" },
  email:            { label: "Email",            short: "Email", color: "#7C3AED", bg: "#F5F0FF", icon: "✉️" },
};

/* ── Content types per platform ── */
export const PLATFORM_CONTENT_TYPES: Record<Platform, PlatformContentTypeSpec[]> = {
  instagram: [
    { id: "feed-post", label: "Feed Post", icon: "📷", ratioOptions: [{ ratio: "4:5", label: "Portrait", resolution: "1080 × 1350", recommended: true }, { ratio: "1:1", label: "Square", resolution: "1080 × 1080" }, { ratio: "1.91:1", label: "Landscape", resolution: "1200 × 627" }], defaultRatio: "4:5", placements: ["Feed Post"], fields: ["caption", "hashtags", "location", "tagPeople", "productTags", "collaborator", "music", "altText", "firstComment", "cta"] },
    { id: "carousel", label: "Carousel", icon: "🖼️", ratioOptions: [{ ratio: "4:5", label: "Portrait", resolution: "1080 × 1350", recommended: true }, { ratio: "1:1", label: "Square", resolution: "1080 × 1080" }], defaultRatio: "4:5", placements: ["Carousel"], fields: ["caption", "hashtags", "location", "altText", "firstComment"] },
    { id: "reel", label: "Reel", icon: "▶️", ratioOptions: [{ ratio: "9:16", label: "Vertical", resolution: "1080 × 1920", recommended: true }], defaultRatio: "9:16", placements: ["Reel"], fields: ["caption", "hashtags", "location", "music", "autoCaptions", "altText", "firstComment"] },
    { id: "story", label: "Story", icon: "⭕", ratioOptions: [{ ratio: "9:16", label: "Vertical", resolution: "1080 × 1920", recommended: true }], defaultRatio: "9:16", placements: ["Story"], fields: ["caption", "location", "music", "altText"] },
  ],
  facebook: [
    { id: "feed-post", label: "Feed Post", icon: "📄", ratioOptions: [{ ratio: "1.91:1", label: "Landscape", resolution: "1200 × 627", recommended: true }, { ratio: "4:5", label: "Portrait", resolution: "1080 × 1350" }, { ratio: "1:1", label: "Square", resolution: "1080 × 1080" }], defaultRatio: "1.91:1", placements: ["Feed", "Right Column"], fields: ["caption", "linkPreview", "cta", "location", "tags", "altText", "firstComment"] },
    { id: "story", label: "Story", icon: "⭕", ratioOptions: [{ ratio: "9:16", label: "Vertical", resolution: "1080 × 1920", recommended: true }], defaultRatio: "9:16", placements: ["Story"], fields: ["caption", "altText"] },
    { id: "reel", label: "Reel", icon: "▶️", ratioOptions: [{ ratio: "9:16", label: "Vertical", resolution: "1080 × 1920", recommended: true }], defaultRatio: "9:16", placements: ["Reel"], fields: ["caption", "music", "altText"] },
    { id: "video", label: "Video", icon: "🎬", ratioOptions: [{ ratio: "16:9", label: "Landscape", resolution: "1920 × 1080", recommended: true }, { ratio: "1:1", label: "Square", resolution: "1080 × 1080" }], defaultRatio: "16:9", placements: ["Feed"], fields: ["caption", "title", "description", "tags", "altText"] },
    { id: "link-post", label: "Link Post", icon: "🔗", ratioOptions: [{ ratio: "1.91:1", label: "Landscape", resolution: "1200 × 627", recommended: true }], defaultRatio: "1.91:1", placements: ["Feed"], fields: ["headline", "description", "link", "cta", "altText"] },
  ],
  linkedin: [
    { id: "image-post", label: "Image Post", icon: "🖼️", ratioOptions: [{ ratio: "1:1", label: "Square", resolution: "1080 × 1080", recommended: true }, { ratio: "4:5", label: "Portrait", resolution: "1080 × 1350" }, { ratio: "1.91:1", label: "Landscape", resolution: "1200 × 627" }], defaultRatio: "1:1", placements: ["Image Post"], fields: ["caption", "mentions", "altText", "firstComment"] },
    { id: "video-post", label: "Video Post", icon: "🎬", ratioOptions: [{ ratio: "1:1", label: "Square", resolution: "1080 × 1080" }, { ratio: "16:9", label: "Landscape", resolution: "1920 × 1080", recommended: true }], defaultRatio: "16:9", placements: ["Video"], fields: ["caption", "description", "tags", "altText"] },
    { id: "carousel", label: "Carousel", icon: "📑", ratioOptions: [{ ratio: "1:1", label: "Square", resolution: "1080 × 1080", recommended: true }], defaultRatio: "1:1", placements: ["Document / Carousel"], fields: ["caption", "document", "mentions"] },
    { id: "document", label: "Document/PDF", icon: "📄", ratioOptions: [{ ratio: "1:1", label: "Square", resolution: "1080 × 1080" }], defaultRatio: "1:1", placements: ["Document / Carousel"], fields: ["caption", "document", "headline"] },
    { id: "poll", label: "Poll", icon: "📊", ratioOptions: [], defaultRatio: "1:1", placements: ["Poll"], fields: ["caption", "pollOptions", "duration"] },
    { id: "link-post", label: "Link Post", icon: "🔗", ratioOptions: [{ ratio: "1.91:1", label: "Landscape", resolution: "1200 × 627", recommended: true }], defaultRatio: "1.91:1", placements: ["Link Post"], fields: ["headline", "description", "link", "cta"] },
    { id: "article", label: "Article", icon: "📝", ratioOptions: [], defaultRatio: "1:1", placements: ["Article"], fields: ["headline", "description", "tags", "canonicalUrl"] },
  ],
  youtube: [
    { id: "video", label: "Video", icon: "🎬", ratioOptions: [{ ratio: "16:9", label: "Landscape", resolution: "1920 × 1080", recommended: true }], defaultRatio: "16:9", placements: ["Video"], fields: ["title", "description", "tags", "thumbnail", "playlist", "visibility", "audience", "category", "subtitles", "language", "madeForKids"] },
    { id: "short", label: "Short", icon: "⚡", ratioOptions: [{ ratio: "9:16", label: "Vertical", resolution: "1080 × 1920", recommended: true }], defaultRatio: "9:16", placements: ["Short"], fields: ["title", "description", "tags", "visibility", "madeForKids"] },
  ],
  tiktok: [
    { id: "video", label: "Video", icon: "🎬", ratioOptions: [{ ratio: "9:16", label: "Vertical", resolution: "1080 × 1920", recommended: true }], defaultRatio: "9:16", placements: ["Feed"], fields: ["caption", "hashtags", "sound", "visibility", "allowComments", "allowDuet", "allowStitch"] },
  ],
  x: [
    { id: "text-post", label: "Text Post", icon: "✏️", ratioOptions: [], defaultRatio: "16:9", placements: ["Feed"], fields: ["caption", "audience", "replySettings", "location"] },
    { id: "image", label: "Image", icon: "🖼️", ratioOptions: [{ ratio: "16:9", label: "Landscape", resolution: "1600 × 900", recommended: true }, { ratio: "1:1", label: "Square", resolution: "1080 × 1080" }], defaultRatio: "16:9", placements: ["Feed"], fields: ["caption", "altText", "audience", "replySettings"] },
    { id: "video", label: "Video", icon: "🎬", ratioOptions: [{ ratio: "16:9", label: "Landscape", resolution: "1920 × 1080", recommended: true }], defaultRatio: "16:9", placements: ["Feed"], fields: ["caption", "audience", "replySettings"] },
    { id: "gif", label: "GIF", icon: "🎞️", ratioOptions: [{ ratio: "16:9", label: "Landscape", resolution: "1600 × 900" }], defaultRatio: "16:9", placements: ["Feed"], fields: ["caption", "audience"] },
    { id: "poll", label: "Poll", icon: "📊", ratioOptions: [], defaultRatio: "1:1", placements: ["Feed"], fields: ["caption", "pollOptions", "pollDuration", "audience"] },
    { id: "thread", label: "Thread", icon: "🧵", ratioOptions: [], defaultRatio: "16:9", placements: ["Feed"], fields: ["caption", "audience"] },
  ],
  pinterest: [
    { id: "pin", label: "Pin", icon: "📌", ratioOptions: [{ ratio: "2:3", label: "Standard", resolution: "1000 × 1500", recommended: true }, { ratio: "1:1", label: "Square", resolution: "1000 × 1000" }], defaultRatio: "2:3", placements: ["Pin"], fields: ["caption", "board", "section", "link", "altText", "category"] },
    { id: "video-pin", label: "Video Pin", icon: "▶️", ratioOptions: [{ ratio: "9:16", label: "Vertical", resolution: "1080 × 1920", recommended: true }], defaultRatio: "9:16", placements: ["Video Pin"], fields: ["caption", "board", "link", "altText"] },
    { id: "carousel", label: "Carousel", icon: "🖼️", ratioOptions: [{ ratio: "2:3", label: "Standard", resolution: "1000 × 1500", recommended: true }], defaultRatio: "2:3", placements: ["Carousel"], fields: ["caption", "board", "link"] },
  ],
  threads: [
    { id: "feed-post", label: "Post", icon: "💬", ratioOptions: [{ ratio: "1:1", label: "Square", resolution: "1080 × 1080" }, { ratio: "4:5", label: "Portrait", resolution: "1080 × 1350" }], defaultRatio: "1:1", placements: ["Feed"], fields: ["caption", "audience", "replySettings"] },
  ],
  whatsapp: [
    { id: "broadcast", label: "Broadcast", icon: "📢", ratioOptions: [{ ratio: "1:1", label: "Square", resolution: "1080 × 1080" }], defaultRatio: "1:1", placements: ["Broadcast"], fields: ["caption", "media", "audienceSegment"] },
    { id: "template-message", label: "Template Message", icon: "📋", ratioOptions: [], defaultRatio: "1:1", placements: ["Template"], fields: ["templateName", "language", "headerType", "headerMedia", "bodyText", "variables", "footer", "ctaButtons"] },
    { id: "status", label: "Status", icon: "⭕", ratioOptions: [{ ratio: "9:16", label: "Vertical", resolution: "1080 × 1920", recommended: true }], defaultRatio: "9:16", placements: ["Status"], fields: ["caption", "media"] },
    { id: "media-message", label: "Media Message", icon: "📎", ratioOptions: [{ ratio: "1:1", label: "Square", resolution: "1080 × 1080" }], defaultRatio: "1:1", placements: ["Media"], fields: ["caption", "media"] },
  ],
  "google-business": [
    { id: "whats-new", label: "What's New", icon: "📣", ratioOptions: [{ ratio: "4:5", label: "Portrait", resolution: "1080 × 1350", recommended: true }, { ratio: "1:1", label: "Square", resolution: "1080 × 1080" }, { ratio: "1.91:1", label: "Landscape", resolution: "1200 × 627" }], defaultRatio: "4:5", placements: ["Update"], fields: ["caption", "cta", "ctaUrl"] },
    { id: "offer", label: "Offer", icon: "🏷️", ratioOptions: [{ ratio: "4:5", label: "Portrait", resolution: "1080 × 1350", recommended: true }], defaultRatio: "4:5", placements: ["Offer"], fields: ["title", "description", "cta", "ctaUrl", "startDate", "endDate", "offerCode", "couponCode", "terms"] },
    { id: "event", label: "Event", icon: "📅", ratioOptions: [{ ratio: "4:5", label: "Portrait", resolution: "1080 × 1350", recommended: true }], defaultRatio: "4:5", placements: ["Event"], fields: ["title", "description", "startDate", "endDate", "cta", "ctaUrl"] },
  ],
  website: [
    { id: "hero-banner", label: "Hero Banner", icon: "🖥️", ratioOptions: [{ ratio: "16:9", label: "Wide", resolution: "1920 × 1080", recommended: true }], defaultRatio: "16:9", placements: ["Hero"], fields: ["headline", "subheadline", "body", "cta", "buttonLabel", "destinationUrl"] },
    { id: "promo-banner", label: "Promo Banner", icon: "🏷️", ratioOptions: [{ ratio: "16:9", label: "Wide", resolution: "1920 × 1080" }, { ratio: "1.91:1", label: "Standard", resolution: "1200 × 627" }], defaultRatio: "16:9", placements: ["Banner"], fields: ["headline", "body", "cta", "buttonLabel", "destinationUrl"] },
    { id: "blog", label: "Blog/Article", icon: "📝", ratioOptions: [{ ratio: "16:9", label: "Wide", resolution: "1920 × 1080" }], defaultRatio: "16:9", placements: ["Blog"], fields: ["headline", "subheadline", "body", "seoTitle", "metaDescription", "ogImage"] },
    { id: "popup", label: "Popup", icon: "🪟", ratioOptions: [{ ratio: "1:1", label: "Square", resolution: "1080 × 1080" }], defaultRatio: "1:1", placements: ["Popup"], fields: ["headline", "body", "cta", "buttonLabel", "destinationUrl"] },
    { id: "landing-page", label: "Landing Page", icon: "📄", ratioOptions: [{ ratio: "16:9", label: "Wide", resolution: "1920 × 1080" }], defaultRatio: "16:9", placements: ["Landing"], fields: ["headline", "subheadline", "body", "cta", "buttonLabel", "destinationUrl", "seoTitle", "metaDescription", "ogImage"] },
  ],
  email: [
    { id: "email-campaign", label: "Email Campaign", icon: "📧", ratioOptions: [], defaultRatio: "1:1", placements: ["Email"], fields: ["subject", "previewText", "fromName", "fromEmail", "replyTo", "body", "cta", "template", "audienceSegment"] },
    { id: "newsletter", label: "Newsletter", icon: "📰", ratioOptions: [], defaultRatio: "1:1", placements: ["Newsletter"], fields: ["subject", "previewText", "fromName", "fromEmail", "body", "cta", "template", "audienceSegment"] },
    { id: "promo-email", label: "Promotional Email", icon: "🏷️", ratioOptions: [], defaultRatio: "1:1", placements: ["Promo"], fields: ["subject", "previewText", "fromName", "fromEmail", "body", "cta", "ctaUrl", "template", "audienceSegment"] },
  ],
};

/* ── All platforms list ── */
export const ALL_PLATFORMS: Platform[] = [
  "instagram", "facebook", "linkedin", "youtube", "tiktok",
  "x", "pinterest", "threads", "whatsapp",
  "google-business", "website", "email",
];

/* ── Connection mock ── */
export const MOCK_CONNECTIONS: Record<Platform, { status: "connected" | "disconnected" | "pending"; account: string }> = {
  instagram:        { status: "connected", account: "@mokshasewa" },
  facebook:         { status: "connected", account: "Moksha Sewa" },
  linkedin:         { status: "connected", account: "Moksha Sewa Foundation" },
  youtube:          { status: "connected", account: "Moksha Sewa" },
  tiktok:           { status: "connected", account: "@mokshasewa" },
  x:                { status: "connected", account: "@mokshasewa" },
  pinterest:        { status: "disconnected", account: "Not connected" },
  threads:          { status: "connected", account: "@mokshasewa" },
  whatsapp:         { status: "connected", account: "+91 98765 43210" },
  "google-business": { status: "connected", account: "Moksha Sewa, Varanasi" },
  website:          { status: "connected", account: "mokshasewa.org" },
  email:            { status: "connected", account: "news@mokshasewa.org" },
};

/* ── Ratio options for global selector ── */
export const RATIO_OPTIONS: Array<{ ratio: MediaRatio; label: string; resolution: string }> = [
  { ratio: "1:1", label: "Square", resolution: "1080 × 1080" },
  { ratio: "4:5", label: "Portrait", resolution: "1080 × 1350" },
  { ratio: "9:16", label: "Story / Reel", resolution: "1080 × 1920" },
  { ratio: "16:9", label: "Landscape", resolution: "1920 × 1080" },
  { ratio: "1.91:1", label: "Wide", resolution: "1200 × 627" },
  { ratio: "2:3", label: "Pinterest", resolution: "1000 × 1500" },
];

/* ── Get available ratios for a platform + content type ── */
export function getRatiosForPlatform(platform: Platform, contentType?: ContentType): RatioSpec[] {
  const specs = PLATFORM_CONTENT_TYPES[platform];
  if (!specs) return RATIO_OPTIONS.map(r => ({ ...r, recommended: false }));
  const spec = contentType ? specs.find(s => s.id === contentType) : specs[0];
  return spec?.ratioOptions ?? RATIO_OPTIONS.map(r => ({ ...r, recommended: false }));
}

/* ── Get default ratio for a platform ── */
export function getDefaultRatioForPlatform(platform: Platform, contentType?: ContentType): MediaRatio {
  const specs = PLATFORM_CONTENT_TYPES[platform];
  if (!specs) return "1:1";
  const spec = contentType ? specs.find(s => s.id === contentType) : specs[0];
  return spec?.defaultRatio ?? "1:1";
}

/* ── Auto adapt ratios ── */
export const AUTO_ADAPT_MAP: Record<MediaRatio, Record<Platform, MediaRatio>> = {
  "1:1":   { instagram: "1:1", facebook: "1:1", linkedin: "1:1", youtube: "16:9", tiktok: "9:16", x: "1:1", pinterest: "2:3", threads: "1:1", whatsapp: "1:1", "google-business": "1:1", website: "16:9", email: "1:1" },
  "4:5":   { instagram: "4:5", facebook: "1:1", linkedin: "1:1", youtube: "16:9", tiktok: "9:16", x: "1:1", pinterest: "2:3", threads: "4:5", whatsapp: "1:1", "google-business": "4:5", website: "16:9", email: "1:1" },
  "9:16":  { instagram: "9:16", facebook: "9:16", linkedin: "1:1", youtube: "9:16", tiktok: "9:16", x: "16:9", pinterest: "9:16", threads: "9:16", whatsapp: "9:16", "google-business": "4:5", website: "16:9", email: "1:1" },
  "16:9":  { instagram: "16:9", facebook: "16:9", linkedin: "1.91:1", youtube: "16:9", tiktok: "9:16", x: "16:9", pinterest: "2:3", threads: "16:9", whatsapp: "1:1", "google-business": "1.91:1", website: "16:9", email: "1:1" },
  "1.91:1": { instagram: "1.91:1", facebook: "1.91:1", linkedin: "1.91:1", youtube: "16:9", tiktok: "9:16", x: "16:9", pinterest: "2:3", threads: "1.91:1", whatsapp: "1:1", "google-business": "1.91:1", website: "16:9", email: "1:1" },
  "2:3":   { instagram: "4:5", facebook: "4:5", linkedin: "1:1", youtube: "16:9", tiktok: "9:16", x: "1:1", pinterest: "2:3", threads: "4:5", whatsapp: "1:1", "google-business": "4:5", website: "16:9", email: "1:1" },
  "custom": { instagram: "1:1", facebook: "1:1", linkedin: "1:1", youtube: "16:9", tiktok: "9:16", x: "1:1", pinterest: "2:3", threads: "1:1", whatsapp: "1:1", "google-business": "1:1", website: "16:9", email: "1:1" },
};

/* ── UTM defaults per platform ── */
export const PLATFORM_UTM_DEFAULTS: Record<Platform, { source: string; medium: string }> = {
  instagram:        { source: "instagram", medium: "social" },
  facebook:         { source: "facebook", medium: "social" },
  linkedin:         { source: "linkedin", medium: "social" },
  youtube:          { source: "youtube", medium: "video" },
  tiktok:           { source: "tiktok", medium: "social" },
  x:                { source: "x", medium: "social" },
  pinterest:        { source: "pinterest", medium: "social" },
  threads:          { source: "threads", medium: "social" },
  whatsapp:         { source: "whatsapp", medium: "messaging" },
  "google-business": { source: "google", medium: "local" },
  website:          { source: "website", medium: "referral" },
  email:            { source: "email", medium: "email" },
};

/* ── Safe zone guidelines per platform ── */
export const SAFE_ZONES: Record<Platform, { top: number; bottom: number; left: number; right: number; description: string }> = {
  instagram:        { top: 10, bottom: 15, left: 5, right: 5, description: "Keep text away from bottom UI elements" },
  facebook:         { top: 5, bottom: 10, left: 5, right: 5, description: "Standard safe zone" },
  linkedin:         { top: 5, bottom: 10, left: 5, right: 5, description: "Standard safe zone" },
  youtube:          { top: 10, bottom: 15, left: 5, right: 5, description: "Avoid bottom player controls" },
  tiktok:           { top: 15, bottom: 25, left: 5, right: 15, description: "Avoid right-side UI and bottom captions" },
  x:                { top: 5, bottom: 10, left: 5, right: 5, description: "Standard safe zone" },
  pinterest:        { top: 5, bottom: 5, left: 5, right: 5, description: "Standard safe zone" },
  threads:          { top: 5, bottom: 10, left: 5, right: 5, description: "Standard safe zone" },
  whatsapp:         { top: 5, bottom: 5, left: 5, right: 5, description: "Standard safe zone" },
  "google-business": { top: 5, bottom: 5, left: 5, right: 5, description: "Standard safe zone" },
  website:          { top: 5, bottom: 5, left: 5, right: 5, description: "Varies by theme" },
  email:            { top: 5, bottom: 5, left: 5, right: 5, description: "Varies by email client" },
};
