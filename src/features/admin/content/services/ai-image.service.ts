/**
 * AI Visual Generator Service for Content Studio
 * Exclusively generates 100% custom images using OpenAI (no stock fetching or fallbacks).
 */

export interface AiGeneratedVisual {
  url: string;
  prompt: string;
  style: string;
  category: string;
  aspectRatio: string;
  id: string;
}

export const PRESET_STYLE_LABELS = [
  "Realistic",
  "Cinematic",
  "Minimal",
  "Vibrant",
  "Natural",
  "Studio",
] as const;

export type PresetStyle = typeof PRESET_STYLE_LABELS[number];

/**
 * Pure AI image generation via /api/ai-image (OpenAI gpt-image-1).
 * Strictly generates from the prompt. Does NOT fetch stock images.
 */
export async function fetchDynamicAiVisual(
  topic: string,
  style: string = "Realistic",
  variationIndex: number = 0,
  customPrompt?: string,
): Promise<AiGeneratedVisual | null> {
  const query = customPrompt?.trim() || topic.trim();
  if (!query) return null;

  try {
    const res = await fetch("/api/ai-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: query, style, variation: variationIndex }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.image?.url) {
        return {
          url: data.image.url,
          prompt: customPrompt?.trim()
            ? `AI Prompt: "${customPrompt.trim().slice(0, 85)}" • ${style} style`
            : `AI Visual: "${query.slice(0, 70)}" • ${style} style`,
          style,
          category: "ai-generated",
          aspectRatio: "1:1",
          id: `openai-${Date.now()}-${variationIndex}`,
        };
      }
    } else {
      const err = await res.json().catch(() => ({}));
      console.error("OpenAI image generation error:", err);
    }
  } catch (err) {
    console.error("fetchDynamicAiVisual network error:", err);
  }
  return null;
}
