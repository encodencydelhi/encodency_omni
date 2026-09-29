export type InstagramMediaKind = "image" | "video";

export function instagramPublishError(contentType: string | undefined, media: InstagramMediaKind[]): string | null {
  if (contentType !== "feed-post" && contentType !== "reel") {
    return "Instagram publishing supports a single-image feed post or a single-video Reel only.";
  }
  if (media.length !== 1) {
    return media.length === 0
      ? "Instagram needs exactly one image or one video."
      : "Instagram accepts one image or one video only — remove the extra media.";
  }
  if (contentType === "feed-post" && media[0] !== "image") {
    return "Instagram feed posts require one image; choose Reel for a video.";
  }
  if (contentType === "reel" && media[0] !== "video") {
    return "Instagram Reels require one video.";
  }
  return null;
}