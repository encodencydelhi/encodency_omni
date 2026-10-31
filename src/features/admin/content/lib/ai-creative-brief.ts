import type { GeneratedAiResult } from "../live/ai-api";
export interface CreativeContext {
  clientName?: string;
  website?: string;
  goal?: string;
  channels: string[];
  instructions?: string;
  includeClient: boolean;
}
export function creativeRefinements(
  context: CreativeContext,
  current?: GeneratedAiResult,
  change?: string,
): string[] {
  const parts = [
    context.goal && `Objective: ${context.goal}`,
    context.channels.length &&
      `Intended channels: ${context.channels.join(", ")}`,
    context.includeClient &&
      context.clientName &&
      `Selected client: ${context.clientName}`,
    context.includeClient &&
      context.website &&
      `Client website (context only; do not claim to have visited): ${context.website}`,
    context.instructions &&
      `Creative preferences and supplied facts: ${context.instructions}`,
    current &&
      `Current edited draft to refine: ${JSON.stringify(current).slice(0, 16000)}`,
    change && `Requested changes: ${change}`,
  ];
  return parts.filter(
    (value): value is string => typeof value === "string" && Boolean(value),
  );
}
export function imageCreativeBrief(
  subject: string,
  options: {
    composition?: string;
    palette?: string;
    text?: string;
    avoid?: string;
    change?: string;
  },
): string {
  if (!subject.trim())
    throw new Error("Describe the image you want to create.");
  const prompt = [
    `Subject and scene: ${subject.trim()}`,
    options.composition && `Composition: ${options.composition}`,
    options.palette && `Palette and lighting: ${options.palette}`,
    options.text
      ? `Exact text to render (no additional text): ${JSON.stringify(options.text)}`
      : "Do not include text or invented logos.",
    options.avoid && `Avoid: ${options.avoid}`,
    options.change && `New variation directions: ${options.change}`,
  ]
    .filter(Boolean)
    .join("\n");
  if (prompt.length > 4000)
    throw new Error(
      "Your complete visual brief exceeds 4,000 characters. Shorten the description or art direction.",
    );
  return prompt;
}
