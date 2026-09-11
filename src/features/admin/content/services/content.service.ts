import type { ContentDraft, ApprovalEntry, Template, ContentIdea } from "../types/content.types";
import { MOCK_DRAFTS, MOCK_APPROVALS, MOCK_TEMPLATES, MOCK_IDEAS } from "../mocks/content.mock";

/* ── Simulated delay ── */
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

/* ── Drafts ── */
export async function getDrafts(): Promise<ContentDraft[]> {
  await delay();
  return MOCK_DRAFTS;
}

export async function saveDraft(draft: Partial<ContentDraft>): Promise<ContentDraft> {
  await delay();
  const existing = MOCK_DRAFTS.find((d) => d.id === draft.id);
  const saved: ContentDraft = {
    ...(existing ?? MOCK_DRAFTS[0]!),
    ...draft,
    updatedAt: new Date().toISOString(),
  } as ContentDraft;
  return saved;
}

export async function deleteDraft(id: string): Promise<void> {
  await delay(200);
  void id;
}

/* ── Publish / Schedule ── */
export async function publishContent(draft: ContentDraft): Promise<{ success: boolean; message: string }> {
  await delay(500);
  void draft;
  return { success: true, message: "Content published successfully." };
}

export async function scheduleContent(draft: ContentDraft, scheduledAt: string): Promise<{ success: boolean; message: string }> {
  await delay(400);
  void draft; void scheduledAt;
  return { success: true, message: "Content scheduled successfully." };
}

/* ── Templates ── */
export async function getTemplates(): Promise<Template[]> {
  await delay();
  return MOCK_TEMPLATES;
}

/* ── Ideas ── */
export async function getIdeas(): Promise<ContentIdea[]> {
  await delay();
  return MOCK_IDEAS;
}

/* ── Approvals ── */
export async function getApprovals(): Promise<ApprovalEntry[]> {
  await delay();
  return MOCK_APPROVALS;
}

export async function approveContent(id: string): Promise<void> {
  await delay(300);
  void id;
}

export async function rejectContent(id: string): Promise<void> {
  await delay(300);
  void id;
}

export async function requestChanges(id: string): Promise<void> {
  await delay(300);
  void id;
}

/* ── AI Generation ── */
export async function generateAIContent(prompt: string): Promise<{ caption: string; hashtags: string[]; headline: string }> {
  await delay(800);
  void prompt;
  return {
    caption: "Small actions create a cleaner tomorrow.\n\nLet's work together for a healthier, greener and cleaner India. 💙🌱",
    hashtags: ["#CleanGanga", "#HealthyIndia", "#Sustainability", "#MokshaSewa"],
    headline: "CLEAN RIVERS BRIGHTER TOMORROW",
  };
}
