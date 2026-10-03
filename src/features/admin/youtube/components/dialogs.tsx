"use client";

import { useMemo, useRef, useState } from "react";
import { addDays, format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Globe2, Link2, Lock, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { mediaApi } from "@/features/admin/content/live/media-api";
import { youtubeKeys } from "@/lib/query/keys";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toPlaylist } from "../data/mappers";
import { csvCell } from "../lib/csv";
import { metadataPatch, pickDraft, type MetaDraft } from "../lib/video-patch";
import { type ChannelAnalytics, type QueryView } from "../data/view-hooks";
import { useNow } from "../hooks/use-now";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import type { YouTubePublishTarget } from "../live/youtube-dto";
import { CATEGORIES, DESCRIPTION_MAX, LANGUAGES, TITLE_MAX, VISIBILITY_LABEL, languageLabel, ytRoutes } from "../lib/constants";
import { date as fmtDate } from "../lib/format";
import { channelHealth, scoreTone, type ScoreFactor } from "../lib/insights";
import { useYouTube } from "../store/youtube-store";
import type { Playlist, Video, Visibility } from "../types";
import {
  Badge,
  Button,
  ChoiceCard,
  ConfirmDialog,
  FormField,
  Meter,
  Notice,
  SearchField,
  SelectMenu,
  Skeleton,
  TagInput,
  Thumb,
  yt,
} from "./ui";

/* ------------------------------------------------------------------ */
/* Create playlist                                                     */
/* ------------------------------------------------------------------ */

type CreatePlaylistProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoIds?: string[];
  onCreated?: (playlist: Playlist) => void;
};

// Dialog bodies mount on open, so their form state starts fresh every time.
export function CreatePlaylistDialog(props: CreatePlaylistProps) {
  return props.open ? <CreatePlaylistBody {...props} /> : null;
}

