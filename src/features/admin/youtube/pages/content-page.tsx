"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Globe2,
  ImageIcon,
  LayoutGrid,
  ListPlus,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Rows3,
  Send,
  SendHorizonal,
  Trash2,
  Upload,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AddToPlaylistDialog,
  DeleteVideosDialog,
  EditMetadataSheet,
  ScheduleDialog,
  ThumbnailManager,
  VisibilityDialog,
  exportVideosCsv,
} from "../components/dialogs";
import { PageSkeleton } from "../components/states";
import {
  ActionMenu,
  ApprovalBadge,
  Button,
  Card,
  EmptyState,
  Hint,
  PageTitle,
  Pagination,
  SearchField,
  Segmented,
  SelectMenu,
  SortHeader,
  StatusBadge,
  Thumb,
  TypeBadge,
  UnderlineTabs,
  VisibilityLabel,
  buttonClass,
  tdClass,
  thClass,
  useDebounced,
  type MenuItem,
  type SortDir,
} from "../components/ui";
import { useQueryState } from "../hooks/use-query-state";
import { ytRoutes } from "../lib/constants";
import { compact, date, dateTime, hours, percent } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { Video } from "../types";

const PAGE_SIZE = 10;

const DEFAULTS = {
  q: "",
  type: "all",
  status: "all",
  visibility: "all",
  date: "all",
  playlist: "all",
  sort: "date",
  dir: "desc",
  view: "table",
  page: "1",
};

type SubTab = "all" | "videos" | "shorts" | "live" | "scheduled" | "drafts";
type SortKey = "date" | "title" | "views" | "watch" | "comments" | "likes" | "ctr";

function sortValue(v: Video, key: SortKey): number | string {
  switch (key) {
    case "title":
      return v.title.toLowerCase();
    case "views":
      return v.stats.views;
    case "watch":
      return v.stats.watchTimeHours;
    case "comments":
      return v.stats.comments;
    case "likes":
      return v.stats.likes;
    case "ctr":
      return v.stats.ctr ?? -1;
    default:
      return v.publishedAt ?? v.scheduledAt ?? v.updatedAt;
  }
}

export function ContentPage() {
  const { ready } = useYouTube();
  if (!ready) return <PageSkeleton variant="table" />;
  return <ContentManager />;
}

