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
import { ApiError } from "@/types/api";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreatePlaylistDialog } from "../components/dialogs";
import { ErrorState, PageSkeleton } from "../components/states";
import {
  ActionMenu,
  Badge,
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
  Skeleton,
  StatusBadge,
  Thumb,
  VisibilityLabel,
  buttonClass,
  useDebounced,
  type MenuItem,
  yt,
} from "../components/ui";
import { usePlaylistItemsInfinite, usePlaylistQuery } from "../data/hooks";
import { toPlaylist, toPlaylistItem } from "../data/mappers";
import { useQueryState } from "../hooks/use-query-state";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { describeYouTubeError } from "../live/youtube-errors";
import { VISIBILITY_LABEL, ytRoutes } from "../lib/constants";
import { date, relative } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { Playlist, PlaylistItem, Visibility } from "../types";

const DEFAULTS = { q: "", visibility: "all", sort: "updated", view: "grid" };
const MAX_AUTO_PAGES = 5;

export function PlaylistsPage() {
  const { ready } = useYouTube();
  if (!ready) return <PageSkeleton variant="table" />;
  return <PlaylistsList />;
}

/** One image when the playlist has a thumbnail, otherwise the empty placeholder. */
function Collage({ thumbs, className }: { thumbs: (string | null | undefined)[]; className?: string }) {
  const first = thumbs.find(Boolean);
  if (!first) {
    return (
      <div className={cn("grid aspect-video place-items-center bg-[#F1F4F8] text-[#98A2B3]", className)}>
        <ListVideo className="size-7" />
      </div>
    );
  }
  return (
    <div className={cn("aspect-video overflow-hidden bg-[#E4E9F0]", className)}>
      <Thumb src={first} className="h-full w-full rounded-none aspect-auto" sizes="240px" />
    </div>
  );
}

const countLabel = (n: number | null) => (n === null ? "—" : `${n} ${n === 1 ? "video" : "videos"}`);

function usePlaylistActions() {
  const { can } = useYouTube();
  const [edit, setEdit] = useState<Playlist | null>(null);
  const [add, setAdd] = useState<Playlist | null>(null);
  const [remove, setRemove] = useState<Playlist | null>(null);
  const router = useRouter();

  const items = (p: Playlist): (MenuItem | "separator")[] => [
    { label: "View", icon: Eye, href: ytRoutes.playlist(p.id) },
    { label: "Edit details", icon: Pencil, onSelect: () => setEdit(p), gate: can.canManagePlaylists, hidden: p.system },
    { label: "Add videos", icon: ListPlus, onSelect: () => setAdd(p), gate: can.canManagePlaylists, hidden: p.system },
    { label: "Reorder videos", icon: ArrowUpDown, onSelect: () => router.push(`${ytRoutes.playlist(p.id)}?reorder=1`), gate: can.canManagePlaylists, hidden: p.system },
    { label: "Change visibility", icon: Globe2, onSelect: () => setEdit(p), gate: can.canManagePlaylists, hidden: p.system },
    { label: "Open on YouTube", icon: ExternalLink, href: ytRoutes.playlistOnYouTube(p.id), external: true, hidden: p.visibility === "private" },
    "separator",
    { label: "Delete playlist", icon: Trash2, danger: true, onSelect: () => setRemove(p), gate: can.canDeletePlaylist, hidden: p.system },
  ];

  return { items, edit, setEdit, add, setAdd, remove, setRemove };
}

