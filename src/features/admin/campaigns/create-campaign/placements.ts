/**
 * Placement catalog for step 3.
 *
 * Each channel exposes its own placements, and every placement carries the
 * aspect ratios that platform supports. `chip` is the short form shown in the
 * "Selected Placements" bar at the bottom of the step.
 */
export interface Placement {
  id: string;
  label: string;
  ratios: string[];
  chip: string;
}

export interface PlacementChannel {
  name: string;
  /** Two logos for Meta, one for everything else. */
  logos: string[];
  caption: string;
  connected: boolean;
  placements: Placement[];
  /** Optional advisory shown under the placement list. */
  note?: string;
}

export const PLACEMENT_CHANNELS: PlacementChannel[] = [
  {
    name: "Meta & Instagram",
    logos: ["Facebook", "Instagram"],
    caption: "Reach a wider audience across Facebook and Instagram.",
    connected: true,
    placements: [
      { id: "ig-feed", label: "Instagram Feed Post", ratios: ["4:5", "1:1"], chip: "IG Feed 4:5" },
      { id: "ig-reel", label: "Instagram Reel", ratios: ["9:16"], chip: "IG Reel 9:16" },
      { id: "ig-story", label: "Instagram Story", ratios: ["9:16"], chip: "IG Story 9:16" },
      { id: "ig-carousel", label: "Instagram Carousel Post", ratios: ["1:1"], chip: "IG Carousel 1:1" },
      { id: "fb-feed", label: "Facebook Feed Post", ratios: ["1.91:1", "4:5"], chip: "FB Feed 4:5" },
      { id: "fb-story", label: "Facebook Story", ratios: ["9:16"], chip: "FB Story 9:16" },
    ],
  },
  {
    name: "LinkedIn",
    logos: ["LinkedIn"],
    caption: "Engage professionals and stakeholders.",
    connected: true,
    placements: [
      { id: "li-post", label: "LinkedIn Post", ratios: ["1.91:1", "1:1"], chip: "LinkedIn Post 1:1" },
      { id: "li-doc", label: "Document / Graphic", ratios: ["1:1"], chip: "LinkedIn Doc 1:1" },
      { id: "li-video", label: "Video Post", ratios: ["16:9", "1:1"], chip: "LinkedIn Video 16:9" },
    ],
  },
  {
    name: "Google Business",
    logos: ["Google Business"],
    caption: "Share updates with local communities.",
    connected: true,
    placements: [{ id: "gbp-post", label: "GBP Update Post", ratios: ["1:1", "16:9"], chip: "GBP Post 1:1" }],
    note: "Images perform best at 1:1 (square) or 16:9 (landscape).",
  },
  {
    name: "WhatsApp",
    logos: ["WhatsApp"],
    caption: "Reach your audience directly with broadcasts.",
    connected: true,
    placements: [
      { id: "wa-template", label: "Template / Broadcast", ratios: ["1:1", "9:16"], chip: "WhatsApp 1:1" },
    ],
    note: "Use approved templates for promotional content.",
  },
  {
    name: "YouTube",
    logos: ["YouTube"],
    caption: "Drive awareness with video content.",
    connected: true,
    placements: [
      { id: "yt-short", label: "YouTube Short", ratios: ["9:16"], chip: "YouTube Short 9:16" },
      { id: "yt-thumb", label: "Video Thumbnail", ratios: ["16:9"], chip: "YouTube Thumb 16:9" },
      { id: "yt-community", label: "Community Post", ratios: ["1:1"], chip: "YouTube Post 1:1" },
    ],
  },
  {
    name: "Website",
    logos: ["Website"],
    caption: "Showcase your campaign on your own website.",
    connected: true,
    placements: [
      { id: "web-hero", label: "Landing Page Hero Banner", ratios: ["16:9"], chip: "Web Hero 16:9" },
      { id: "web-article", label: "Article Banner", ratios: ["1.91:1"], chip: "Web Article 1.91:1" },
      { id: "web-popup", label: "Popup / CTA Banner", ratios: ["1.91:1"], chip: "Web Popup 1.91:1" },
    ],
  },
];

/** Flat lookup so the selected-placements bar can resolve chips and logos. */
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
];