function ContentManager() {
  const store = useYouTube();
  const { videos, playlists, can, settings } = store;
  const router = useRouter();
  const { values, set, reset } = useQueryState(DEFAULTS);

  const [search, setSearch] = useState(values.q);
  const debounced = useDebounced(search, 300);
  useEffect(() => {
    if (debounced.value !== values.q) set({ q: debounced.value, page: "1" });
    // Only the debounced text should drive the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced.value]);

  const [rawSelected, setSelected] = useState<string[]>([]);
  const [editVideo, setEditVideo] = useState<string | null>(null);
  const [thumbVideo, setThumbVideo] = useState<string | null>(null);
  const [scheduleVideo, setScheduleVideo] = useState<string | null>(null);
  const [playlistFor, setPlaylistFor] = useState<string[] | null>(null);
  const [visibilityFor, setVisibilityFor] = useState<string[] | null>(null);
  const [deleteFor, setDeleteFor] = useState<string[] | null>(null);

  const subTab: SubTab =
    values.status === "scheduled" ? "scheduled" : values.status === "draft" ? "drafts" : values.type === "video" ? "videos" : values.type === "short" ? "shorts" : values.type === "live" ? "live" : "all";

  const filtered = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    const since = values.date === "all" ? null : subDays(new Date(), Number(values.date.replace("d", "")));
    const list = videos.filter((v) => {
      if (q && !v.title.toLowerCase().includes(q) && !v.tags.some((t) => t.toLowerCase().includes(q)) && v.id.toLowerCase() !== q) return false;
      if (values.type !== "all" && v.type !== values.type) return false;
      if (values.status !== "all" && v.status !== values.status) return false;
      if (values.visibility !== "all" && v.visibility !== values.visibility) return false;
      if (values.playlist !== "all" && !v.playlistIds.includes(values.playlist)) return false;
      if (since) {
        const when = v.publishedAt ?? v.scheduledAt ?? v.updatedAt;
        if (new Date(when) < since) return false;
      }
      return true;
    });
    const key = values.sort as SortKey;
    const dir = values.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [videos, values]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(values.page) || 1), pageCount);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Selection only ever refers to rows that are still in the filtered result.
  const selected = rawSelected.filter((id) => filtered.some((v) => v.id === id));

  const counts = useMemo(
    () => ({
      all: videos.length,
      videos: videos.filter((v) => v.type === "video").length,
      shorts: videos.filter((v) => v.type === "short").length,
      live: videos.filter((v) => v.type === "live").length,
      scheduled: videos.filter((v) => v.status === "scheduled").length,
      drafts: videos.filter((v) => v.status === "draft").length,
    }),
    [videos],
  );

  const activeFilters = ["q", "type", "status", "visibility", "date", "playlist"].filter((k) => values[k as keyof typeof values] !== DEFAULTS[k as keyof typeof DEFAULTS]).length;

  const setTab = (tab: SubTab) => {
    const patch: Partial<typeof DEFAULTS> = { page: "1", type: "all", status: "all" };
    if (tab === "videos") patch.type = "video";
    if (tab === "shorts") patch.type = "short";
    if (tab === "live") patch.type = "live";
    if (tab === "scheduled") patch.status = "scheduled";
    if (tab === "drafts") patch.status = "draft";
    set(patch);
  };

  const toggleSort = (key: SortKey) => {
    if (values.sort === key) set({ dir: values.dir === "asc" ? "desc" : "asc" });
    else set({ sort: key, dir: key === "title" ? "asc" : "desc" });
  };

  const byId = (id: string | null) => (id ? videos.find((v) => v.id === id) ?? null : null);
  const selectedVideos = videos.filter((v) => selected.includes(v.id));
  const allOnPage = visible.length > 0 && visible.every((v) => selected.includes(v.id));
  const someOnPage = visible.some((v) => selected.includes(v.id));

  const rowActions = (v: Video): (MenuItem | "separator")[] => {
    const needsApproval = settings.moderation.requireApproval && !can.canPublish.allowed;
    const unpublished = v.status === "draft" || v.status === "scheduled";
    return [
      { label: "View details", icon: Eye, href: ytRoutes.video(v.id) },
      { label: "Edit metadata", icon: Pencil, onSelect: () => setEditVideo(v.id), gate: can.canEditVideo },
      { label: "Change thumbnail", icon: ImageIcon, onSelect: () => setThumbVideo(v.id), gate: can.canEditVideo },
      "separator",
      { label: "View analytics", icon: BarChart3, href: `${ytRoutes.video(v.id)}?tab=analytics`, hidden: v.status !== "published", gate: can.canViewAnalytics },
      { label: "View comments", icon: MessageSquare, href: `${ytRoutes.comments}?video=${v.id}`, hidden: v.status !== "published" },
      { label: "Add to playlist", icon: ListPlus, onSelect: () => setPlaylistFor([v.id]), gate: can.canManagePlaylists },
      {
        label: v.scheduledAt && v.status === "scheduled" ? "Reschedule" : "Schedule",
        icon: CalendarClock,
        onSelect: () => setScheduleVideo(v.id),
        hidden: !(unpublished || v.status === "failed") || (needsApproval && v.approval !== "approved"),
        gate: can.canSchedule,
      },
      { label: "Submit for approval", icon: Send, onSelect: () => void store.submitForApproval(v.id), hidden: !(v.status === "draft" && needsApproval && (v.approval === "none" || v.approval === "changes_requested")) },
      { label: "Publish now", icon: SendHorizonal, onSelect: () => router.push(`${ytRoutes.video(v.id)}?tab=details&confirm=publish`), hidden: !unpublished || needsApproval, gate: can.canPublish },
      { label: "Open on YouTube", icon: ExternalLink, href: ytRoutes.watch(v.id), external: true, hidden: v.status !== "published" },
      "separator",
      { label: "Delete", icon: Trash2, danger: true, onSelect: () => setDeleteFor([v.id]), gate: can.canDeleteVideo },
    ];
  };

  return (
    <div className="space-y-1">
      <PageTitle
        title="Content"
        description="Every video, Short and live replay on your channel, plus drafts and scheduled uploads."
        actions={
          <Button variant="primary" icon={Upload} gate={can.canUpload} href={ytRoutes.upload}>
            Upload content
          </Button>
        }
      />

      <Card className="overflow-visible">
        <div className="border-b border-[#EEF1F5] px-3 pt-1">
          <UnderlineTabs<SubTab>
            label="Content type"
            value={subTab}
            onChange={setTab}
            items={[
              { value: "all", label: "All", count: counts.all },
              { value: "videos", label: "Videos", count: counts.videos },
              { value: "shorts", label: "Shorts", count: counts.shorts },
              { value: "live", label: "Live", count: counts.live },
              { value: "scheduled", label: "Scheduled", count: counts.scheduled },
              { value: "drafts", label: "Drafts", count: counts.drafts },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF1F5] px-3 py-2.5">
          <SearchField value={search} onChange={setSearch} loading={debounced.pending} placeholder="Search title, tag or video ID" className="w-full sm:w-[260px]" />
          <SelectMenu label="Type" prefix="Type:" value={values.type} onChange={(v) => set({ type: v, page: "1" })} options={[{ value: "all", label: "All" }, { value: "video", label: "Video" }, { value: "short", label: "Short" }, { value: "live", label: "Live" }]} />
          <SelectMenu label="Visibility" prefix="Visibility:" value={values.visibility} onChange={(v) => set({ visibility: v, page: "1" })} options={[{ value: "all", label: "All" }, { value: "public", label: "Public" }, { value: "unlisted", label: "Unlisted" }, { value: "private", label: "Private" }]} />
          <SelectMenu label="Status" prefix="Status:" value={values.status} onChange={(v) => set({ status: v, page: "1" })} options={[{ value: "all", label: "All" }, { value: "published", label: "Published" }, { value: "scheduled", label: "Scheduled" }, { value: "draft", label: "Draft" }, { value: "processing", label: "Processing" }, { value: "failed", label: "Failed" }]} />
          <SelectMenu label="Date" prefix="Date:" value={values.date} onChange={(v) => set({ date: v, page: "1" })} options={[{ value: "all", label: "Any time" }, { value: "7d", label: "Last 7 days" }, { value: "28d", label: "Last 28 days" }, { value: "90d", label: "Last 90 days" }, { value: "365d", label: "Last 365 days" }]} />
          <SelectMenu label="Playlist" prefix="Playlist:" value={values.playlist} onChange={(v) => set({ playlist: v, page: "1" })} className="max-w-[240px]" options={[{ value: "all", label: "All" }, ...playlists.map((p) => ({ value: p.id, label: p.title }))]} />
          <SelectMenu
            label="Sort"
            prefix="Sort:"
            value={`${values.sort}:${values.dir}`}
            onChange={(v) => {
              const [sort, dir] = v.split(":");
              set({ sort, dir });
            }}
            options={[
              { value: "date:desc", label: "Newest first" },
              { value: "date:asc", label: "Oldest first" },
              { value: "views:desc", label: "Most views" },
              { value: "watch:desc", label: "Most watch time" },
              { value: "ctr:desc", label: "Highest CTR" },
              { value: "ctr:asc", label: "Lowest CTR" },
              { value: "title:asc", label: "Title A–Z" },
            ]}
          />
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={Download} disabled={!filtered.length} onClick={() => exportVideosCsv(filtered, "youtube-content-filtered.csv")} className="max-sm:hidden">
              Export
            </Button>
            {activeFilters > 0 && (
              <Button size="sm" variant="ghost" icon={X} onClick={() => { setSearch(""); reset(["view"]); }}>
                Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
              </Button>
            )}
            <Segmented
              label="View"
              value={values.view}
              onChange={(v) => set({ view: v })}
              className="hidden md:inline-flex"
              items={[
                { value: "table", label: <span className="sr-only">Table</span>, icon: Rows3, title: "Table view" },
                { value: "grid", label: <span className="sr-only">Grid</span>, icon: LayoutGrid, title: "Grid view" },
              ]}
            />
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF1F5] bg-[#FFF8F8] px-3 py-2" role="region" aria-label="Bulk actions">
            <span className="text-[12.5px] font-semibold text-[#0F1B3D]">{selected.length} selected</span>
            <Button size="xs" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
            <span className="mx-1 h-4 w-px bg-[#F5C2C7]" />
            <Button size="sm" variant="secondary" icon={Globe2} gate={can.canEditVideo} onClick={() => setVisibilityFor(selected)}>Visibility</Button>
            <Button size="sm" variant="secondary" icon={ListPlus} gate={can.canManagePlaylists} onClick={() => setPlaylistFor(selected)}>Add to playlist</Button>
            <Button
              size="sm"
              variant="secondary"
              icon={CalendarClock}
              gate={can.canSchedule}
              disabled={!(selectedVideos.length === 1 && selectedVideos[0]!.status !== "published")}
              disabledReason="Select a single unpublished video to schedule"
              onClick={() => setScheduleVideo(selected[0] ?? null)}
            >
              Schedule
            </Button>
            <Button size="sm" variant="secondary" icon={Download} onClick={() => exportVideosCsv(selectedVideos)}>Export</Button>
            <Button size="sm" variant="danger" icon={Trash2} gate={can.canDeleteVideo} onClick={() => setDeleteFor(selected)}>Delete</Button>
          </div>
        )}

        {videos.length === 0 ? (
          <EmptyState icon={VideoIcon} title="No content yet" description="Upload your first video to start building your channel from OmniPlatform." action={<Button variant="primary" icon={Upload} gate={can.canUpload} href={ytRoutes.upload}>Upload your first video</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Filter} title="No content matches these filters" description="Try a different search term or clear the filters to see everything." action={<Button variant="secondary" icon={X} onClick={() => { setSearch(""); reset(["view"]); }}>Clear filters</Button>} />
        ) : values.view === "grid" ? (
          <>
            <div className="hidden grid-cols-2 gap-1 p-3 md:grid lg:grid-cols-3 2xl:grid-cols-5">
              {visible.map((v) => (
                <GridCard key={v.id} video={v} selected={selected.includes(v.id)} onSelect={(c) => setSelected((prev) => (c ? [...prev, v.id] : prev.filter((x) => x !== v.id)))} actions={rowActions(v)} />
              ))}
            </div>
            <MobileList videos={visible} selected={selected} setSelected={setSelected} rowActions={rowActions} />
          </>
        ) : (
          <>
            <div className="scrollbar-thin hidden max-h-[calc(100dvh-330px)] min-h-[320px] overflow-auto md:block">
              <table className="w-full min-w-[1060px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className={cn(thClass, "w-10 pl-3.5")}>
                      <Checkbox
                        aria-label="Select all on this page"
                        checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
                        onCheckedChange={(c) => setSelected((prev) => (c ? [...new Set([...prev, ...visible.map((v) => v.id)])] : prev.filter((id) => !visible.some((v) => v.id === id))))}
                      />
                    </th>
                    <SortHeader label="Content" active={values.sort === "title"} dir={values.dir as SortDir} onClick={() => toggleSort("title")} />
                    <th className={thClass}>Type</th>
                    <th className={thClass}>Visibility</th>
                    <th className={thClass}>Status</th>
                    <SortHeader label="Date" active={values.sort === "date"} dir={values.dir as SortDir} onClick={() => toggleSort("date")} />
                    <SortHeader label="Views" align="right" active={values.sort === "views"} dir={values.dir as SortDir} onClick={() => toggleSort("views")} />
                    <SortHeader label="Watch time" align="right" active={values.sort === "watch"} dir={values.dir as SortDir} onClick={() => toggleSort("watch")} />
                    <SortHeader label="Comments" align="right" active={values.sort === "comments"} dir={values.dir as SortDir} onClick={() => toggleSort("comments")} />
                    <SortHeader label="Likes" align="right" active={values.sort === "likes"} dir={values.dir as SortDir} onClick={() => toggleSort("likes")} />
                    <SortHeader label="CTR" align="right" active={values.sort === "ctr"} dir={values.dir as SortDir} onClick={() => toggleSort("ctr")} />
                    <th className={cn(thClass, "pr-3.5 text-right")}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((v) => {
                    const isSelected = selected.includes(v.id);
                    const published = v.status === "published";
                    return (
                      <tr key={v.id} className={cn("group", isSelected ? "bg-[#FFF8F8]" : "hover:bg-[#F8FAFC]")}>
                        <td className={cn(tdClass, "pl-3.5")}>
                          <Checkbox aria-label={`Select ${v.title}`} checked={isSelected} onCheckedChange={(c) => setSelected((prev) => (c ? [...prev, v.id] : prev.filter((x) => x !== v.id)))} />
                        </td>
                        <td className={cn(tdClass, "max-w-[320px] py-2")}>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => can.canEditVideo.allowed && setThumbVideo(v.id)} aria-label={`Change thumbnail for ${v.title}`} className="group/thumb relative shrink-0 rounded-md" disabled={!can.canEditVideo.allowed}>
                              <Thumb src={v.thumbnailUrl} durationSec={v.durationSec} className="w-[80px]" sizes="80px" />
                              {can.canEditVideo.allowed && (
                                <span className="absolute inset-0 grid place-items-center rounded-md bg-[#0F1B3D]/55 text-white opacity-0 transition group-hover/thumb:opacity-100 group-focus-visible/thumb:opacity-100">
                                  <ImageIcon className="size-4" />
                                </span>
                              )}
                            </button>
                            <div className="min-w-0">
                              <Link href={ytRoutes.video(v.id)} className="line-clamp-2 whitespace-normal text-[12.5px] font-semibold leading-4 text-[#0F1B3D] hover:text-[#2563EB]">
                                {v.title}
                              </Link>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <ApprovalBadge state={v.approval} />
                                {v.status === "failed" ? (
                                  <Hint text={v.failureReason ?? "Processing failed"}>
                                    <span className="cursor-help truncate text-[11.5px] font-medium text-[#C81E2B]">Processing failed — re-upload required</span>
                                  </Hint>
                                ) : v.approval === "none" ? (
                                  <span className="truncate text-[11.5px] text-[#98A2B3]">{v.description.split("\n")[0]}</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={tdClass}><TypeBadge type={v.type} /></td>
                        <td className={tdClass}><VisibilityLabel visibility={v.visibility} /></td>
                        <td className={tdClass}><StatusBadge status={v.status} /></td>
                        <td className={cn(tdClass, "text-[12px]")}>
                          <span className="block text-[#24324F]">{v.status === "scheduled" ? dateTime(v.scheduledAt) : date(v.publishedAt ?? v.updatedAt)}</span>
                          <span className="text-[11px] text-[#98A2B3]">{v.status === "scheduled" ? "Scheduled" : published ? "Published" : "Last edited"}</span>
                        </td>
                        <td className={cn(tdClass, "text-right font-semibold tabular-nums text-[#0F1B3D]")}>{published ? compact(v.stats.views) : "—"}</td>
                        <td className={cn(tdClass, "text-right tabular-nums")}>{published ? hours(v.stats.watchTimeHours) : "—"}</td>
                        <td className={cn(tdClass, "text-right tabular-nums")}>
                          {published ? <Link href={`${ytRoutes.comments}?video=${v.id}`} className="hover:text-[#2563EB] hover:underline">{compact(v.stats.comments)}</Link> : "—"}
                        </td>
                        <td className={cn(tdClass, "text-right tabular-nums")}>{published ? compact(v.stats.likes) : "—"}</td>
                        <td className={cn(tdClass, "text-right tabular-nums")}>{percent(v.stats.ctr)}</td>
                        <td className={cn(tdClass, "pr-3.5 text-right")}>
                          <ActionMenu label={`Actions for ${v.title}`} items={rowActions(v)} trigger={<button type="button" className={buttonClass("ghost", "icon")}><MoreHorizontal className="size-4" /></button>} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <MobileList videos={visible} selected={selected} setSelected={setSelected} rowActions={rowActions} />
          </>
        )}

        {filtered.length > 0 && (
          <div className="border-t border-[#EEF1F5]">
            <Pagination page={page} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} noun="items" onPage={(p) => set({ page: String(p) })} />
          </div>
        )}
      </Card>

      <EditMetadataSheet open={editVideo !== null} onOpenChange={(o) => !o && setEditVideo(null)} video={byId(editVideo)} />
      <ThumbnailManager open={thumbVideo !== null} onOpenChange={(o) => !o && setThumbVideo(null)} video={byId(thumbVideo)} />
      <ScheduleDialog open={scheduleVideo !== null} onOpenChange={(o) => !o && setScheduleVideo(null)} video={byId(scheduleVideo)} />
      <AddToPlaylistDialog open={playlistFor !== null} onOpenChange={(o) => !o && setPlaylistFor(null)} videoIds={playlistFor ?? []} />
      <VisibilityDialog open={visibilityFor !== null} onOpenChange={(o) => !o && setVisibilityFor(null)} videoIds={visibilityFor ?? []} />
      <DeleteVideosDialog
        open={deleteFor !== null}
        onOpenChange={(o) => !o && setDeleteFor(null)}
        videos={videos.filter((v) => deleteFor?.includes(v.id))}
        onDeleted={() => setSelected([])}
      />
    </div>
  );
}

function GridCard({ video: v, selected, onSelect, actions }: { video: Video; selected: boolean; onSelect: (checked: boolean) => void; actions: (MenuItem | "separator")[] }) {
  return (
    <div className={cn("group relative overflow-hidden rounded-[10px] border bg-white transition", selected ? "border-[#E5202E] ring-[3px] ring-[#E5202E]/10" : "border-[#E4E9F0] hover:border-[#C9D1DC]")}>
      <Link href={ytRoutes.video(v.id)} className="block">
        <Thumb src={v.thumbnailUrl} durationSec={v.durationSec} className="rounded-none" sizes="(min-width: 1536px) 280px, 33vw" />
      </Link>
      <span className="absolute left-2 top-2 rounded bg-white/90 p-0.5 shadow-sm">
        <Checkbox aria-label={`Select ${v.title}`} checked={selected} onCheckedChange={(c) => onSelect(Boolean(c))} />
      </span>
      <span className="absolute right-2 top-2 flex gap-1"><StatusBadge status={v.status} /></span>
      <div className="p-3">
        <div className="flex items-start gap-2">
          <Link href={ytRoutes.video(v.id)} className="line-clamp-2 min-h-8 flex-1 text-[12.5px] font-semibold leading-4 text-[#0F1B3D] hover:text-[#2563EB]">{v.title}</Link>
          <ActionMenu label={`Actions for ${v.title}`} items={actions} trigger={<button type="button" className={buttonClass("ghost", "iconSm", "-mr-1 -mt-1")}><MoreHorizontal className="size-4" /></button>} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <TypeBadge type={v.type} />
          <VisibilityLabel visibility={v.visibility} className="text-[11.5px]" />
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1 border-t border-[#EEF1F5] pt-2 text-center">
          {[
            ["Views", v.status === "published" ? compact(v.stats.views) : "—"],
            ["Likes", v.status === "published" ? compact(v.stats.likes) : "—"],
            ["CTR", percent(v.stats.ctr)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10.5px] text-[#98A2B3]">{label}</p>
              <p className="text-[12.5px] font-semibold tabular-nums text-[#0F1B3D]">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileList({ videos, selected, setSelected, rowActions }: { videos: Video[]; selected: string[]; setSelected: React.Dispatch<React.SetStateAction<string[]>>; rowActions: (v: Video) => (MenuItem | "separator")[] }) {
  return (
    <ul className="divide-y divide-[#EEF1F5] md:hidden">
      {videos.map((v) => (
        <li key={v.id} className={cn("flex gap-3 px-3 py-3", selected.includes(v.id) && "bg-[#FFF8F8]")}>
          <Checkbox className="mt-1" aria-label={`Select ${v.title}`} checked={selected.includes(v.id)} onCheckedChange={(c) => setSelected((prev) => (c ? [...prev, v.id] : prev.filter((x) => x !== v.id)))} />
          <Link href={ytRoutes.video(v.id)} className="shrink-0">
            <Thumb src={v.thumbnailUrl} durationSec={v.durationSec} className="w-[104px]" sizes="104px" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1">
              <Link href={ytRoutes.video(v.id)} className="line-clamp-2 flex-1 text-[12.5px] font-semibold leading-4 text-[#0F1B3D]">{v.title}</Link>
              <ActionMenu label={`Actions for ${v.title}`} items={rowActions(v)} trigger={<button type="button" className={buttonClass("ghost", "iconSm", "-mt-1")}><MoreHorizontal className="size-4" /></button>} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={v.status} />
              <TypeBadge type={v.type} />
              <ApprovalBadge state={v.approval} />
            </div>
            <p className="mt-1.5 text-[11.5px] text-[#6B7890]">
              {v.status === "published" ? (
                <>
                  <b className="font-semibold text-[#24324F]">{compact(v.stats.views)}</b> views · {percent(v.stats.ctr)} CTR · {date(v.publishedAt)}
                </>
              ) : v.status === "scheduled" ? (
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3" />{dateTime(v.scheduledAt)}</span>
              ) : (
                <>Edited {date(v.updatedAt)}</>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