function CreatePlaylistBody({ open, onOpenChange, videoIds, onCreated }: CreatePlaylistProps) {
  const { createPlaylist, can } = useYouTube();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // New playlists are PRIVATE unless the person chooses otherwise.
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const error = !title.trim() ? "Give the playlist a title." : title.length > 150 ? "Titles can be up to 150 characters." : /[<>]/.test(title) ? "Titles can't contain < or >." : undefined;

  const submit = async () => {
    if (busy) return;
    setTouched(true);
    if (error) return;
    setBusy(true);
    const playlist = await createPlaylist({ title: title.trim(), description: description.trim(), visibility }, videoIds);
    setBusy(false);
    if (playlist) {
      onOpenChange(false);
      onCreated?.(toPlaylist(playlist));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[480px] gap-0 p-0">
        <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Create playlist</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#6B7890]">
            {videoIds?.length ? `The ${videoIds.length === 1 ? "selected video" : `${videoIds.length} selected videos`} will be added to the new playlist.` : "Organise related videos so viewers keep watching."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <FormField label="Title" required htmlFor="pl-title" counter={{ value: title.length, max: 150 }} error={touched ? error : undefined}>
            <input id="pl-title" autoFocus className={yt.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Clean Ganga Drives 2026" />
          </FormField>
          <FormField label="Description" htmlFor="pl-desc" counter={{ value: description.length, max: 5000 }}>
            <textarea id="pl-desc" rows={3} className={yt.textarea} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this playlist about?" />
          </FormField>
          <FormField label="Visibility">
            <SelectMenu<Visibility>
              label="Playlist visibility"
              size="md"
              fullWidth
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: "private", label: "Private", description: "Only you and people you choose" },
                { value: "unlisted", label: "Unlisted", description: "Anyone with the link can view" },
                { value: "public", label: "Public", description: "Anyone can search for and view" },
              ]}
            />
          </FormField>
          <button type="submit" hidden />
        </form>
        <DialogFooter className="border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button variant="primary" loading={busy} gate={can.canManagePlaylists} onClick={() => void submit()}>Create playlist</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Add to playlist                                                     */
/* ------------------------------------------------------------------ */

type VideoIdsDialogProps = { open: boolean; onOpenChange: (open: boolean) => void; videoIds: string[] };

export function AddToPlaylistDialog(props: VideoIdsDialogProps) {
  return props.open ? <AddToPlaylistBody {...props} /> : null;
}

function AddToPlaylistBody({ open, onOpenChange, videoIds }: VideoIdsDialogProps) {
  const { playlists, playlistsState, addToPlaylists, can } = useYouTube();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // YouTube-managed lists (uploads, liked videos...) cannot be changed through the API.
  const filtered = playlists.filter((p) => !p.system && p.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <Dialog open={open && !createOpen} onOpenChange={(o) => !busy && onOpenChange(o)}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[460px] gap-0 p-0">
          <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
            <DialogTitle className="text-[15px] text-[#0F1B3D]">Add to playlist</DialogTitle>
            <DialogDescription className="text-[12.5px] text-[#6B7890]">
              {videoIds.length === 1 ? "Choose one or more playlists." : `Add ${videoIds.length} videos to one or more playlists.`}
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 pt-3">
            <SearchField value={query} onChange={setQuery} placeholder="Search playlists" />
          </div>
          <ul className="max-h-[300px] space-y-1 overflow-y-auto px-3 py-2">
            {playlistsState.isLoading && <li className="space-y-2 px-2 py-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></li>}
            {!playlistsState.isLoading && filtered.length === 0 && (
              <li className="px-2 py-6 text-center text-[12.5px] text-[#6B7890]">{playlists.length === 0 ? "You don't own any playlists yet. Create one below." : <>No playlists match “{query}”.</>}</li>
            )}
            {filtered.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 hover:bg-[#F8FAFC]">
                  <Checkbox
                    checked={selected.includes(p.id)}
                    onCheckedChange={(c) => setSelected((prev) => (c ? [...prev, p.id] : prev.filter((x) => x !== p.id)))}
                    aria-label={p.title}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[#0F1B3D]">{p.title}</span>
                    <span className="block text-[11.5px] text-[#6B7890]">
                      {VISIBILITY_LABEL[p.visibility]}{p.itemCount !== null ? ` · ${p.itemCount} videos` : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <DialogFooter className="items-center border-t border-[#EEF1F5] px-5 py-3 sm:justify-between">
            <Button variant="ghost" size="sm" icon={Plus} gate={can.canManagePlaylists} onClick={() => setCreateOpen(true)}>New playlist</Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button
                variant="primary"
                loading={busy}
                disabled={!selected.length}
                disabledReason="Select at least one playlist"
                gate={can.canManagePlaylists}
                onClick={async () => {
                  if (busy) return;
                  setBusy(true);
                  const ok = await addToPlaylists(videoIds, selected);
                  setBusy(false);
                  if (ok) onOpenChange(false);
                }}
              >
                Add{selected.length ? ` to ${selected.length}` : ""}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} videoIds={videoIds} onCreated={() => onOpenChange(false)} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Schedule / reschedule                                               */
/* ------------------------------------------------------------------ */

type VideoDialogProps = { open: boolean; onOpenChange: (open: boolean) => void; video: Video | null };

export function ScheduleDialog(props: VideoDialogProps) {
  return props.open && props.video ? <ScheduleBody {...props} video={props.video} /> : null;
}

const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
  } catch {
    return "Local time";
  }
};

function ScheduleBody({ open, onOpenChange, video }: VideoDialogProps & { video: Video }) {
  const { scheduleVideo, cancelSchedule, can } = useYouTube();
  const now = useNow();
  const [day, setDay] = useState(() => format(video.scheduledAt ? parseISO(video.scheduledAt) : addDays(new Date(), 1), "yyyy-MM-dd"));
  const [time, setTime] = useState(() => (video.scheduledAt ? format(parseISO(video.scheduledAt), "HH:mm") : "10:00"));
  const [target, setTarget] = useState<YouTubePublishTarget>(video.visibility === "unlisted" ? "unlisted" : "public");
  const [busy, setBusy] = useState(false);
  const zone = browserZone();

  const when = day && time ? new Date(`${day}T${time}`) : null;
  const error = !when || Number.isNaN(when.getTime()) ? "Pick a date and time." : when.getTime() < now + 15 * 60_000 ? "Schedule at least 15 minutes from now." : undefined;
  const isReschedule = Boolean(video.scheduleId);

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[440px] gap-0 p-0">
        <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">{isReschedule ? "Reschedule" : "Schedule"} video</DialogTitle>
          <DialogDescription className="line-clamp-1 text-[12.5px] text-[#6B7890]">{video.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" htmlFor="sch-date">
              <input id="sch-date" type="date" className={yt.input} value={day} min={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setDay(e.target.value)} />
            </FormField>
            <FormField label="Time" htmlFor="sch-time">
              <input id="sch-time" type="time" className={yt.input} value={time} onChange={(e) => setTime(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Time zone" hint="Times use your browser's time zone and are sent to YouTube with an explicit UTC offset.">
            <SelectMenu label="Time zone" size="md" fullWidth disabled value={zone} onChange={() => undefined} options={[{ value: zone, label: zone }]} />
          </FormField>
          <FormField label="Visibility when published">
            <SelectMenu<YouTubePublishTarget>
              label="Visibility when published"
              size="md"
              fullWidth
              disabled={isReschedule}
              value={target}
              onChange={setTarget}
              options={[
                { value: "public", label: "Public", description: "Everyone can watch" },
                { value: "unlisted", label: "Unlisted", description: "Anyone with the link" },
              ]}
            />
          </FormField>
          {error ? (
            <Notice tone="amber" title={error} />
          ) : (
            <Notice tone="blue" title={`Goes ${target} ${when ? format(when, "EEE, MMM d 'at' h:mm a") : ""}`}>
              The video stays private until then{when ? ` — ${formatDistanceToNowStrict(when, { addSuffix: true })}` : ""}.
            </Notice>
          )}
        </div>
        <DialogFooter className="border-t border-[#EEF1F5] px-5 py-3">
          {isReschedule && (
            <Button
              variant="ghost"
              className="mr-auto text-[#C81E2B]"
              disabled={busy}
              gate={can.canSchedule}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                const ok = await cancelSchedule(video);
                setBusy(false);
                if (ok) onOpenChange(false);
              }}
            >
              Cancel schedule
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Close</Button>
          <Button
            variant="primary"
            icon={Clock3}
            loading={busy}
            disabled={Boolean(error)}
            disabledReason={error}
            gate={can.canSchedule}
            onClick={async () => {
              if (busy || !when) return;
              setBusy(true);
              // toISOString() carries the explicit UTC offset (Z) the backend requires.
              const ok = await scheduleVideo(video, when.toISOString(), target);
              setBusy(false);
              if (ok) onOpenChange(false);
            }}
          >
            {isReschedule ? "Reschedule" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk visibility                                                     */
/* ------------------------------------------------------------------ */

export function VisibilityDialog(props: VideoIdsDialogProps) {
  return props.open ? <VisibilityBody {...props} /> : null;
}

function VisibilityBody({ open, onOpenChange, videoIds }: VideoIdsDialogProps) {
  const { setVisibility, can } = useYouTube();
  // Never pre-selects Public: making videos public is always a deliberate choice.
  const [value, setValue] = useState<Visibility>("private");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[440px] gap-0 p-0">
        <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Change visibility</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#6B7890]">Applies to {videoIds.length} selected {videoIds.length === 1 ? "video" : "videos"}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-5 py-4">
          <ChoiceCard name="bulk-vis" checked={value === "private"} onSelect={() => setValue("private")} icon={Lock} title="Private" description="Only you and people you choose." />
          <ChoiceCard name="bulk-vis" checked={value === "unlisted"} onSelect={() => setValue("unlisted")} icon={Link2} title="Unlisted" description="Anyone with the link can watch." />
          <ChoiceCard name="bulk-vis" checked={value === "public"} onSelect={() => setValue("public")} icon={Globe2} title="Public" description="Everyone can watch." />
        </div>
        <DialogFooter className="border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            gate={can.canEditVideo}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              const ok = await setVisibility(videoIds, value);
              setBusy(false);
              if (ok) onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Thumbnail manager                                                   */
/* ------------------------------------------------------------------ */

const MAX_THUMB_BYTES = 2 * 1024 * 1024;
const THUMB_TYPES = ["image/jpeg", "image/png"];

export function ThumbnailManager(props: VideoDialogProps) {
  return props.open && props.video ? <ThumbnailBody {...props} video={props.video} /> : null;
}

type Candidate = { kind: "file"; file: File; preview: string } | { kind: "asset"; assetId: string; preview: string };

function ThumbnailBody({ open, onOpenChange, video }: VideoDialogProps & { video: Video }) {
  const { changeThumbnail, can, channel, scope } = useYouTube();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // The real media library (images only): PNG/JPEG that fit YouTube's 2 MB limit.
  const library = useQuery({
    queryKey: scope ? youtubeKeys.mediaImages(scope) : ["youtube", "none", "media-images"],
    queryFn: () => mediaApi.list(scope!.companyId, scope!.clientId, { kind: "IMAGE", limit: 24 }),
    enabled: scope !== null,
    staleTime: 60_000,
  });
  const suggestions = (library.data?.items ?? []).filter((a) => THUMB_TYPES.includes(a.mimeType) && a.bytes <= MAX_THUMB_BYTES).slice(0, 8);
  const preview = candidate?.preview ?? video.thumbnailUrl;

  const accept = (file: File | undefined) => {
    if (!file) return;
    if (!THUMB_TYPES.includes(file.type)) {
      setError("Use a JPG or PNG image.");
      return;
    }
    if (file.size > MAX_THUMB_BYTES) {
      setError("Thumbnails must be 2 MB or smaller.");
      return;
    }
    setError(null);
    setCandidate({ kind: "file", file, preview: URL.createObjectURL(file) });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[92dvh] max-w-[760px] gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Manage thumbnail</DialogTitle>
          <DialogDescription className="line-clamp-1 text-[12.5px] text-[#6B7890]">{video.title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 px-5 py-4 md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Upload new</p>
              <button
                type="button"
                onClick={() => input.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  accept(e.dataTransfer.files[0]);
                }}
                disabled={!can.canUpload.allowed}
                className={cn(
                  "flex w-full flex-col items-center justify-center rounded-sm border border-dashed px-4 py-6 text-center transition",
                  dragging ? "border-[#E5202E] bg-[#FFF8F8]" : "border-[#C9D1DC] bg-[#F8FAFC] hover:border-[#98A2B3]",
                  !can.canUpload.allowed && "cursor-not-allowed opacity-60",
                  yt.focus,
                )}
              >
                <Upload className="size-5 text-[#6B7890]" />
                <span className="mt-2 text-[13px] font-semibold text-[#0F1B3D]">Drop an image or click to browse</span>
                <span className="mt-0.5 text-[11.5px] text-[#6B7890]">1280×720 recommended · JPG or PNG · up to 2 MB</span>
              </button>
              <input ref={input} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => accept(e.target.files?.[0])} />
              {error && <p role="alert" className="mt-1.5 text-[12px] font-medium text-[#C81E2B]">{error}</p>}
              {!can.canUpload.allowed && <p className="mt-1.5 text-[12px] text-[#B54708]">{can.canUpload.reason}</p>}
            </div>

            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">From your media library</p>
              {library.isPending ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-video w-full" />)}</div>
              ) : library.isError ? (
                <p className="text-[12px] text-[#98A2B3]">The media library couldn&apos;t be loaded.</p>
              ) : suggestions.length === 0 ? (
                <p className="text-[12px] text-[#98A2B3]">No JPG or PNG images (up to 2 MB) in the media library yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {suggestions.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setCandidate({ kind: "asset", assetId: a.id, preview: a.url })}
                      aria-pressed={candidate?.kind === "asset" && candidate.assetId === a.id}
                      className={cn("rounded-sm ring-offset-2 transition", candidate?.kind === "asset" && candidate.assetId === a.id ? "ring-2 ring-[#E5202E]" : "hover:ring-2 hover:ring-[#C9D1DC]", yt.focus)}
                    >
                      <Thumb src={a.url} sizes="140px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Preview</p>
            <div className="rounded-sm border border-[#EEF1F5] bg-[#F8FAFC] p-3">
              <Thumb src={preview} durationSec={video.durationSec} sizes="280px" />
              <div className="mt-2.5 flex gap-2">
                <span className="relative size-8 shrink-0 overflow-hidden rounded-sm bg-white ring-1 ring-[#E4E9F0]">
                  {channel.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={channel.avatarUrl} alt="" className="size-full object-contain" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[12.5px] font-semibold leading-4 text-[#0F1B3D]">{video.title}</p>
                  <p className="mt-0.5 text-[11.5px] text-[#6B7890]">{channel.title}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[12px] text-[#6B7890]">
              {candidate ? <Badge tone="amber" dot>Not applied yet</Badge> : <Badge tone="green" icon={CheckCircle2}>Current thumbnail</Badge>}
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!candidate}
            disabledReason="Upload or choose a new thumbnail first"
            gate={can.canUpload}
            onClick={async () => {
              if (!candidate || busy) return;
              setBusy(true);
              const ok = await changeThumbnail(video.id, candidate.kind === "file" ? { file: candidate.file } : { assetId: candidate.assetId });
              setBusy(false);
              if (ok) onOpenChange(false);
            }}
          >
            Apply thumbnail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Edit metadata                                                       */
/* ------------------------------------------------------------------ */

export function EditMetadataSheet(props: VideoDialogProps) {
  return props.open && props.video ? <EditMetadataBody {...props} video={props.video} /> : null;
}

function EditMetadataBody({ open, onOpenChange, video }: VideoDialogProps & { video: Video }) {
  const { updateVideo, can } = useYouTube();
  const [draft, setDraft] = useState<MetaDraft>(() => pickDraft(video));
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const dirty = JSON.stringify(pickDraft(video)) !== JSON.stringify(draft);
  const errors = {
    title: !draft.title.trim() ? "Title is required." : draft.title.length > TITLE_MAX ? `Keep the title under ${TITLE_MAX} characters.` : /[<>]/.test(draft.title) ? "Titles can't contain < or >." : undefined,
    description: draft.description.length > DESCRIPTION_MAX ? "Description is too long." : /[<>]/.test(draft.description) ? "Descriptions can't contain < or >." : undefined,
    tags: draft.tags.some((t) => /[<>,]/.test(t)) ? "Tags can't contain <, > or commas." : undefined,
  };
  const invalid = Boolean(errors.title || errors.description || errors.tags);

  const save = async () => {
    if (invalid || busy) return false;
    setBusy(true);
    const ok = await updateVideo(video.id, metadataPatch(video, draft));
    setBusy(false);
    if (ok) onOpenChange(false);
    return ok;
  };

  useUnsavedChanges(dirty, save, "video details");

  const set = <K extends keyof MetaDraft>(key: K, value: MetaDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : dirty ? setConfirmClose(true) : onOpenChange(false))}>
        <SheetContent className="w-full max-w-[560px] sm:max-w-[560px]">
          <SheetHeader>
            <SheetTitle className="text-[15px] text-[#0F1B3D]">Edit details</SheetTitle>
            <SheetDescription className="line-clamp-1 text-[12.5px]">Changes are saved to YouTube.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {!can.canEditVideo.allowed && <Notice tone="amber" title="Editing unavailable">{can.canEditVideo.reason}</Notice>}
            <FormField label="Title" required htmlFor="em-title" counter={{ value: draft.title.length, max: TITLE_MAX }} error={errors.title}>
              <input id="em-title" className={yt.input} value={draft.title} onChange={(e) => set("title", e.target.value)} />
            </FormField>
            <FormField label="Description" htmlFor="em-desc" counter={{ value: draft.description.length, max: DESCRIPTION_MAX }} error={errors.description}>
              <textarea id="em-desc" rows={7} className={yt.textarea} value={draft.description} onChange={(e) => set("description", e.target.value)} />
            </FormField>
            <FormField label="Tags" htmlFor="em-tags" error={errors.tags} hint="Press Enter or comma to add. Tags help with misspellings and related searches.">
              <TagInput id="em-tags" value={draft.tags} onChange={(t) => set("tags", t)} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Category">
                <SelectMenu label="Category" size="md" fullWidth value={draft.categoryId} onChange={(v) => set("categoryId", v)} options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
              </FormField>
              <FormField label="Video language" hint="Set in YouTube Studio.">
                <SelectMenu label="Language" size="md" fullWidth disabled value={video.language ?? ""} onChange={() => undefined} options={[{ value: video.language ?? "", label: video.language ? languageLabel(video.language) : "Not set" }, ...LANGUAGES.filter((l) => l.id !== video.language).map((l) => ({ value: l.id, label: l.label }))]} />
              </FormField>
            </div>
            <FormField label="Visibility" hint={video.status === "scheduled" ? "Scheduled videos stay private until their publish time. Change the schedule to change when they go public." : undefined}>
              <SelectMenu<Visibility>
                label="Visibility"
                size="md"
                fullWidth
                disabled={video.status === "scheduled"}
                value={draft.visibility}
                onChange={(v) => set("visibility", v)}
                options={(["private", "unlisted", "public"] as Visibility[]).map((v) => ({ value: v, label: VISIBILITY_LABEL[v] }))}
              />
            </FormField>
            <div className="divide-y divide-[#EEF1F5] rounded-sm border border-[#E4E9F0]">
              <ToggleRow label="Made for kids" description="Required by COPPA. Limits comments, notifications and personalised ads." checked={draft.madeForKids} onChange={(c) => set("madeForKids", c)} />
              <ToggleRow label="Allow comments" description="Comments can only be turned on or off in YouTube Studio." checked={video.commentsEnabled !== false && !draft.madeForKids} disabled onChange={() => undefined} />
            </div>
          </SheetBody>
          <SheetFooter className="justify-between">
            <span className="text-[12px] text-[#6B7890]">{dirty ? "Unsaved changes" : "No changes"}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => (dirty ? setConfirmClose(true) : onOpenChange(false))} disabled={busy}>Cancel</Button>
              <Button variant="primary" loading={busy} disabled={!dirty || invalid} disabledReason={invalid ? "Fix the highlighted fields" : "Make a change to save"} gate={can.canEditVideo} onClick={() => void save()}>
                Save changes
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Discard unsaved changes?"
        description="Your edits to this video's details haven't been saved to YouTube."
        confirmLabel="Discard changes"
        onConfirm={() => onOpenChange(false)}
      />
    </>
  );
}

export function ToggleRow({ label, description, checked, onChange, disabled, badge }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; badge?: React.ReactNode }) {
  return (
    <label className={cn("flex items-center justify-between gap-4 px-3.5 py-3", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D]">{label}{badge}</span>
        {description && <span className="mt-0.5 block text-[12px] leading-4 text-[#6B7890]">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Channel health detail                                               */
/* ------------------------------------------------------------------ */

export function HealthDetailSheet({ open, onOpenChange, analytics }: { open: boolean; onOpenChange: (open: boolean) => void; analytics: QueryView<ChannelAnalytics> }) {
  const { channel, videos } = useYouTube();
  const comparison = useMemo(() => {
    const d = analytics.data;
    if (!analytics.enabled || !d.hasData) return null;
    return {
      current: { views: d.rawTotals.current.views, likes: d.likes.current, comments: d.comments.current, netSubscribers: d.rawTotals.current.subscribers },
      previous: { views: d.rawTotals.previous.views, likes: d.likes.previous, comments: d.comments.previous, netSubscribers: d.rawTotals.previous.subscribers },
    };
  }, [analytics.data, analytics.enabled]);
  const { score, factors } = useMemo(() => channelHealth(channel, videos, comparison), [channel, videos, comparison]);
  const sorted = [...factors].sort((a, b) => a.score - b.score);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[560px] sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-[15px] text-[#0F1B3D]">Channel health</SheetTitle>
          <SheetDescription className="text-[12.5px]">An OmniPlatform score built from your synced channel data. It isn&apos;t a YouTube metric and doesn&apos;t affect how YouTube ranks your videos.</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div className="flex items-center gap-4 rounded-[10px] border border-[#EEF1F5] bg-[#F8FAFC] p-4">
            <ScoreRing score={score} size={72} />
            <div>
              <p className="text-[13px] font-semibold text-[#0F1B3D]">{score >= 80 ? "Healthy channel" : score >= 60 ? "Room to improve" : "Needs attention"}</p>
              <p className="mt-0.5 text-[12.5px] leading-5 text-[#6B7890]">Start with the lowest-scoring areas below — they&apos;re ordered by impact.</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {sorted.map((f) => (
              <FactorRow key={f.key} factor={f} onNavigate={() => onOpenChange(false)} />
            ))}
          </ul>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export function FactorRow({ factor, onNavigate }: { factor: ScoreFactor; onNavigate?: () => void }) {
  const tone = scoreTone(factor.score);
  return (
    <li className="rounded-[10px] border border-[#E4E9F0] bg-white p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-[#0F1B3D]">{factor.label}</p>
        <Badge tone={tone}>{factor.score}/100</Badge>
      </div>
      <Meter value={factor.score} tone={tone} className="mt-2" />
      <p className="mt-2 text-[12.5px] leading-5 text-[#3C4A66]">{factor.explanation}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-sm bg-[#F8FAFC] px-2.5 py-2">
        <p className="min-w-0 flex-1 text-[12px] leading-4 text-[#24324F]"><b className="font-semibold">Recommended:</b> {factor.recommendation}</p>
        {factor.action && (
          <Button size="xs" variant="secondary" href={factor.action.href} onClick={onNavigate}>{factor.action.label}</Button>
        )}
      </div>
    </li>
  );
}

export function ScoreRing({ score, size = 96, label = "/100" }: { score: number; size?: number; label?: string }) {
  const stroke = size > 80 ? 8 : 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "#12B76A" : score >= 60 ? "#F79009" : "#E5202E";
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#EEF1F5" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className="absolute text-center leading-none">
        <b className={cn("font-semibold tabular-nums text-[#0F1B3D]", size > 80 ? "text-[24px]" : "text-[18px]")}>{score}</b>
        <small className="block text-[10.5px] text-[#98A2B3]">{label}</small>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Delete video confirm                                                */
/* ------------------------------------------------------------------ */

export function DeleteVideosDialog({ open, onOpenChange, videos, onDeleted }: { open: boolean; onOpenChange: (open: boolean) => void; videos: Video[]; onDeleted?: () => void }) {
  const { deleteVideos, can } = useYouTube();
  const ids = videos.map((v) => v.id);
  const single = videos.length === 1 ? videos[0] : undefined;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={single ? `Delete “${single.title}”?` : `Delete ${videos.length} videos?`}
      description="This permanently deletes the video from YouTube, including its views, comments and analytics. This can't be undone."
      affected={[
        ...videos.slice(0, 5).map((v) => `${v.title} · ${v.stats.views === null ? "views unavailable" : `${v.stats.views.toLocaleString("en-IN")} views`}`),
        ...(videos.length > 5 ? [`…and ${videos.length - 5} more`] : []),
        ...(can.canDeleteVideo.allowed ? [] : [can.canDeleteVideo.reason ?? "You can't delete videos."]),
      ]}
      confirmText={videos.length > 1 ? "DELETE" : undefined}
      confirmLabel={single ? "Delete video" : `Delete ${videos.length} videos`}
      onConfirm={async () => {
        if (!can.canDeleteVideo.allowed) return false;
        const ok = await deleteVideos(ids);
        if (ok) onDeleted?.();
        return ok;
      }}
    />
  );
}

export function exportVideosCsv(videos: Video[], filename = "youtube-content.csv") {
  const header = ["Video ID", "Title", "Type", "Visibility", "Status", "Published", "Views", "Watch time (hours, last 28 days)", "Likes", "Comments", "URL"];
  const rows = videos.map((v) => [
    v.id,
    v.title,
    v.type,
    v.visibility,
    v.status,
    v.publishedAt ? fmtDate(v.publishedAt, "yyyy-MM-dd") : "",
    v.stats.views ?? "",
    v.stats.watchTimeHours === null ? "" : Number(v.stats.watchTimeHours.toFixed(2)),
    v.stats.likes ?? "",
    v.stats.comments ?? "",
    ytRoutes.watch(v.id),
  ]);
  downloadCsv([header, ...rows], filename);
  toast.success(`Exported ${videos.length} ${videos.length === 1 ? "row" : "rows"}`, { description: filename });
}

export function downloadCsv(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
