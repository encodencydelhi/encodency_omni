/**
 * AI Visual Generator Service for Content Studio
 * Calls backend /api/v1/ai/generate-image service.
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
 * Pure AI image generation via backend /api/v1/ai/generate-image.
 * Strictly generates from prompt via backend.
 */
export async function fetchDynamicAiVisual(
  topic: string,
  style: string = "Realistic",
  variationIndex: number = 0,
  customPrompt?: string,
  companyId?: string,
): Promise<AiGeneratedVisual | null> {
  const query = customPrompt?.trim() || topic.trim();
  if (!query) return null;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (companyId) {
      headers["x-company-id"] = companyId;
    }

    const res = await fetch("/api/v1/ai/generate-image", {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt: query, style }),
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
          id: `ai-${Date.now()}-${variationIndex}`,
        };
      }
    } else {
      const err = await res.json().catch(() => ({}));
      console.error("Backend image generation error:", err);
    }
  } catch (err) {
    console.error("fetchDynamicAiVisual network error:", err);
  }
  return null;
}
