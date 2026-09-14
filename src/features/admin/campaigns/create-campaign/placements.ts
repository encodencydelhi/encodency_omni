export interface Placement {
  id: string;
  label: string;
  ratios: string[];
  chip: string;
}

export interface PlacementChannel {
  name: string;
  logos: string[];
  caption: string;
  connected: boolean;
  placements: Placement[];
  note?: string;
}

export const PLACEMENT_CHANNELS: PlacementChannel[] = [
  {
    name: "Instagram",
    logos: ["Instagram"],
    caption: "Reach audiences with feed posts, reels, stories and carousels.",
    connected: true,
    placements: [
      { id: "ig-feed", label: "Instagram Feed Post", ratios: ["4:5", "1:1"], chip: "IG Feed 4:5" },
      { id: "ig-reel", label: "Instagram Reel", ratios: ["9:16"], chip: "IG Reel 9:16" },
      { id: "ig-story", label: "Instagram Story", ratios: ["9:16"], chip: "IG Story 9:16" },
      { id: "ig-carousel", label: "Instagram Carousel", ratios: ["1:1", "4:5"], chip: "IG Carousel 1:1" },
      { id: "ig-explore", label: "Instagram Explore", ratios: ["1:1"], chip: "IG Explore 1:1" },
    ],
  },
  {
    name: "Facebook",
    logos: ["Facebook"],
    caption: "Reach people on the world's largest social network.",
    connected: true,
    placements: [
      { id: "fb-feed", label: "Facebook Feed Post", ratios: ["1.91:1", "4:5"], chip: "FB Feed 1.91:1" },
      { id: "fb-story", label: "Facebook Story", ratios: ["9:16"], chip: "FB Story 9:16" },
      { id: "fb-reels", label: "Facebook Reels", ratios: ["9:16"], chip: "FB Reels 9:16" },
      { id: "fb-carousel", label: "Facebook Carousel", ratios: ["1:1"], chip: "FB Carousel 1:1" },
    ],
  },
  {
    name: "LinkedIn",
    logos: ["LinkedIn"],
    caption: "Engage professionals and B2B audiences.",
    connected: true,
    placements: [
      { id: "li-post", label: "LinkedIn Post", ratios: ["1.91:1", "1:1"], chip: "LinkedIn Post 1:1" },
      { id: "li-doc", label: "Document / Graphic", ratios: ["1:1"], chip: "LinkedIn Doc 1:1" },
      { id: "li-video", label: "Video Post", ratios: ["16:9", "1:1"], chip: "LinkedIn Video 16:9" },
      { id: "li-article", label: "Article Header", ratios: ["16:9"], chip: "LinkedIn Article 16:9" },
    ],
  },
  {
    name: "YouTube",
    logos: ["YouTube"],
    caption: "Drive awareness with video content.",
    connected: true,
    placements: [
      { id: "yt-short", label: "YouTube Short", ratios: ["9:16"], chip: "YT Short 9:16" },
      { id: "yt-thumb", label: "Video Thumbnail", ratios: ["16:9"], chip: "YT Thumb 16:9" },
      { id: "yt-community", label: "Community Post", ratios: ["1:1"], chip: "YT Post 1:1" },
    ],
  },
  {
    name: "X",
    logos: ["X"],
    caption: "Real-time engagement and conversations.",
    connected: false,
    placements: [
      { id: "x-post", label: "X Post", ratios: ["16:9", "1:1"], chip: "X Post 16:9" },
      { id: "x-video", label: "X Video", ratios: ["16:9"], chip: "X Video 16:9" },
    ],
  },
  {
    name: "WhatsApp",
    logos: ["WhatsApp"],
    caption: "Reach your audience directly with broadcasts.",
    connected: true,
    placements: [
      { id: "wa-template", label: "Template / Broadcast", ratios: ["1:1", "9:16"], chip: "WA 1:1" },
    ],
    note: "Use approved templates for promotional content.",
  },
  {
    name: "Google Business",
    logos: ["Google Business"],
    caption: "Share updates with local communities.",
    connected: true,
    placements: [
      { id: "gbp-post", label: "GBP Update Post", ratios: ["1:1", "16:9"], chip: "GBP Post 1:1" },
    ],
    note: "Images perform best at 1:1 (square) or 16:9 (landscape).",
  },
  {
    name: "Website",
    logos: ["Website"],
    caption: "Showcase your campaign on your own website.",
    connected: true,
    placements: [
      { id: "web-hero", label: "Landing Page Hero", ratios: ["16:9"], chip: "Web Hero 16:9" },
      { id: "web-article", label: "Article Banner", ratios: ["1.91:1"], chip: "Web Article 1.91:1" },
      { id: "web-popup", label: "Popup / CTA Banner", ratios: ["1.91:1"], chip: "Web Popup 1.91:1" },
    ],
  },
  {
    name: "Email",
    logos: ["Email"],
    caption: "Email marketing campaigns.",
    connected: true,
    placements: [
      { id: "email-header", label: "Email Header Banner", ratios: ["16:9", "3:1"], chip: "Email Header 16:9" },
      { id: "email-inline", label: "Inline Image", ratios: ["1:1", "16:9"], chip: "Email Inline 1:1" },
    ],
  },
];

export const PLACEMENT_INDEX = new Map(
  PLACEMENT_CHANNELS.flatMap((channel) =>
    channel.placements.map((placement) => [
      placement.id,
      { ...placement, channel: channel.name, logo: channel.logos[0]! },
    ]),
  ),
);

export const DEFAULT_PLACEMENTS = [
  "ig-feed",
  "ig-reel",
  "ig-carousel",
  "fb-feed",
  "li-post",
  "li-video",
  "gbp-post",
  "yt-short",
  "web-hero",
];
