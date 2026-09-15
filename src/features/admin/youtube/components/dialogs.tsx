"use client";

import { useMemo, useRef, useState } from "react";
import { addDays, format, formatDistanceToNowStrict, parseISO } from "date-fns";
import {
  CheckCircle2,
  Clock3,
  Globe2,
  History,
  Link2,
  Lock,
  Plus,
  RotateCcw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { THUMBNAIL_LIBRARY } from "../data/mock";
import { useNow } from "../hooks/use-now";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { CATEGORIES, DESCRIPTION_MAX, LANGUAGES, TIMEZONES, TITLE_MAX, VISIBILITY_LABEL, ytRoutes } from "../lib/constants";
import { date as fmtDate, dateTime, relative } from "../lib/format";
import { channelHealth, scoreTone, type ScoreFactor } from "../lib/insights";
import { useYouTube } from "../store/youtube-store";
import type { Playlist, VersionField, Video, Visibility } from "../types";
import {
  Badge,
  Button,
  ChoiceCard,
  ConfirmDialog,
  EmptyState,
  FormField,
  InternalBadge,
  Meter,
  Notice,
  SearchField,
  SelectMenu,
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
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const error = !title.trim() ? "Give the playlist a title." : title.length > 150 ? "Titles can be up to 150 characters." : undefined;

  const submit = async () => {
    setTouched(true);
    if (error) return;
    setBusy(true);
    const playlist = await createPlaylist({ title: title.trim(), description: description.trim(), visibility }, videoIds);
    setBusy(false);
    if (playlist) {
      onOpenChange(false);
      onCreated?.(playlist);
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
                { value: "public", label: "Public", description: "Anyone can search for and view" },
                { value: "unlisted", label: "Unlisted", description: "Anyone with the link can view" },
                { value: "private", label: "Private", description: "Only you and people you choose" },
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
  const { playlists, addToPlaylists, can } = useYouTube();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = playlists.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
  const already = (p: Playlist) => videoIds.every((id) => p.videoIds.includes(id));

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
            {filtered.length === 0 && <li className="px-2 py-6 text-center text-[12.5px] text-[#6B7890]">No playlists match “{query}”.</li>}
            {filtered.map((p) => {
              const inAll = already(p);
              const checked = inAll || selected.includes(p.id);
              return (
                <li key={p.id}>
                  <label className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#F8FAFC]", inAll && "cursor-default opacity-70")}>
                    <Checkbox
                      checked={checked}
                      disabled={inAll}
                      onCheckedChange={(c) => setSelected((prev) => (c ? [...prev, p.id] : prev.filter((x) => x !== p.id)))}
                      aria-label={p.title}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[#0F1B3D]">{p.title}</span>
                      <span className="block text-[11.5px] text-[#6B7890]">
                        {VISIBILITY_LABEL[p.visibility]} · {p.videoIds.length} videos{inAll ? " · Already added" : ""}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
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
      <CreatePlaylistDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        videoIds={videoIds}
        onCreated={() => onOpenChange(false)}
      />
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

function ScheduleBody({ open, onOpenChange, video }: VideoDialogProps & { video: Video }) {
  const { scheduleVideo, settings, can } = useYouTube();
  const now = useNow();
  const [day, setDay] = useState(() => format(video.scheduledAt ? parseISO(video.scheduledAt) : addDays(new Date(), 1), "yyyy-MM-dd"));
  const [time, setTime] = useState(() => (video.scheduledAt ? format(parseISO(video.scheduledAt), "HH:mm") : "10:00"));
  const [timezone, setTimezone] = useState(settings.defaults.timezone);
  const [busy, setBusy] = useState(false);

  const when = day && time ? new Date(`${day}T${time}`) : null;
  const error = !when || Number.isNaN(when.getTime()) ? "Pick a date and time." : when.getTime() < now + 15 * 60_000 ? "Schedule at least 15 minutes from now." : undefined;
  const isReschedule = Boolean(video?.scheduledAt);

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[440px] gap-0 p-0">
        <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">{isReschedule ? "Reschedule" : "Schedule"} video</DialogTitle>
          <DialogDescription className="line-clamp-1 text-[12.5px] text-[#6B7890]">{video?.title}</DialogDescription>
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
          <FormField label="Time zone">
            <SelectMenu label="Time zone" size="md" fullWidth value={timezone} onChange={setTimezone} options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
          </FormField>
          {error ? (
            <Notice tone="amber" title={error} />
          ) : (
            <Notice tone="blue" title={`Goes public ${when ? format(when, "EEE, MMM d 'at' h:mm a") : ""}`}>
              The video stays private until then{when ? ` — ${formatDistanceToNowStrict(when, { addSuffix: true })}` : ""}.
            </Notice>
          )}
        </div>
        <DialogFooter className="border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            variant="primary"
            icon={Clock3}
            loading={busy}
            disabled={Boolean(error)}
            disabledReason={error}
            gate={can.canSchedule}
            onClick={async () => {
              if (!video || !when) return;
              setBusy(true);
              const ok = await scheduleVideo(video.id, when.toISOString());
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
  const [value, setValue] = useState<Visibility>("public");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[440px] gap-0 p-0">
        <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Change visibility</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#6B7890]">Applies to {videoIds.length} selected {videoIds.length === 1 ? "video" : "videos"}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-5 py-4">
          <ChoiceCard name="bulk-vis" checked={value === "public"} onSelect={() => setValue("public")} icon={Globe2} title="Public" description="Everyone can watch." />
          <ChoiceCard name="bulk-vis" checked={value === "unlisted"} onSelect={() => setValue("unlisted")} icon={Link2} title="Unlisted" description="Anyone with the link can watch." />
          <ChoiceCard name="bulk-vis" checked={value === "private"} onSelect={() => setValue("private")} icon={Lock} title="Private" description="Only you and people you choose." />
        </div>
        <DialogFooter className="border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            gate={can.canEditVideo}
            onClick={async () => {
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

export function ThumbnailManager(props: VideoDialogProps) {
  return props.open && props.video ? <ThumbnailBody {...props} video={props.video} /> : null;
}

function ThumbnailBody({ open, onOpenChange, video }: VideoDialogProps & { video: Video }) {
  const { changeThumbnail, thumbnailHistory, features, can, channel } = useYouTube();
  const [candidate, setCandidate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const history = thumbnailHistory[video.id] ?? [];
  const suggestions = THUMBNAIL_LIBRARY.filter((u) => u !== video.thumbnailUrl).slice(0, 4);
  const preview = candidate ?? video.thumbnailUrl;
  const thumbGate = features.customThumbnailsEnabled ? can.canEditVideo : { allowed: false, reason: "Custom thumbnails require a verified channel. Verify in YouTube Studio.", fix: "enable_feature" as const };

  const accept = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setError("Use a JPG, PNG, GIF or WebP image.");
      return;
    }
    if (file.size > MAX_THUMB_BYTES) {
      setError("Thumbnails must be 2 MB or smaller.");
      return;
    }
    setError(null);
    setCandidate(URL.createObjectURL(file));
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
                disabled={!thumbGate.allowed}
                className={cn(
                  "flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition",
                  dragging ? "border-[#E5202E] bg-[#FFF8F8]" : "border-[#C9D1DC] bg-[#F8FAFC] hover:border-[#98A2B3]",
                  !thumbGate.allowed && "cursor-not-allowed opacity-60",
                  yt.focus,
                )}
              >
                <Upload className="size-5 text-[#6B7890]" />
                <span className="mt-2 text-[13px] font-semibold text-[#0F1B3D]">Drop an image or click to browse</span>
                <span className="mt-0.5 text-[11.5px] text-[#6B7890]">1280×720 recommended · JPG, PNG, GIF or WebP · up to 2 MB</span>
              </button>
              <input ref={input} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={(e) => accept(e.target.files?.[0])} />
              {error && <p role="alert" className="mt-1.5 text-[12px] font-medium text-[#C81E2B]">{error}</p>}
              {!thumbGate.allowed && <p className="mt-1.5 text-[12px] text-[#B54708]">{thumbGate.reason}</p>}
            </div>

            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">From your media library</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {suggestions.map((url) => (
                  <button key={url} type="button" onClick={() => setCandidate(url)} aria-pressed={candidate === url} className={cn("rounded-md ring-offset-2 transition", candidate === url ? "ring-2 ring-[#E5202E]" : "hover:ring-2 hover:ring-[#C9D1DC]", yt.focus)}>
                    <Thumb src={url} sizes="140px" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">
                Previous thumbnails <InternalBadge label="OmniPlatform history" />
              </p>
              {history.length === 0 ? (
                <p className="text-[12px] text-[#98A2B3]">Thumbnails you replace from OmniPlatform will appear here.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {history.map((url) => (
                    <button key={url} type="button" onClick={() => setCandidate(url)} aria-pressed={candidate === url} className={cn("rounded-md ring-offset-2", candidate === url ? "ring-2 ring-[#E5202E]" : "hover:ring-2 hover:ring-[#C9D1DC]", yt.focus)}>
                      <Thumb src={url} sizes="120px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">Preview</p>
            <div className="rounded-lg border border-[#EEF1F5] bg-[#F8FAFC] p-3">
              <Thumb src={preview} durationSec={video.durationSec} sizes="280px" />
              <div className="mt-2.5 flex gap-2">
                <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-[#E4E9F0]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={channel.avatarUrl} alt="" className="size-full object-contain" />
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
            gate={thumbGate}
            onClick={async () => {
              if (!candidate) return;
              setBusy(true);
              const ok = await changeThumbnail(video.id, candidate);
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

type MetaDraft = Pick<Video, "title" | "description" | "tags" | "categoryId" | "language" | "visibility" | "madeForKids" | "commentsEnabled" | "playlistIds">;

const pickDraft = (v: Video): MetaDraft => ({
  title: v.title,
  description: v.description,
  tags: v.tags,
  categoryId: v.categoryId,
  language: v.language,
  visibility: v.visibility,
  madeForKids: v.madeForKids,
  commentsEnabled: v.commentsEnabled,
  playlistIds: v.playlistIds,
});

export function EditMetadataSheet(props: VideoDialogProps) {
  return props.open && props.video ? <EditMetadataBody {...props} video={props.video} /> : null;
}

function EditMetadataBody({ open, onOpenChange, video }: VideoDialogProps & { video: Video }) {
  const { updateVideo, playlists, can } = useYouTube();
  const [draft, setDraft] = useState<MetaDraft>(() => pickDraft(video));
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const dirty = JSON.stringify(pickDraft(video)) !== JSON.stringify(draft);
  const errors = {
    title: !draft.title.trim() ? "Title is required." : draft.title.length > TITLE_MAX ? `Keep the title under ${TITLE_MAX} characters.` : undefined,
    description: draft.description.length > DESCRIPTION_MAX ? "Description is too long." : undefined,
  };
  const invalid = Boolean(errors.title || errors.description);

  const save = async () => {
    if (invalid) return false;
    setBusy(true);
    const ok = await updateVideo(video.id, draft);
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
            <SheetDescription className="line-clamp-1 text-[12.5px]">Changes are saved to YouTube and tracked in OmniPlatform version history.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {!can.canEditVideo.allowed && <Notice tone="amber" title="Editing unavailable">{can.canEditVideo.reason}</Notice>}
            <FormField label="Title" required htmlFor="em-title" counter={{ value: draft.title.length, max: TITLE_MAX }} error={errors.title}>
              <input id="em-title" className={yt.input} value={draft.title} onChange={(e) => set("title", e.target.value)} />
            </FormField>
            <FormField label="Description" htmlFor="em-desc" counter={{ value: draft.description.length, max: DESCRIPTION_MAX }} error={errors.description}>
              <textarea id="em-desc" rows={7} className={yt.textarea} value={draft.description} onChange={(e) => set("description", e.target.value)} />
            </FormField>
            <FormField label="Tags" htmlFor="em-tags" hint="Press Enter or comma to add. Tags help with misspellings and related searches.">
              <TagInput id="em-tags" value={draft.tags} onChange={(t) => set("tags", t)} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Category">
                <SelectMenu label="Category" size="md" fullWidth value={draft.categoryId} onChange={(v) => set("categoryId", v)} options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
              </FormField>
              <FormField label="Video language">
                <SelectMenu label="Language" size="md" fullWidth value={draft.language} onChange={(v) => set("language", v)} options={LANGUAGES.map((l) => ({ value: l.id, label: l.label }))} />
              </FormField>
            </div>
            <FormField label="Visibility" hint={video.status === "scheduled" ? "Scheduled videos stay private until their publish time." : undefined}>
              <SelectMenu<Visibility>
                label="Visibility"
                size="md"
                fullWidth
                disabled={video.status === "scheduled"}
                value={draft.visibility}
                onChange={(v) => set("visibility", v)}
                options={(["public", "unlisted", "private"] as Visibility[]).map((v) => ({ value: v, label: VISIBILITY_LABEL[v] }))}
              />
            </FormField>
            <FormField label="Playlists">
              <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-[#DCE2EA] p-1.5">
                {playlists.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] text-[#24324F] hover:bg-[#F8FAFC]">
                    <Checkbox checked={draft.playlistIds.includes(p.id)} onCheckedChange={(c) => set("playlistIds", c ? [...draft.playlistIds, p.id] : draft.playlistIds.filter((x) => x !== p.id))} />
                    <span className="truncate">{p.title}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <div className="divide-y divide-[#EEF1F5] rounded-lg border border-[#E4E9F0]">
              <ToggleRow label="Made for kids" description="Required by COPPA. Limits comments, notifications and personalised ads." checked={draft.madeForKids} onChange={(c) => set("madeForKids", c)} />
              <ToggleRow label="Allow comments" description={draft.madeForKids ? "Comments are always off for made-for-kids videos." : "Viewers can comment on this video."} checked={draft.commentsEnabled && !draft.madeForKids} disabled={draft.madeForKids} onChange={(c) => set("commentsEnabled", c)} />
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
/* Version history                                                     */
/* ------------------------------------------------------------------ */

const FIELD_LABEL: Record<VersionField, string> = {
  title: "Title",
  description: "Description",
  tags: "Tags",
  thumbnail: "Thumbnail",
  visibility: "Visibility",
  schedule: "Schedule",
};

export function VersionHistorySheet({ open, onOpenChange, video }: { open: boolean; onOpenChange: (open: boolean) => void; video: Video | null }) {
  const { versions, restoreVersion, can } = useYouTube();
  const [restoring, setRestoring] = useState<string | null>(null);
  const entries = versions.filter((v) => v.videoId === video?.id);

  const show = (field: VersionField, value: string) => {
    if (field === "thumbnail") return <Thumb src={value} className="w-28" sizes="112px" />;
    if (field === "schedule") return <span>{value.includes("T") ? dateTime(value) : value}</span>;
    return <span className="line-clamp-3 break-words">{value}</span>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[520px] sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-[15px] text-[#0F1B3D]">Version history <InternalBadge /></SheetTitle>
          <SheetDescription className="text-[12.5px]">Changes made through OmniPlatform. Edits made directly in YouTube Studio aren&apos;t tracked here.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {entries.length === 0 ? (
            <EmptyState compact icon={History} title="No changes recorded yet" description="When someone edits the title, description, tags, thumbnail, visibility or schedule, the previous value is saved here." />
          ) : (
            <ol className="relative space-y-4 border-l border-[#E4E9F0] pl-5">
              {entries.map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[26px] top-1 size-2.5 rounded-full border-2 border-white bg-[#98A2B3] ring-1 ring-[#E4E9F0]" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12.5px] text-[#3C4A66]">
                      <b className="font-semibold text-[#0F1B3D]">{entry.actor}</b> changed <b className="font-semibold text-[#0F1B3D]">{FIELD_LABEL[entry.field].toLowerCase()}</b>
                    </p>
                    <span className="text-[11.5px] text-[#98A2B3]" title={dateTime(entry.at)}>{relative(entry.at)}</span>
                  </div>
                  <div className="mt-2 grid gap-2 rounded-lg border border-[#EEF1F5] bg-[#F8FAFC] p-2.5 text-[12px] sm:grid-cols-2">
                    <div className="min-w-0">
                      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[#98A2B3]">Before</p>
                      <div className="text-[#6B7890] line-through decoration-[#C9D1DC]">{show(entry.field, entry.previous)}</div>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[#98A2B3]">After</p>
                      <div className="text-[#0F1B3D]">{show(entry.field, entry.next)}</div>
                    </div>
                  </div>
                  {entry.field !== "schedule" && (
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={RotateCcw}
                      className="mt-1.5"
                      loading={restoring === entry.id}
                      gate={can.canEditVideo}
                      onClick={async () => {
                        setRestoring(entry.id);
                        await restoreVersion(entry.id);
                        setRestoring(null);
                      }}
                    >
                      Restore previous {FIELD_LABEL[entry.field].toLowerCase()}
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Channel health detail                                               */
/* ------------------------------------------------------------------ */

export function HealthDetailSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { channel, videos, comments, features } = useYouTube();
  const { score, factors } = useMemo(() => channelHealth(channel, videos, comments, features.monetizationEnabled), [channel, videos, comments, features.monetizationEnabled]);
  const sorted = [...factors].sort((a, b) => a.score - b.score);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[560px] sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-[15px] text-[#0F1B3D]">Channel health <InternalBadge /></SheetTitle>
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
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F8FAFC] px-2.5 py-2">
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
  const { deleteVideos, playlists, comments } = useYouTube();
  const ids = videos.map((v) => v.id);
  const playlistCount = playlists.filter((p) => p.videoIds.some((id) => ids.includes(id))).length;
  const commentCount = comments.filter((c) => ids.includes(c.videoId)).length;
  const single = videos.length === 1 ? videos[0] : undefined;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={single ? `Delete “${single.title}”?` : `Delete ${videos.length} videos?`}
      description="This permanently deletes the video from YouTube, including its views, comments and analytics. It also removes it from connected OmniPlatform views. This can't be undone."
      affected={[
        ...videos.slice(0, 5).map((v) => `${v.title} · ${v.stats.views.toLocaleString("en-IN")} views`),
        ...(videos.length > 5 ? [`…and ${videos.length - 5} more`] : []),
        ...(playlistCount ? [`Removed from ${playlistCount} playlist${playlistCount > 1 ? "s" : ""}`] : []),
        ...(commentCount ? [`${commentCount} synced comment thread${commentCount > 1 ? "s" : ""} will be removed`] : []),
      ]}
      confirmText={videos.length > 1 ? "DELETE" : undefined}
      confirmLabel={single ? "Delete video" : `Delete ${videos.length} videos`}
      onConfirm={async () => {
        const ok = await deleteVideos(ids);
        if (ok) onDeleted?.();
        return ok;
      }}
    />
  );
}

export function exportVideosCsv(videos: Video[], filename = "youtube-content.csv") {
  const header = ["Video ID", "Title", "Type", "Visibility", "Status", "Published", "Views", "Watch time (hours)", "Likes", "Comments", "CTR (%)", "URL"];
  const rows = videos.map((v) => [
    v.id,
    v.title,
    v.type,
    v.visibility,
    v.status,
    v.publishedAt ? fmtDate(v.publishedAt, "yyyy-MM-dd") : "",
    v.stats.views,
    v.stats.watchTimeHours,
    v.stats.likes,
    v.stats.comments,
    v.stats.ctr ?? "",
    ytRoutes.watch(v.id),
  ]);
  downloadCsv([header, ...rows], filename);
  toast.success(`Exported ${videos.length} ${videos.length === 1 ? "row" : "rows"}`, { description: filename });
}

export function downloadCsv(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
