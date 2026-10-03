import type { YouTubeVideoUpdateInput } from "../live/youtube-dto";
import type { Video, Visibility } from "../types";

export interface MetaDraft {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  visibility: Visibility;
  madeForKids: boolean;
}

export const pickDraft = (v: Video): MetaDraft => ({
  title: v.title,
  description: v.description,
  tags: v.tags,
  categoryId: v.categoryId ?? "",
  visibility: v.visibility,
  madeForKids: v.madeForKids ?? false,
});

/** Only the fields that changed are sent, so an edit never overwrites what it didn't touch. */
export function metadataPatch(video: Video, draft: MetaDraft): YouTubeVideoUpdateInput {
  const before = pickDraft(video);
  const patch: YouTubeVideoUpdateInput = {};
  if (draft.title.trim() !== before.title) patch.title = draft.title.trim();
  if (draft.description !== before.description) patch.description = draft.description;
  if (JSON.stringify(draft.tags) !== JSON.stringify(before.tags)) patch.tags = draft.tags;
  if (draft.categoryId !== before.categoryId && draft.categoryId) patch.categoryId = draft.categoryId;
  if (draft.visibility !== before.visibility) patch.privacyStatus = draft.visibility;
  if (draft.madeForKids !== before.madeForKids) patch.madeForKids = draft.madeForKids;
  return patch;
}
