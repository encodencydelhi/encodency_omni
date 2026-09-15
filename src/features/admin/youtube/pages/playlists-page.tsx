"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Eye,
  Filter,
  Globe2,
  GripVertical,
  LayoutGrid,
  ListPlus,
  ListVideo,
  MoreHorizontal,
  Pencil,
  Plus,
  Rows3,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreatePlaylistDialog } from "../components/dialogs";
import { PageSkeleton } from "../components/states";
import {
  ActionMenu,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FormField,
  Notice,
  PageTitle,
  SearchField,
  Segmented,
  SelectMenu,
  StatusBadge,
  Thumb,
  TypeBadge,
  VisibilityLabel,
  buttonClass,
  useDebounced,
  type MenuItem,
  yt,
} from "../components/ui";
import { useQueryState } from "../hooks/use-query-state";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { VISIBILITY_LABEL, ytRoutes } from "../lib/constants";
import { compact, duration, relative } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { Playlist, Video, Visibility } from "../types";

const DEFAULTS = { q: "", visibility: "all", sort: "updated", view: "grid" };

export function PlaylistsPage() {
  const { ready } = useYouTube();
  if (!ready) return <PageSkeleton variant="table" />;
  return <PlaylistsList />;
}

function Collage({ videos, className }: { videos: Video[]; className?: string }) {
  const thumbs = videos.slice(0, 3);
  if (thumbs.length === 0) {
    return (
      <div className={cn("grid aspect-video place-items-center bg-[#F1F4F8] text-[#98A2B3]", className)}>
        <ListVideo className="size-7" />
      </div>
    );
  }
  return (
    <div className={cn("grid aspect-video grid-cols-[2fr_1fr] grid-rows-2 gap-0.5 overflow-hidden bg-[#E4E9F0]", className)}>
      <Thumb src={thumbs[0]!.thumbnailUrl} className="row-span-2 h-full rounded-none aspect-auto" sizes="240px" />
      {thumbs[1] ? <Thumb src={thumbs[1].thumbnailUrl} className="h-full rounded-none aspect-auto" sizes="120px" /> : <span className="bg-[#F1F4F8]" />}
      {thumbs[2] ? <Thumb src={thumbs[2].thumbnailUrl} className="h-full rounded-none aspect-auto" sizes="120px" /> : <span className="bg-[#F1F4F8]" />}
    </div>
  );
}

function usePlaylistActions() {
  const { can } = useYouTube();
  const [edit, setEdit] = useState<Playlist | null>(null);
  const [add, setAdd] = useState<Playlist | null>(null);
  const [remove, setRemove] = useState<Playlist | null>(null);
  const router = useRouter();

  const items = (p: Playlist): (MenuItem | "separator")[] => [
    { label: "View", icon: Eye, href: ytRoutes.playlist(p.id) },
    { label: "Edit details", icon: Pencil, onSelect: () => setEdit(p), gate: can.canManagePlaylists },
    { label: "Add videos", icon: ListPlus, onSelect: () => setAdd(p), gate: can.canManagePlaylists },
    { label: "Reorder videos", icon: ArrowUpDown, onSelect: () => router.push(`${ytRoutes.playlist(p.id)}?reorder=1`), gate: can.canManagePlaylists },
    { label: "Change visibility", icon: Globe2, onSelect: () => setEdit(p), gate: can.canManagePlaylists },
    { label: "Open on YouTube", icon: ExternalLink, href: ytRoutes.playlistOnYouTube(p.id), external: true, hidden: p.visibility === "private" },
    "separator",
    { label: "Delete playlist", icon: Trash2, danger: true, onSelect: () => setRemove(p), gate: can.canManagePlaylists },
  ];

  return { items, edit, setEdit, add, setAdd, remove, setRemove };
}