function PlaylistsList() {
  const { playlists, playlistsState, can } = useYouTube();
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
      .sort((a, b) => (values.sort === "title" ? a.title.localeCompare(b.title) : values.sort === "videos" ? (b.itemCount ?? -1) - (a.itemCount ?? -1) : (b.createdAt ?? "").localeCompare(a.createdAt ?? "")));
  }, [playlists, values]);

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
          <SelectMenu label="Sort" prefix="Sort:" value={values.sort} onChange={(v) => set({ sort: v })} options={[{ value: "updated", label: "Newest first" }, { value: "title", label: "Title A–Z" }, { value: "videos", label: "Most videos" }]} />
          {filtersActive > 0 && <Button size="sm" variant="ghost" icon={X} onClick={() => { setSearch(""); reset(["view", "sort"]); }}>Clear filters</Button>}
          <Segmented label="View" className="ml-auto" value={values.view} onChange={(v) => set({ view: v })} items={[{ value: "grid", label: <span className="sr-only">Grid</span>, icon: LayoutGrid, title: "Grid view" }, { value: "list", label: <span className="sr-only">List</span>, icon: Rows3, title: "List view" }]} />
        </div>
      </Card>

      {playlistsState.isLoading ? (
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-busy="true" aria-label="Loading playlists">
          {[0, 1, 2, 3].map((i) => <Card key={i} className="overflow-hidden"><Skeleton className="aspect-video w-full rounded-none" /><div className="space-y-2 p-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></Card>)}
        </div>
      ) : playlistsState.isError && playlistsState.error && playlists.length === 0 ? (
        <Card><ErrorState error={playlistsState.error} onRetry={playlistsState.refetch} title="Playlists couldn't load" /></Card>
      ) : playlists.length === 0 ? (
        <Card><EmptyState icon={ListVideo} title="No playlists yet" description="Playlists you create here appear in this list. Playlists managed by YouTube itself (uploads, liked videos...) aren't shown." action={<Button variant="primary" icon={Plus} gate={can.canManagePlaylists} onClick={() => setCreateOpen(true)}>Create your first playlist</Button>} /></Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={Filter} title="No playlists match" description="Try a different search or visibility." action={<Button variant="secondary" icon={X} onClick={() => { setSearch(""); reset(["view", "sort"]); }}>Clear filters</Button>} /></Card>
      ) : values.view === "grid" ? (
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map((p) => (
            <div key={p.id} className={cn(yt.card, "group overflow-hidden transition hover:border-[#C9D1DC]")}>
              <Link href={ytRoutes.playlist(p.id)} className="relative block">
                <Collage thumbs={[p.thumbnailUrl]} />
                <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-sm bg-[#0F1B3D]/80 px-1.5 py-0.5 text-[11px] font-semibold text-white"><ListVideo className="size-3" />{p.itemCount ?? "—"}</span>
              </Link>
              <div className="flex items-start gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <Link href={ytRoutes.playlist(p.id)} className="line-clamp-1 text-[13px] font-semibold text-[#0F1B3D] hover:text-[#2563EB]">{p.title}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-[#6B7890]">
                    <VisibilityLabel visibility={p.visibility} className="text-[11.5px]" />
                    <span>·</span>
                    <span>{countLabel(p.itemCount)}</span>
                    {p.createdAt && (<><span>·</span><span>Created {relative(p.createdAt)}</span></>)}
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
                  <Collage thumbs={[p.thumbnailUrl]} />
                </button>
                <div className="min-w-0 flex-1">
                  <Link href={ytRoutes.playlist(p.id)} className="block truncate text-[13px] font-semibold text-[#0F1B3D] hover:text-[#2563EB]">{p.title}</Link>
                  <p className="truncate text-[12px] text-[#6B7890]">{p.description || "No description"}</p>
                </div>
                <VisibilityLabel visibility={p.visibility} className="hidden w-24 md:inline-flex" />
                <span className="hidden w-20 text-right text-[12.5px] tabular-nums text-[#24324F] sm:block">{countLabel(p.itemCount)}</span>
                <span className="hidden w-28 text-right text-[12px] text-[#6B7890] lg:block">{relative(p.createdAt)}</span>
                <ActionMenu label={`Actions for ${p.title}`} items={actions.items(p)} trigger={<button type="button" className={buttonClass("ghost", "icon")}><MoreHorizontal className="size-4" /></button>} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {playlistsState.hasMore && (
        <div className="flex justify-center py-1"><Button size="sm" variant="secondary" loading={playlistsState.isFetchingMore} onClick={playlistsState.loadMore}>Load more playlists</Button></div>
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
        affected={remove ? [remove.itemCount === null ? "Its videos are removed from this playlist" : `${remove.itemCount} videos will be removed from this playlist`, `Visibility: ${VISIBILITY_LABEL[remove.visibility]}`] : []}
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
  const error = !title.trim() ? "Title is required." : /[<>]/.test(title) ? "Titles can't contain < or >." : undefined;

  const save = async () => {
    if (error || busy) return false;
    setBusy(true);
    const ok = await updatePlaylist(playlist.id, {
      ...(title.trim() !== playlist.title ? { title: title.trim() } : {}),
      ...(description !== playlist.description ? { description } : {}),
      ...(visibility !== playlist.visibility ? { visibility } : {}),
    });
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
            <DialogTitle className="text-[15px] text-[#0F1B3D]">Edit Playlist</DialogTitle>
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
              <SelectMenu<Visibility> label="Visibility" size="md" fullWidth value={visibility} onChange={setVisibility} options={(["private", "unlisted", "public"] as Visibility[]).map((v) => ({ value: v, label: VISIBILITY_LABEL[v] }))} />
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
  const { videos, videosState, addToPlaylists, can } = useYouTube();
  const members = usePlaylistItemsInfinite(playlist.id);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const inPlaylist = useMemo(() => new Set((members.data?.pages.flatMap((p) => p.items.map((i) => i.videoId)) ?? []).filter(Boolean) as string[]), [members.data]);
  // Only public/unlisted/private videos that are actually published can be added; drafts and failed uploads cannot.
  const candidates = videos.filter((v) => v.status === "published" && !inPlaylist.has(v.id) && v.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[540px] gap-0 p-0">
        <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Add Videos</DialogTitle>
          <DialogDescription className="line-clamp-1 text-[12.5px] text-[#6B7890]">to {playlist.title}</DialogDescription>
        </DialogHeader>
        <div className="px-5 pt-3"><SearchField value={q} onChange={setQ} placeholder="Search your videos" autoFocus /></div>
        <ul className="max-h-[360px] overflow-y-auto px-3 py-2">
          {(videosState.isLoading || members.isPending) && <li className="space-y-2 py-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></li>}
          {!videosState.isLoading && !members.isPending && candidates.length === 0 && <li className="py-8 text-center text-[12.5px] text-[#6B7890]">{q ? `No videos match “${q}”.` : "Every loaded published video is already in this playlist."}</li>}
          {candidates.map((v) => (
            <li key={v.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-[#F8FAFC]">
                <Checkbox checked={selected.includes(v.id)} onCheckedChange={(c) => setSelected((prev) => (c ? [...prev, v.id] : prev.filter((x) => x !== v.id)))} aria-label={v.title} />
                <Thumb src={v.thumbnailUrl} durationSec={v.durationSec} className="w-[72px]" sizes="72px" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D]">{v.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5"><StatusBadge status={v.status} /></span>
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
              if (busy) return;
              setBusy(true);
              const ok = await addToPlaylists(selected, [playlist.id]);
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
  const id = params?.playlistId;
  const query = usePlaylistQuery(id, ready);
  const fromList = playlists.find((p) => p.id === id);
  const playlist = useMemo(() => (query.data ? toPlaylist(query.data.playlist) : fromList ?? null), [query.data, fromList]);

  if (!ready || (query.isPending && !playlist)) return <PageSkeleton variant="detail" />;
  if (!playlist) {
    const notFound = ApiError.isApiError(query.error) && (query.error.status === 404 || query.error.reason === "youtube_playlist_not_found" || query.error.reason === "youtube_playlist_not_owned");
    if (query.error && !notFound) return <Card><ErrorState error={describeYouTubeError(query.error)} onRetry={() => void query.refetch()} title="Playlist couldn't load" /></Card>;
    return <Card><EmptyState icon={ListVideo} title="Playlist not found" description="It may have been deleted on YouTube, or it isn't managed through OmniPlatform." action={<Button variant="primary" icon={ArrowLeft} href={ytRoutes.playlists}>Back to playlists</Button>} /></Card>;
  }
  return <PlaylistDetail playlist={playlist} />;
}

function PlaylistDetail({ playlist }: { playlist: Playlist }) {
  const { can, removePlaylistItem, movePlaylistItem } = useYouTube();
  const router = useRouter();
  const actions = usePlaylistActions();
  const itemsQuery = usePlaylistItemsInfinite(playlist.id);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = itemsQuery;
  const pageCount = itemsQuery.data?.pages.length ?? 0;
  // Reordering needs every item loaded, so the first pages load eagerly.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && pageCount > 0 && pageCount < MAX_AUTO_PAGES) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, pageCount, fetchNextPage]);

  const saved: PlaylistItem[] = useMemo(() => (itemsQuery.data?.pages.flatMap((p) => p.items.map(toPlaylistItem)).filter((i): i is PlaylistItem => i !== null) ?? []), [itemsQuery.data]);
  const savedKey = saved.map((i) => i.playlistItemId).join(",");
  // Remount when the saved order changes so the local drag order starts from it.
  return (
    <PlaylistDetailBody
      key={savedKey}
      playlist={playlist}
      saved={saved}
      loading={itemsQuery.isPending}
      error={itemsQuery.error}
      refetch={() => void itemsQuery.refetch()}
      allLoaded={!hasNextPage}
      canEditBase={can.canManagePlaylists.allowed && !playlist.system}
      actions={actions}
      onMove={movePlaylistItem}
      onRemove={removePlaylistItem}
      onDeleted={() => router.push(ytRoutes.playlists)}
    />
  );
}

function PlaylistDetailBody({
  playlist,
  saved,
  loading,
  error,
  refetch,
  allLoaded,
  canEditBase,
  actions,
  onMove,
  onRemove,
  onDeleted,
}: {
  playlist: Playlist;
  saved: PlaylistItem[];
  loading: boolean;
  error: unknown;
  refetch: () => void;
  allLoaded: boolean;
  canEditBase: boolean;
  actions: ReturnType<typeof usePlaylistActions>;
  onMove: (playlistId: string, playlistItemId: string, position: number) => Promise<boolean>;
  onRemove: (playlistId: string, playlistItemId: string) => Promise<boolean>;
  onDeleted: () => void;
}) {
  const { can } = useYouTube();
  const [order, setOrder] = useState(saved.map((i) => i.playlistItemId));
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeItem, setRemoveItem] = useState<PlaylistItem | null>(null);
  const { values } = useQueryState(useMemo(() => ({ reorder: "" }), []));

  const byItem = useMemo(() => new Map(saved.map((i) => [i.playlistItemId, i])), [saved]);
  const dirty = order.join() !== saved.map((i) => i.playlistItemId).join();
  const list = order.map((id) => byItem.get(id)).filter((i): i is PlaylistItem => Boolean(i));
  const unavailable = saved.filter((i) => !i.available).length;
  const canEdit = canEditBase && allLoaded;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  };

  /** Sends the smallest sequence of position moves that turns the saved order into the new one (one call each, in order). */
  const saveOrder = async () => {
    if (saving) return false;
    setSaving(true);
    const working = saved.map((i) => i.playlistItemId);
    let ok = true;
    for (let target = 0; target < order.length && ok; target += 1) {
      const wanted = order[target]!;
      if (working[target] === wanted) continue;
      ok = await onMove(playlist.id, wanted, target);
      if (ok) {
        working.splice(working.indexOf(wanted), 1);
        working.splice(target, 0, wanted);
      }
    }
    setSaving(false);
    return ok;
  };

  useUnsavedChanges(dirty, saveOrder, "the playlist order");

  return (
    <div className="space-y-1">
      <Link href={ytRoutes.playlists} className="inline-flex items-center gap-1 rounded text-[12.5px] font-medium text-[#6B7890] hover:text-[#0F1B3D]"><ArrowLeft className="size-3.5" /> Playlists</Link>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden lg:sticky lg:top-[76px]">
          <Collage thumbs={[playlist.thumbnailUrl, ...list.map((i) => i.thumbnailUrl)]} />
          <div className="space-y-3 p-4">
            <div>
              <h2 className="text-[16px] font-semibold leading-5 text-[#0F1B3D]">{playlist.title}</h2>
              <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-5 text-[#3C4A66]">{playlist.description || <span className="text-[#98A2B3]">No description</span>}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2">
              {[
                ["Visibility", <VisibilityLabel key="v" visibility={playlist.visibility} />],
                ["Videos", playlist.itemCount === null ? String(saved.length) : String(playlist.itemCount)],
                ["Created", date(playlist.createdAt)],
                ["Unavailable", String(unavailable)],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-sm bg-[#F8FAFC] px-2.5 py-2">
                  <dt className="text-[11px] text-[#6B7890]">{label}</dt>
                  <dd className="mt-0.5 text-[13px] font-semibold text-[#0F1B3D]">{value}</dd>
                </div>
              ))}
            </dl>
            {playlist.system && <Notice tone="neutral" title="Managed by YouTube">This list is read-only. It can only be changed in YouTube.</Notice>}
            <div className="flex gap-2">
              <Button size="sm" variant="primary" icon={ListPlus} gate={can.canManagePlaylists} disabled={playlist.system} disabledReason="Managed by YouTube" onClick={() => actions.setAdd(playlist)} className="flex-1">Add Videos</Button>
              <Button size="sm" variant="secondary" icon={Pencil} gate={can.canManagePlaylists} disabled={playlist.system} disabledReason="Managed by YouTube" onClick={() => actions.setEdit(playlist)}>Edit</Button>
              <ActionMenu
                label="More playlist actions"
                trigger={<button type="button" className={buttonClass("secondary", "icon")}><MoreHorizontal className="size-4" /></button>}
                items={[
                  { label: "Open on YouTube", icon: ExternalLink, href: ytRoutes.playlistOnYouTube(playlist.id), external: true, hidden: playlist.visibility === "private" },
                  { label: "Change visibility", icon: Globe2, onSelect: () => actions.setEdit(playlist), gate: can.canManagePlaylists, hidden: playlist.system },
                  "separator",
                  { label: "Delete playlist", icon: Trash2, danger: true, onSelect: () => actions.setRemove(playlist), gate: can.canDeletePlaylist, hidden: playlist.system },
                ]}
              />
            </div>
          </div>
        </Card>

        <Card className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF1F5] px-4 py-3">
            <div>
              <h3 className="text-[13.5px] font-semibold text-[#0F1B3D]">Videos</h3>
              <p className="text-[12px] text-[#6B7890]">{canEdit ? "Drag to reorder, or use the arrows. Save when you're done." : canEditBase && !allLoaded ? "Loading every item before reordering is possible…" : "Read-only — you can't manage this playlist."}</p>
            </div>
            {dirty && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" disabled={saving} onClick={() => setOrder(saved.map((i) => i.playlistItemId))}>Reset</Button>
                <Button size="sm" variant="primary" icon={Save} loading={saving} gate={can.canManagePlaylists} onClick={() => void saveOrder()}>Save order</Button>
              </div>
            )}
          </div>
          {values.reorder && !dirty && canEdit && <Notice tone="blue" className="m-3" title="Reorder mode">Drag videos by the handle or use the arrow buttons, then save.</Notice>}
          {loading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : error ? (
            <ErrorState error={describeYouTubeError(error)} onRetry={refetch} title="Playlist items couldn't load" />
          ) : list.length === 0 ? (
            <EmptyState icon={ListVideo} title="This playlist is empty" description="Add videos so viewers can watch them in sequence." action={<Button variant="primary" icon={ListPlus} gate={can.canManagePlaylists} disabled={playlist.system} onClick={() => actions.setAdd(playlist)}>Add Videos</Button>} />
          ) : (
            <ol className="divide-y divide-[#EEF1F5]">
              {list.map((item, i) => (
                <li
                  key={item.playlistItemId}
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
                  {item.available ? (
                    <Link href={ytRoutes.video(item.videoId)} className="shrink-0"><Thumb src={item.thumbnailUrl} className="w-[96px]" sizes="96px" /></Link>
                  ) : (
                    <Thumb src={null} className="w-[96px]" sizes="96px" />
                  )}
                  <div className="min-w-0 flex-1">
                    {item.available ? (
                      <Link href={ytRoutes.video(item.videoId)} className="line-clamp-1 text-[12.5px] font-semibold text-[#0F1B3D] hover:text-[#2563EB]">{item.title}</Link>
                    ) : (
                      <span className="line-clamp-1 text-[12.5px] font-semibold text-[#6B7890]">{item.title}</span>
                    )}
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#6B7890]">
                      {item.available ? item.privacy && <VisibilityLabel visibility={item.privacy} className="text-[11.5px]" /> : <Badge tone="amber">Private or deleted video</Badge>}
                      {item.addedAt && <span>Added {relative(item.addedAt)}</span>}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button size="iconSm" variant="ghost" aria-label={`Move ${item.title} up`} disabled={i === 0 || saving} onClick={() => move(i, i - 1)}><ArrowUp className="size-3.5" /></Button>
                      <Button size="iconSm" variant="ghost" aria-label={`Move ${item.title} down`} disabled={i === list.length - 1 || saving} onClick={() => move(i, i + 1)}><ArrowDown className="size-3.5" /></Button>
                      <Button size="iconSm" variant="ghost" aria-label={`Remove ${item.title} from playlist`} disabled={saving} onClick={() => setRemoveItem(item)} className="hover:text-[#C81E2B]"><X className="size-3.5" /></Button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <PlaylistDialogs {...actions} onDeleted={onDeleted} />
      <ConfirmDialog
        open={removeItem !== null}
        onOpenChange={(o) => !o && setRemoveItem(null)}
        title={`Remove “${removeItem?.title ?? ""}” from this playlist?`}
        description="The video itself isn't deleted — it's only removed from this playlist."
        confirmLabel="Remove from playlist"
        onConfirm={async () => {
          if (!removeItem) return false;
          return onRemove(playlist.id, removeItem.playlistItemId);
        }}
      />
    </div>
  );
}

