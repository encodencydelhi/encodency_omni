import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { ApiError } from "@/types/api";
import { fitToCanvas } from "../lib/cover-crop";

export interface AiGeneratedVisual {
  url: string; prompt: string; style: string; category: string; aspectRatio: string; id: string;
}
export interface ImageGenerationOptions {
  /** WIDTHxHEIGHT asked of the image model (see config/canvas-presets). */
  size?: string;
  /** The exact pixels wanted: the generated image is centre-cropped and resized to this. */
  canvas?: { width: number; height: number; ratio: string };
  quality?: "low" | "medium" | "high";
  signal?: AbortSignal;
}
export const PRESET_STYLE_LABELS = ["Realistic", "Cinematic", "Minimal", "Vibrant", "Natural", "Studio"] as const;
export type PresetStyle = typeof PRESET_STYLE_LABELS[number];

export async function fetchDynamicAiVisual(topic: string, style = "Realistic", variationIndex = 0, customPrompt?: string, companyId?: string, options: ImageGenerationOptions = {}): Promise<AiGeneratedVisual> {
  const prompt = customPrompt?.trim() || topic.trim();
  if (!prompt) throw new Error("Describe the image you want to create.");
  if (prompt.length > 4000) throw new Error("Image prompts can contain at most 4,000 characters.");
  let data: { success: boolean; image: { url: string } };
  try {
    data = await apiClient.request<typeof data>({
      method: "POST", path: "/ai/generate-image", headers: companyScopeHeaders(companyId),
      body: { prompt, style, size: options.size ?? "1024x1024", quality: options.quality ?? "medium" }, signal: options.signal,
    });
  } catch (error) {
    if (ApiError.isApiError(error) && (error.status === 0 || error.status === 502 || error.status === 504)) {
      throw new Error("Cannot reach the platform image service. Check that the backend is running and reachable, then try again. No automatic retry was sent.");
    }
    throw error;
  }
  if (!data?.success || !data.image?.url) throw new Error("No image was returned. Try a more specific prompt.");
  let url = data.image.url;
  if (options.canvas && typeof document !== "undefined") url = await fitToCanvas(url, options.canvas);
  return { url, prompt, style, category: "ai-generated", aspectRatio: options.canvas?.ratio ?? (options.size === "1536x1024" ? "3:2" : options.size === "1024x1536" ? "2:3" : "1:1"), id: `ai-${Date.now()}-${variationIndex}` };
}

/** Generated data is uploaded through the normal, tenant-scoped media validation path. */
export async function generatedImageFile(url: string): Promise<File> {
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(url)) throw new Error("This generated image cannot be saved. Generate a new image.");
  const response = await fetch(url);
  const blob = await response.blob();
  if (blob.size > 8 * 1024 * 1024) throw new Error("Generated image exceeds 8 MB. Choose a smaller image.");
  return new File([blob], `ai-visual-${Date.now()}.${blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png"}`, { type: blob.type });
}
