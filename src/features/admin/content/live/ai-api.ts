import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";

export interface GenerateAiContentPayload {
  promptType: string;
  context: {
    topic: string;
    tone?: string;
    targetAudience?: string;
    language?: string;
    imageStyle?: string;
    refinements?: string[];
  };
}

export interface GeneratedAiResult {
  caption: string;
  hashtags: string[];
  headline?: string;
  callToAction?: string;
  fullContent?: string;
}

/** Which engine produced the copy — surfaced so the UI never claims "Gemini" for the local fallback. */
export type AiProvider = "GEMINI" | "OPENAI" | "LOCAL";

export interface AiGenerateResponse {
  generatedContent: GeneratedAiResult;
  tokensConsumed: number;
  provider?: AiProvider;
  usage: {
    currentAiTokens: number;
    maxAiTokens: number | null;
    remainingAiTokens: number | null;
  };
}

export interface AiUsageResponse {
  companyId: string;
  metricType: string;
  limits: {
    maxAiTokens: number | null;
    currentAiTokens: number;
    remainingAiTokens: number | null;
  };
  recentUsage: Array<{
    id: string;
    quantity: number;
    periodStart: string;
    periodEnd: string;
    createdAt: string;
  }>;
}

export const aiApi = {
  /**
   * POST /api/v1/ai/generate
   * Generates content, checks entitlement, and meters token usage.
   * Scoped to company level via `x-company-id`.
   */
  async generate(
    companyId: string,
    payload: GenerateAiContentPayload,
    signal?: AbortSignal,
  ): Promise<AiGenerateResponse> {
    return apiClient.request<AiGenerateResponse>({
      method: "POST",
      path: "/ai/generate",
      headers: companyScopeHeaders(companyId),
      body: payload,
      signal,
    });
  },

  /**
   * GET /api/v1/ai/usage
   * Reads company's current token usage, quota, and history.
   * Scoped to company level via `x-company-id`.
   */
  async getUsage(companyId: string, signal?: AbortSignal): Promise<AiUsageResponse> {
    return apiClient.request<AiUsageResponse>({
      method: "GET",
      path: "/ai/usage",
      headers: companyScopeHeaders(companyId),
      signal,
    });
  },
};