function PlaylistsList() {
  const { playlists, videos, can } = useYouTube();
  const router = useRouter();
  const { values, set, reset, activeCount } = useQueryState(DEFAULTS);
  const [createOpen, setCreateOpen] = useState(false);
  const actions = usePlaylistActions();
  const [search, setSearch] = useState(values.q);
  const debounced = useDebounced(search, 250);
  useEffect(() => {
    if (debounced.value !== values.q) set({ q: debounced.value });
    // Only the debounced text should drive the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced.value]);

  const rows = useMemo(() => {
    const q = values.q.toLowerCase();
    return playlists
      .filter((p) => (!q || p.title.toLowerCase().includes(q)) && (values.visibility === "all" || p.visibility === values.visibility))
      .sort((a, b) => (values.sort === "title" ? a.title.localeCompare(b.title) : values.sort === "videos" ? b.videoIds.length - a.videoIds.length : b.updatedAt.localeCompare(a.updatedAt)));
  }, [playlists, values]);

  const videosOf = (p: Playlist) => p.videoIds.map((id) => videos.find((v) => v.id === id)).filter(Boolean) as Video[];
  const filtersActive = activeCount - (values.view !== "grid" ? 1 : 0) - (values.sort !== "updated" ? 1 : 0);

  return (
    <div className="space-y-1">
      <PageTitle
        title="Playlists"
        description="Organise videos into collections viewers can binge."
        actions={<Button variant="primary" icon={Plus} gate={can.canManagePlaylists} onClick={() => setCreateOpen(true)}>Create playlist</Button>}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <SearchField value={search} onChange={setSearch} loading={debounced.pending} placeholder="Search playlists" className="w-full sm:w-[240px]" />
          <SelectMenu label="Visibility" prefix="Visibility:" value={values.visibility} onChange={(v) => set({ visibility: v })} options={[{ value: "all", label: "All" }, { value: "public", label: "Public" }, { value: "unlisted", label: "Unlisted" }, { value: "private", label: "Private" }]} />
          <SelectMenu label="Sort" prefix="Sort:" value={values.sort} onChange={(v) => set({ sort: v })} options={[{ value: "updated", label: "Last updated" }, { value: "title", label: "Title A–Z" }, { value: "videos", label: "Most videos" }]} />
          {filtersActive > 0 && <Button size="sm" variant="ghost" icon={X} onClick={() => { setSearch(""); reset(["view", "sort"]); }}>Clear filters</Button>}
          <Segmented label="View" className="ml-auto" value={values.view} onChange={(v) => set({ view: v })} items={[{ value: "grid", label: <span className="sr-only">Grid</span>, icon: LayoutGrid, title: "Grid view" }, { value: "list", label: <span className="sr-only">List</span>, icon: Rows3, title: "List view" }]} />
        </div>
      </Card>

      {playlists.length === 0 ? (
        <Card><EmptyState icon={ListVideo} title="No playlists yet" description="Create your first playlist to group related videos together." action={<Button variant="primary" icon={Plus} gate={can.canManagePlaylists} onClick={() => setCreateOpen(true)}>Create your first playlist</Button>} /></Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={Filter} title="No playlists match" description="Try a different search or visibility." action={<Button variant="secondary" icon={X} onClick={() => { setSearch(""); reset(["view", "sort"]); }}>Clear filters</Button>} /></Card>
      ) : values.view === "grid" ? (
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map((p) => (
            <div key={p.id} className={cn(yt.card, "group overflow-hidden transition hover:border-[#C9D1DC]")}>
              <Link href={ytRoutes.playlist(p.id)} className="relative block">
                <Collage videos={videosOf(p)} />
                <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-sm bg-[#0F1B3D]/80 px-1.5 py-0.5 text-[11px] font-semibold text-white"><ListVideo className="size-3" />{p.videoIds.length}</span>
              </Link>
              <div className="flex items-start gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <Link href={ytRoutes.playlist(p.id)} className="line-clamp-1 text-[13px] font-semibold text-[#0F1B3D] hover:text-[#2563EB]">{p.title}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-[#6B7890]">
                    <VisibilityLabel visibility={p.visibility} className="text-[11.5px]" />
                    <span>·</span>
                    <span>{p.videoIds.length} videos</span>
                    <span>·</span>
                    <span>Updated {relative(p.updatedAt)}</span>
                  </div>
                </div>
                <ActionMenu label={`Actions for ${p.title}`} items={actions.items(p)} trigger={<button type="button" className={buttonClass("ghost", "iconSm", "-mr-1")}><MoreHorizontal className="size-4" /></button>} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <ul className="divide-y divide-[#EEF1F5]">
            {rows.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#F8FAFC]">
                <button type="button" onClick={() => router.push(ytRoutes.playlist(p.id))} className="w-[120px] shrink-0 overflow-hidden rounded-sm" aria-label={`Open ${p.title}`}>
                  <Collage videos={videosOf(p)} />
                </button>
                <div className="min-w-0 flex-1">
                  <Link href={ytRoutes.playlist(p.id)} className="block truncate text-[13px] font-semibold text-[#0F1B3D] hover:text-[#2563EB]">{p.title}</Link>
                  <p className="truncate text-[12px] text-[#6B7890]">{p.description || "No description"}</p>
                </div>
                <VisibilityLabel visibility={p.visibility} className="hidden w-24 md:inline-flex" />
                <span className="hidden w-20 text-right text-[12.5px] tabular-nums text-[#24324F] sm:block">{p.videoIds.length} videos</span>
                <span className="hidden w-28 text-right text-[12px] text-[#6B7890] lg:block">{relative(p.updatedAt)}</span>
                <ActionMenu label={`Actions for ${p.title}`} items={actions.items(p)} trigger={<button type="button" className={buttonClass("ghost", "icon")}><MoreHorizontal className="size-4" /></button>} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(p) => router.push(ytRoutes.playlist(p.id))} />
      <PlaylistDialogs {...actions} />
    </div>
  );
}

function PlaylistDialogs({ edit, setEdit, add, setAdd, remove, setRemove, onDeleted }: ReturnType<typeof usePlaylistActions> & { onDeleted?: () => void }) {
  const { deletePlaylist } = useYouTube();
  return (
    <>
      <EditPlaylistDialog playlist={edit} onClose={() => setEdit(null)} />
      <AddVideosDialog playlist={add} onClose={() => setAdd(null)} />
      <ConfirmDialog
        open={remove !== null}
        onOpenChange={(o) => !o && setRemove(null)}
        title={`Delete “${remove?.title ?? ""}”?`}
        description="The playlist is deleted from YouTube. The videos in it are not deleted, but links to this playlist will stop working."
        affected={remove ? [`${remove.videoIds.length} videos will be removed from this playlist`, `Visibility: ${VISIBILITY_LABEL[remove.visibility]}`] : []}
        confirmLabel="Delete playlist"
        onConfirm={async () => {
          if (!remove) return false;
          const ok = await deletePlaylist(remove.id);
          if (ok) onDeleted?.();
          return ok;
        }}
      />
    </>
  );
}

function EditPlaylistDialog({ playlist, onClose }: { playlist: Playlist | null; onClose: () => void }) {
  return playlist ? <EditPlaylistBody key={playlist.id} playlist={playlist} onClose={onClose} /> : null;
}

function EditPlaylistBody({ playlist, onClose }: { playlist: Playlist; onClose: () => void }) {
  const { updatePlaylist, can } = useYouTube();
  const [title, setTitle] = useState(playlist.title);
  const [description, setDescription] = useState(playlist.description);
  const [visibility, setVisibility] = useState<Visibility>(playlist.visibility);
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = title !== playlist.title || description !== playlist.description || visibility !== playlist.visibility;
  const error = !title.trim() ? "Title is required." : undefined;

  const save = async () => {
    if (error) return false;
    setBusy(true);
    const ok = await updatePlaylist(playlist.id, { title: title.trim(), description, visibility });
    setBusy(false);
    if (ok) onClose();
    return ok;
  };

  useUnsavedChanges(dirty, save, "this playlist");

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && !busy && (dirty ? setConfirmDiscard(true) : onClose())}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-[480px] gap-0 p-0">
          <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
            <DialogTitle className="text-[15px] text-[#0F1B3D]">Edit playlist</DialogTitle>
            <DialogDescription className="text-[12.5px] text-[#6B7890]">Changes are saved to YouTube.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4">
            <FormField label="Title" required htmlFor="epl-title" counter={{ value: title.length, max: 150 }} error={error}>
              <input id="epl-title" className={yt.input} value={title} onChange={(e) => setTitle(e.target.value)} />
            </FormField>
            <FormField label="Description" htmlFor="epl-desc" counter={{ value: description.length, max: 5000 }}>
              <textarea id="epl-desc" rows={3} className={yt.textarea} value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
            <FormField label="Visibility">
              <SelectMenu<Visibility> label="Visibility" size="md" fullWidth value={visibility} onChange={setVisibility} options={(["public", "unlisted", "private"] as Visibility[]).map((v) => ({ value: v, label: VISIBILITY_LABEL[v] }))} />
            </FormField>
          </div>
          <DialogFooter className="border-t border-[#EEF1F5] px-5 py-3">
            <Button variant="secondary" disabled={busy} onClick={() => (dirty ? setConfirmDiscard(true) : onClose())}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!dirty || Boolean(error)} disabledReason={error ?? "Make a change to save"} gate={can.canManagePlaylists} onClick={() => void save()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirmDiscard} onOpenChange={setConfirmDiscard} title="Discard changes to this playlist?" description="Your edits haven't been saved." confirmLabel="Discard" onConfirm={() => onClose()} />
    </>
  );
}

function AddVideosDialog({ playlist, onClose }: { playlist: Playlist | null; onClose: () => void }) {
  return playlist ? <AddVideosBody key={playlist.id} playlist={playlist} onClose={onClose} /> : null;
}

function AddVideosBody({ playlist, onClose }: { playlist: Playlist; onClose: () => void }) {
  const { videos, updatePlaylist, can } = useYouTube();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const candidates = videos.filter((v) => !playlist.videoIds.includes(v.id) && v.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[540px] gap-0 p-0">
        <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Add videos</DialogTitle>
          <DialogDescription className="line-clamp-1 text-[12.5px] text-[#6B7890]">to {playlist?.title}</DialogDescription>
        </DialogHeader>
        <div className="px-5 pt-3"><SearchField value={q} onChange={setQ} placeholder="Search your videos" autoFocus /></div>
        <ul className="max-h-[360px] overflow-y-auto px-3 py-2">
          {candidates.length === 0 && <li className="py-8 text-center text-[12.5px] text-[#6B7890]">{q ? `No videos match “${q}”.` : "Every video is already in this playlist."}</li>}
          {candidates.map((v) => (
            <li key={v.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-[#F8FAFC]">
                <Checkbox checked={selected.includes(v.id)} onCheckedChange={(c) => setSelected((prev) => (c ? [...prev, v.id] : prev.filter((x) => x !== v.id)))} aria-label={v.title} />
                <Thumb src={v.thumbnailUrl} durationSec={v.durationSec} className="w-[72px]" sizes="72px" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D]">{v.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5"><TypeBadge type={v.type} /><StatusBadge status={v.status} /></span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <DialogFooter className="border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!selected.length}
            disabledReason="Select at least one video"
            gate={can.canManagePlaylists}
            onClick={async () => {
              setBusy(true);
              const ok = await updatePlaylist(playlist.id, { videoIds: [...playlist.videoIds, ...selected] }, `Added ${selected.length} video${selected.length > 1 ? "s" : ""} to “${playlist.title}”`);
              setBusy(false);
              if (ok) onClose();
            }}
          >
            Add{selected.length ? ` ${selected.length}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

export function PlaylistDetailPage() {
  const { ready, playlists } = useYouTube();
  const params = useParams<{ playlistId: string }>();
  const playlist = playlists.find((p) => p.id === params?.playlistId);
  if (!ready) return <PageSkeleton variant="detail" />;
  if (!playlist) {
    return <Card><EmptyState icon={ListVideo} title="Playlist not found" description="It may have been deleted on YouTube or from OmniPlatform." action={<Button variant="primary" icon={ArrowLeft} href={ytRoutes.playlists}>Back to playlists</Button>} /></Card>;
  }
  // Remount when the saved order changes so the local drag order starts from it.
  return <PlaylistDetail key={playlist.videoIds.join()} playlist={playlist} />;
}

function PlaylistDetail({ playlist }: { playlist: Playlist }) {
  const { videos, can, updatePlaylist } = useYouTube();
  const router = useRouter();
  const actions = usePlaylistActions();
  const [order, setOrder] = useState(playlist.videoIds);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeVideo, setRemoveVideo] = useState<Video | null>(null);
  const { values } = useQueryState(useMemo(() => ({ reorder: "" }), []));


  const dirty = order.join() !== playlist.videoIds.join();
  const list = order.map((id) => videos.find((v) => v.id === id)).filter(Boolean) as Video[];
  const totalDuration = list.reduce((s, v) => s + v.durationSec, 0);
  const totalViews = list.reduce((s, v) => s + v.stats.views, 0);
  const canEdit = can.canManagePlaylists.allowed;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  };

  const saveOrder = async () => {
    setSaving(true);
    const ok = await updatePlaylist(playlist.id, { videoIds: order }, "Playlist order saved");
    setSaving(false);
    return ok;
  };

  useUnsavedChanges(dirty, saveOrder, "the playlist order");

  return (
    <div className="space-y-1">
      <Link href={ytRoutes.playlists} className="inline-flex items-center gap-1 rounded text-[12.5px] font-medium text-[#6B7890] hover:text-[#0F1B3D]"><ArrowLeft className="size-3.5" /> Playlists</Link>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden lg:sticky lg:top-[76px]">
          <Collage videos={list} />
          <div className="space-y-3 p-4">
            <div>
              <h2 className="text-[16px] font-semibold leading-5 text-[#0F1B3D]">{playlist.title}</h2>
              <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-5 text-[#3C4A66]">{playlist.description || <span className="text-[#98A2B3]">No description</span>}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2">
              {[
                ["Visibility", <VisibilityLabel key="v" visibility={playlist.visibility} />],
                ["Videos", String(list.length)],
                ["Total length", duration(totalDuration)],
                ["Total views", compact(totalViews)],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-sm bg-[#F8FAFC] px-2.5 py-2">
                  <dt className="text-[11px] text-[#6B7890]">{label}</dt>
                  <dd className="mt-0.5 text-[13px] font-semibold text-[#0F1B3D]">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[11.5px] text-[#98A2B3]">Updated {relative(playlist.updatedAt)} · Created {relative(playlist.createdAt)}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" icon={ListPlus} gate={can.canManagePlaylists} onClick={() => actions.setAdd(playlist)} className="flex-1">Add videos</Button>
              <Button size="sm" variant="secondary" icon={Pencil} gate={can.canManagePlaylists} onClick={() => actions.setEdit(playlist)}>Edit</Button>
              <ActionMenu
                label="More playlist actions"
                trigger={<button type="button" className={buttonClass("secondary", "icon")}><MoreHorizontal className="size-4" /></button>}
                items={[
                  { label: "Open on YouTube", icon: ExternalLink, href: ytRoutes.playlistOnYouTube(playlist.id), external: true, hidden: playlist.visibility === "private" },
                  { label: "Change visibility", icon: Globe2, onSelect: () => actions.setEdit(playlist), gate: can.canManagePlaylists },
                  "separator",
                  { label: "Delete playlist", icon: Trash2, danger: true, onSelect: () => actions.setRemove(playlist), gate: can.canManagePlaylists },
                ]}
              />
            </div>
          </div>
        </Card>

        <Card className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF1F5] px-4 py-3">
            <div>
              <h3 className="text-[13.5px] font-semibold text-[#0F1B3D]">Videos</h3>
              <p className="text-[12px] text-[#6B7890]">{canEdit ? "Drag to reorder, or use the arrows. Save when you're done." : "Read-only — you can't manage playlists."}</p>
            </div>
            {dirty && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setOrder(playlist.videoIds)}>Reset</Button>
                <Button size="sm" variant="primary" icon={Save} loading={saving} gate={can.canManagePlaylists} onClick={() => void saveOrder()}>Save order</Button>
              </div>
            )}
          </div>
          {values.reorder && !dirty && canEdit && <Notice tone="blue" className="m-3" title="Reorder mode">Drag videos by the handle or use the arrow buttons, then save.</Notice>}
          {list.length === 0 ? (
            <EmptyState icon={ListVideo} title="This playlist is empty" description="Add videos so viewers can watch them in sequence." action={<Button variant="primary" icon={ListPlus} gate={can.canManagePlaylists} onClick={() => actions.setAdd(playlist)}>Add videos</Button>} />
          ) : (
            <ol className="divide-y divide-[#EEF1F5]">
              {list.map((v, i) => (
                <li
                  key={v.id}
                  draggable={canEdit}
                  onDragStart={(e) => {
                    setDragging(i);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(i);
                  }}
                  onDragLeave={() => setOver((o) => (o === i ? null : o))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragging !== null) move(dragging, i);
                    setDragging(null);
                    setOver(null);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  className={cn("flex items-center gap-3 px-3 py-2 transition", dragging === i && "opacity-40", over === i && dragging !== i && "bg-[#FFF8F8] shadow-[inset_0_2px_0_#E5202E]")}
                >
                  {canEdit && <GripVertical className="size-4 shrink-0 cursor-grab text-[#98A2B3] active:cursor-grabbing" aria-hidden="true" />}
                  <span className="w-5 shrink-0 text-center text-[12px] font-semibold tabular-nums text-[#98A2B3]">{i + 1}</span>
                  <Link href={ytRoutes.video(v.id)} className="shrink-0"><Thumb src={v.thumbnailUrl} durationSec={v.durationSec} className="w-[96px]" sizes="96px" /></Link>
                  <div className="min-w-0 flex-1">
                    <Link href={ytRoutes.video(v.id)} className="line-clamp-1 text-[12.5px] font-semibold text-[#0F1B3D] hover:text-[#2563EB]">{v.title}</Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#6B7890]"><TypeBadge type={v.type} />{v.status === "published" ? `${compact(v.stats.views)} views` : <StatusBadge status={v.status} />}</p>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button size="iconSm" variant="ghost" aria-label={`Move ${v.title} up`} disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp className="size-3.5" /></Button>
                      <Button size="iconSm" variant="ghost" aria-label={`Move ${v.title} down`} disabled={i === list.length - 1} onClick={() => move(i, i + 1)}><ArrowDown className="size-3.5" /></Button>
                      <Button size="iconSm" variant="ghost" aria-label={`Remove ${v.title} from playlist`} onClick={() => setRemoveVideo(v)} className="hover:text-[#C81E2B]"><X className="size-3.5" /></Button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <PlaylistDialogs {...actions} onDeleted={() => router.push(ytRoutes.playlists)} />
      <ConfirmDialog
        open={removeVideo !== null}
        onOpenChange={(o) => !o && setRemoveVideo(null)}
        title={`Remove “${removeVideo?.title ?? ""}” from this playlist?`}
        description="The video itself isn't deleted — it's only removed from this playlist."
        confirmLabel="Remove from playlist"
        onConfirm={async () => {
          if (!removeVideo) return false;
          const base = dirty ? order : playlist.videoIds;
          return updatePlaylist(playlist.id, { videoIds: base.filter((id) => id !== removeVideo.id) }, "Video removed from playlist");
        }}
      />
    </div>
  );
}
