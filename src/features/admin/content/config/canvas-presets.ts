/**
 * Canvas sizes for AI images, one per place a post is shown.
 *
 * `request` is what the image model is asked for: both edges are multiples of 16, the shape matches the canvas and the pixel count stays
 * modest (cost grows with pixels). The result is then centre-cropped and resized to exactly `width` x `height`, so the file that reaches the
 * Media Library already has the size the channel expects. The model cannot make anything wider than 3:1, so very wide banners
 * (for example a LinkedIn personal banner at 4:1) are not offered.
 */
export type CanvasGroup = "Square" | "Portrait" | "Vertical" | "Landscape" | "Wide";

export interface CanvasPreset {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
  /** WIDTHxHEIGHT sent to the model. */
  request: string;
  group: CanvasGroup;
  usedFor: string;
}

export const CANVAS_PRESETS: readonly CanvasPreset[] = [
  { id: "square", label: "Square post", ratio: "1:1", width: 1080, height: 1080, request: "1088x1088", group: "Square", usedFor: "Instagram, Facebook, LinkedIn and Google Business posts" },
  { id: "portrait-4-5", label: "Portrait post", ratio: "4:5", width: 1080, height: 1350, request: "1088x1360", group: "Portrait", usedFor: "Instagram, Facebook and LinkedIn feed posts" },
  { id: "pinterest-2-3", label: "Pinterest pin", ratio: "2:3", width: 1000, height: 1500, request: "1024x1536", group: "Portrait", usedFor: "Pinterest pins and tall posters" },
  { id: "story-9-16", label: "Story, Reel or Short cover", ratio: "9:16", width: 1080, height: 1920, request: "1008x1792", group: "Vertical", usedFor: "Instagram and Facebook stories and reels, YouTube Shorts, WhatsApp status" },
  { id: "link-1-91", label: "Link or share image", ratio: "1.91:1", width: 1200, height: 627, request: "1216x640", group: "Landscape", usedFor: "Facebook and LinkedIn link posts, website share previews" },
  { id: "landscape-16-9", label: "Landscape video cover", ratio: "16:9", width: 1920, height: 1080, request: "1536x864", group: "Landscape", usedFor: "YouTube videos, wide screens, presentations" },
  { id: "youtube-thumbnail", label: "YouTube thumbnail", ratio: "16:9", width: 1280, height: 720, request: "1280x720", group: "Landscape", usedFor: "YouTube video thumbnails" },
  { id: "x-image", label: "X (Twitter) image", ratio: "16:9", width: 1600, height: 900, request: "1536x864", group: "Landscape", usedFor: "Images in X posts" },
  { id: "landscape-3-2", label: "Photo landscape", ratio: "3:2", width: 1536, height: 1024, request: "1536x1024", group: "Landscape", usedFor: "Blog images and general photos" },
  { id: "business-4-3", label: "Google Business photo", ratio: "4:3", width: 1200, height: 900, request: "1216x912", group: "Landscape", usedFor: "Google Business Profile posts and photos" },
  { id: "banner-21-9", label: "Cinematic banner", ratio: "21:9", width: 1680, height: 720, request: "1568x672", group: "Wide", usedFor: "Website heroes and wide covers" },
  { id: "facebook-cover", label: "Facebook cover", ratio: "2.63:1", width: 820, height: 312, request: "1472x560", group: "Wide", usedFor: "Facebook page cover" },
  { id: "x-header", label: "X header or wide banner", ratio: "3:1", width: 1500, height: 500, request: "1536x512", group: "Wide", usedFor: "X profile header and 3:1 banners" },
];

export const CANVAS_GROUPS: readonly CanvasGroup[] = ["Square", "Portrait", "Vertical", "Landscape", "Wide"];

export const DEFAULT_CANVAS_ID = "square";

export function canvasPreset(id: string): CanvasPreset {
  return CANVAS_PRESETS.find((preset) => preset.id === id) ?? CANVAS_PRESETS[0]!;
}

export const canvasPixels = (preset: CanvasPreset): string => `${preset.width} x ${preset.height}`;
