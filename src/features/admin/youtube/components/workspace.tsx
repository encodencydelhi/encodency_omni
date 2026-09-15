"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FaYoutube } from "react-icons/fa6";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Film,
  ListPlus,
  Loader2,
  MessageSquare,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  Upload,
  Video as VideoIcon,
  WifiOff,
  XCircle,
  Clock3,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";
import { usePeriod, useQueryState } from "../hooks/use-query-state";
import { useHydrated, useNow } from "../hooks/use-now";
import { UnsavedChangesDialog } from "../hooks/use-unsaved-changes";
import { PERIODS, TYPE_LABEL, ytRoutes } from "../lib/constants";
import { relative } from "../lib/format";
import { useYouTube } from "../store/youtube-store";
import type { Period } from "../types";
import { CreatePlaylistDialog } from "./dialogs";
import { ActionMenu, Badge, Button, EmptyState, SelectMenu, Skeleton, Thumb, buttonClass, useDebounced, yt } from "./ui";

const TABS = [
  { label: "Overview", href: ytRoutes.overview, exact: true },
  { label: "Content", href: ytRoutes.content },
  { label: "Analytics", href: ytRoutes.analytics },
  { label: "Audience", href: ytRoutes.audience },
  { label: "Comments", href: ytRoutes.comments },
  { label: "Playlists", href: ytRoutes.playlists },
  { label: "Live", href: ytRoutes.live },
  { label: "Monetization", href: ytRoutes.monetization },
  { label: "Settings", href: ytRoutes.settings },
] as const;

/** Tabs whose data is time-bound show the shared date range control. */
const PERIOD_TABS = new Set(["Overview", "Analytics", "Audience", "Monetization"]);
const PERIOD_KEEP = ["Overview", "Analytics", "Audience", "Monetization"];

function currentTab(pathname: string) {
  return TABS.find((t) => ("exact" in t && t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`))) ?? TABS[0];
}

export function YouTubeWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ytRoutes.overview;
  const tab = currentTab(pathname);
  const { connection, simulation } = useYouTube();
  const isSettings = tab.label === "Settings";

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100dvh-60px)] bg-[#F6F8FB] px-4 py-4 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-3">
        <WorkspaceHeader tabLabel={tab.label} />
        <ConnectionBanner />
        <WorkspaceTabs activeLabel={tab.label} />
        <main className="min-w-0">
          {simulation.loadError && !isSettings ? <LoadErrorState /> : connection.state === "disconnected" && !isSettings ? <DisconnectedState /> : children}
        </main>
      </div>
      <UnsavedChangesDialog />
      <style>{`@media print { aside, header.sticky, footer, [data-yt-no-print] { display: none !important; } [class*="lg:pl-"] { padding-left: 0 !important; } }`}</style>
    </div>
  );
}

function LoadErrorState() {
  const { simulate } = useYouTube();
  return (
    <div className={cn(yt.card)}>
      <EmptyState
        icon={AlertTriangle}
        title="We couldn't load your YouTube data"
        description="OmniPlatform couldn't reach its YouTube data service. Your channel isn't affected. Try again in a moment."
        action={
          <Button
            variant="primary"
            icon={RefreshCw}
            onClick={() => {
              simulate.setLoadError(false);
              simulate.setLoading(true);
              setTimeout(() => simulate.setLoading(false), 900);
            }}
          >
            Try again
          </Button>
        }
        secondary={<Button variant="secondary" href={ytRoutes.settings}>Check connection</Button>}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function WorkspaceHeader({ tabLabel }: { tabLabel: string }) {
  const { channel, can } = useYouTube();
  const router = useRouter();
  const [playlistOpen, setPlaylistOpen] = useState(false);

  return (
    <header className="flex flex-col gap-2.5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] text-[#6B7890]">
        <span>Channels</span>
        <ChevronRight className="size-3.5 text-[#C9D1DC]" />
        <Link href={ytRoutes.overview} className="rounded hover:text-[#0F1B3D]">YouTube</Link>
        <ChevronRight className="size-3.5 text-[#C9D1DC]" />
        <span aria-current="page" className="font-semibold text-[#0F1B3D]">{tabLabel}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-white shadow-[0_1px_2px_rgba(15,27,61,0.06)] ring-1 ring-[#E4E9F0]">
            <FaYoutube className="size-6 text-[#FF0033]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold leading-6 tracking-[-0.015em] text-[#0F1B3D]">YouTube</h1>
            <p className="truncate text-[12.5px] text-[#6B7890]">Manage your channel, content, audience and growth.</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
          <GlobalSearch />
          {PERIOD_TABS.has(tabLabel) && <DateRangeSelect />}
          <NotificationsButton />
          <Button variant="secondary" size="sm" icon={ExternalLink} href={ytRoutes.channelOnYouTube(channel.handle)} external className="h-9 max-xl:hidden">
            View on YouTube
          </Button>
          <ActionMenu
            label="Create content"
            width={220}
            trigger={
              <button type="button" className={buttonClass("primary", "md", "h-9")}>
                <Plus className="size-4" />
                Create
                <ChevronDown className="size-3.5 opacity-80" />
              </button>
            }
            items={[
              { label: "Upload video", icon: Upload, onSelect: () => router.push(ytRoutes.upload), gate: can.canUpload },
              { label: "Create Short", icon: Smartphone, onSelect: () => router.push(`${ytRoutes.upload}?type=short`), gate: can.canUpload },
              { label: "Schedule video", icon: CalendarDays, onSelect: () => router.push(`${ytRoutes.upload}?publish=schedule`), gate: can.canSchedule.allowed ? can.canUpload : can.canSchedule },
              "separator",
              { label: "Create live event", icon: Radio, onSelect: () => router.push(ytRoutes.liveCreate), gate: can.canGoLive },
              { label: "Create playlist", icon: ListPlus, onSelect: () => setPlaylistOpen(true), gate: can.canManagePlaylists },
            ]}
          />
        </div>
      </div>
      <CreatePlaylistDialog open={playlistOpen} onOpenChange={setPlaylistOpen} onCreated={(p) => router.push(ytRoutes.playlist(p.id))} />
    </header>
  );
}

function DateRangeSelect() {
  const { period } = usePeriod();
  const { set } = useQueryState(useMemo(() => ({ period: "28d" }), []));
  return (
    <SelectMenu<Period>
      label="Date range"
      icon={CalendarDays}
      size="md"
      align="end"
      value={period}
      onChange={(v) => set({ period: v })}
      options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
      className="h-9"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Global search                                                       */
/* ------------------------------------------------------------------ */

type Hit = { type: "Video" | "Short" | "Live" | "Playlist" | "Comment" | "Live event"; title: string; context: string; href: string; thumb?: string };

function GlobalSearch() {
  const { videos, playlists, comments, liveEvents } = useYouTube();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { value: q, pending } = useDebounced(query.trim().toLowerCase(), 220);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo<Hit[]>(() => {
    if (q.length < 2) return [];
    const out: Hit[] = [];
    videos.forEach((v) => {
      if (v.title.toLowerCase().includes(q) || v.tags.some((t) => t.includes(q)))
        out.push({ type: TYPE_LABEL[v.type] as Hit["type"], title: v.title, context: v.status === "published" ? "Published" : v.status[0]!.toUpperCase() + v.status.slice(1), href: ytRoutes.video(v.id), thumb: v.thumbnailUrl });
    });
    playlists.forEach((p) => {
      if (p.title.toLowerCase().includes(q)) out.push({ type: "Playlist", title: p.title, context: `${p.videoIds.length} videos`, href: ytRoutes.playlist(p.id) });
    });
    comments.forEach((c) => {
      if (c.text.toLowerCase().includes(q) || c.author.toLowerCase().includes(q))
        out.push({ type: "Comment", title: `“${c.text}”`, context: c.author, href: `${ytRoutes.comments}?thread=${c.id}` });
    });
    liveEvents.forEach((e) => {
      if (e.title.toLowerCase().includes(q)) out.push({ type: "Live event", title: e.title, context: e.lifecycle === "live" ? "Live now" : e.lifecycle === "upcoming" ? "Upcoming" : "Completed", href: `${ytRoutes.live}?tab=${e.lifecycle}` });
    });
    return out.slice(0, 9);
  }, [q, videos, playlists, comments, liveEvents]);


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (hit: Hit) => {
    setOpen(false);
    router.push(hit.href);
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <div className="relative w-full min-w-[200px] sm:w-[260px] lg:w-[300px]">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#98A2B3]" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="yt-search-results"
        aria-label="Search videos, Shorts, playlists and comments"
        placeholder="Search videos, playlists, comments…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && hits[active]) {
            go(hits[active]!);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={cn(yt.input, "pl-8 pr-14 [&::-webkit-search-cancel-button]:hidden")}
      />
      <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {pending && query.trim().length >= 2 ? (
          <Loader2 className="size-3.5 animate-spin text-[#98A2B3]" />
        ) : query ? (
          <button type="button" aria-label="Clear search" onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery("")} className="grid size-5 place-items-center rounded text-[#98A2B3] hover:bg-[#F1F4F8] hover:text-[#3C4A66]">
            <XCircle className="size-3.5" />
          </button>
        ) : (
          <kbd className="hidden rounded border border-[#E4E9F0] bg-[#F8FAFC] px-1.5 text-[10px] font-medium text-[#98A2B3] sm:block">/</kbd>
        )}
      </span>
      {showPanel && (
        <div id="yt-search-results" role="listbox" className="absolute right-0 top-11 z-40 w-full min-w-[320px] overflow-hidden rounded-[10px] border border-[#E4E9F0] bg-white py-1 shadow-[0_16px_40px_-12px_rgba(15,27,61,0.25)]">
          {pending ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-14" />
                  <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2.5 w-1/3" /></div>
                </div>
              ))}
            </div>
          ) : hits.length === 0 ? (
            <p className="px-3.5 py-4 text-center text-[12.5px] text-[#6B7890]">No videos, playlists or comments match “{query.trim()}”.</p>
          ) : (
            hits.map((hit, i) => (
              <button
                key={`${hit.type}-${hit.href}-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(hit)}
                className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-left", i === active && "bg-[#F3F5F9]")}
              >
                {hit.thumb ? (
                  <Thumb src={hit.thumb} className="w-14" sizes="56px" />
                ) : (
                  <span className="grid h-8 w-14 shrink-0 place-items-center rounded-sm bg-[#F1F4F8] text-[#6B7890]">
                    {hit.type === "Playlist" ? <ListPlus className="size-4" /> : hit.type === "Comment" ? <MessageSquare className="size-4" /> : <Radio className="size-4" />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-[#0F1B3D]">{hit.title}</span>
                  <span className="block truncate text-[11.5px] text-[#6B7890]">{hit.context}</span>
                </span>
                <span className="shrink-0 rounded bg-[#F1F4F8] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#475467]">{hit.type}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

const NOTIFICATION_ICON = {
  upload_completed: { icon: CheckCircle2, tone: "text-[#067647] bg-[#ECFAF3]" },
  video_published: { icon: CheckCircle2, tone: "text-[#067647] bg-[#ECFAF3]" },
  upload_failed: { icon: XCircle, tone: "text-[#C81E2B] bg-[#FEF1F2]" },
  schedule_failed: { icon: XCircle, tone: "text-[#C81E2B] bg-[#FEF1F2]" },
  live_failed: { icon: XCircle, tone: "text-[#C81E2B] bg-[#FEF1F2]" },
  priority_comment: { icon: MessageSquare, tone: "text-[#1D4ED8] bg-[#EFF4FF]" },
  live_starting: { icon: Radio, tone: "text-[#C81E2B] bg-[#FEF1F2]" },
  token_expired: { icon: ShieldAlert, tone: "text-[#B54708] bg-[#FFF7E8]" },
  permission_removed: { icon: ShieldAlert, tone: "text-[#B54708] bg-[#FFF7E8]" },
  sync_failed: { icon: AlertTriangle, tone: "text-[#B54708] bg-[#FFF7E8]" },
  quota_warning: { icon: AlertTriangle, tone: "text-[#B54708] bg-[#FFF7E8]" },
  monetization_changed: { icon: Film, tone: "text-[#6D28D9] bg-[#F4F0FF]" },
  approval_requested: { icon: Clock3, tone: "text-[#6D28D9] bg-[#F4F0FF]" },
} as const;

function NotificationsButton() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useYouTube();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`YouTube notifications${unread ? `, ${unread} unread` : ""}`} className={cn(buttonClass("secondary", "icon", "relative size-9"))}>
          <Bell className="size-4" />
          {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-sm bg-[#E5202E] px-1 text-[10px] font-bold text-white ring-2 ring-[#F6F8FB]">{unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[10px] border-[#E4E9F0] p-0">
        <div className="flex items-center justify-between border-b border-[#EEF1F5] px-3.5 py-2.5">
          <p className="text-[13px] font-semibold text-[#0F1B3D]">YouTube notifications</p>
          <Button variant="link" size="xs" onClick={markAllNotificationsRead} disabled={!unread}>Mark all as read</Button>
        </div>
        <ul className="max-h-[380px] overflow-y-auto">
          {notifications.length === 0 && <li className="px-4 py-8 text-center text-[12.5px] text-[#6B7890]">You&apos;re all caught up.</li>}
          {notifications.map((n) => {
            const meta = NOTIFICATION_ICON[n.kind];
            const Icon = meta.icon;
            return (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => {
                    markNotificationRead(n.id);
                    setOpen(false);
                  }}
                  className={cn("flex gap-2.5 border-b border-[#F3F5F9] px-3.5 py-2.5 hover:bg-[#F8FAFC]", !n.read && "bg-[#FFFBFB]")}
                >
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-sm", meta.tone)}><Icon className="size-3.5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12.5px] font-semibold text-[#0F1B3D]">{n.title}</span>
                      {!n.read && <span className="size-2 shrink-0 rounded-sm bg-[#E5202E]" aria-label="Unread" />}
                    </span>
                    <span className="line-clamp-2 text-[12px] leading-4 text-[#3C4A66]">{n.body}</span>
                    <span className="mt-0.5 block text-[11px] text-[#98A2B3]">{relative(n.at)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Connection & sync                                                   */
/* ------------------------------------------------------------------ */

export function SyncStatus({ compact }: { compact?: boolean }) {
  const { connection, syncNow, channel } = useYouTube();
  // Relative times depend on the viewer's clock, so they render after hydration to keep SSR output stable.
  const hydrated = useHydrated();
  useNow();

  const state = connection.state;
  const pill =
    state === "syncing" ? (
      <Badge tone="blue" icon={Loader2} className="[&_svg]:animate-spin">Syncing</Badge>
    ) : state === "sync_failed" ? (
      <Badge tone="amber" icon={AlertTriangle}>Sync failed</Badge>
    ) : state === "token_expired" ? (
      <Badge tone="red" icon={ShieldAlert}>Connection expired</Badge>
    ) : state === "quota_exceeded" ? (
      <Badge tone="amber" icon={AlertTriangle}>Quota reached</Badge>
    ) : state === "disconnected" ? (
      <Badge tone="neutral" icon={WifiOff}>Disconnected</Badge>
    ) : (
      <Badge tone="green" icon={CheckCircle2}>Connected</Badge>
    );

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      {!compact && <span className="text-[12.5px] font-semibold text-[#0F1B3D]">{channel.title}</span>}
      {pill}
      {state !== "disconnected" && (
        <span className="text-[12px] text-[#6B7890]">
          Last synced <time dateTime={hydrated ? connection.lastSyncedAt : undefined}>{hydrated ? relative(connection.lastSyncedAt) : "…"}</time>
        </span>
      )}
      {state !== "disconnected" && state !== "token_expired" && (
        <Button size="xs" variant="ghost" icon={RefreshCw} loading={state === "syncing"} onClick={() => void syncNow()} className="text-[#2563EB] hover:text-[#1D4ED8]">
          {state === "syncing" ? "Syncing…" : "Sync now"}
        </Button>
      )}
    </div>
  );
}

function ConnectionBanner() {
  const { connection, reconnect, syncNow, scopes, can } = useYouTube();
  const [busy, setBusy] = useState(false);
  const missingScopes = scopes.length < 6;

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  const reconnectBtn = (
    <Button size="sm" variant="primary" loading={busy} gate={can.canManageConnection} onClick={() => run(reconnect)}>
      Reconnect channel
    </Button>
  );

  let banner: ReactNode = null;
  if (connection.state === "token_expired") {
    banner = (
      <Strip tone="red" icon={ShieldAlert} title="YouTube connection expired" body="Showing data from the last successful sync. Publishing, replies and edits are paused until you reconnect.">
        {reconnectBtn}
      </Strip>
    );
  } else if (connection.state === "quota_exceeded") {
    banner = (
      <Strip tone="amber" icon={AlertTriangle} title="Daily YouTube API quota reached" body="Viewing cached data works normally. Uploads, edits and replies resume after the quota resets at midnight Pacific Time.">
        <Button size="sm" variant="secondary" href={`${ytRoutes.settings}#sync`}>View quota usage</Button>
      </Strip>
    );
  } else if (connection.state === "sync_failed") {
    banner = (
      <Strip tone="amber" icon={AlertTriangle} title="Last sync didn't complete" body={`Data may be out of date — last successful sync was ${relative(connection.lastSyncedAt)}.`}>
        <Button size="sm" variant="secondary" icon={RefreshCw} loading={busy} onClick={() => run(syncNow)}>Try again</Button>
      </Strip>
    );
  } else if (connection.state === "connected" && connection.quotaUsed / connection.quotaLimit >= 0.8) {
    banner = (
      <Strip tone="amber" icon={AlertTriangle} title={`API quota at ${Math.round((connection.quotaUsed / connection.quotaLimit) * 100)}%`} body="Uploads and bulk edits use the most quota. If the limit is reached, changes pause until midnight Pacific Time.">
        <Button size="sm" variant="secondary" href={`${ytRoutes.settings}#sync`}>View quota usage</Button>
      </Strip>
    );
  } else if (missingScopes && connection.state === "connected") {
    banner = (
      <Strip tone="amber" icon={ShieldAlert} title="Some YouTube permissions are missing" body="A few actions are unavailable until you grant the missing permissions.">
        <Button size="sm" variant="secondary" href={`${ytRoutes.settings}#permissions`}>Review permissions</Button>
        {reconnectBtn}
      </Strip>
    );
  }

  return (
    <>
      {banner}
    </>
  );
}

function Strip({ tone, icon: Icon, title, body, children }: { tone: "red" | "amber"; icon: typeof ShieldAlert; title: string; body: string; children: ReactNode }) {
  return (
    <div role={tone === "red" ? "alert" : "status"} className={cn("flex flex-wrap items-center gap-3 rounded-[10px] border px-3.5 py-2.5", tone === "red" ? "border-[#FBD5D9] bg-[#FEF6F7]" : "border-[#FBE3B6] bg-[#FFFAF0]")}>
      <Icon className={cn("size-4 shrink-0", tone === "red" ? "text-[#C81E2B]" : "text-[#B54708]")} />
      <p className="min-w-[220px] flex-1 text-[12.5px] leading-5 text-[#3C4A66]">
        <b className="font-semibold text-[#0F1B3D]">{title}.</b> {body}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function DisconnectedState() {
  const { reconnect, can } = useYouTube();
  const [busy, setBusy] = useState(false);
  return (
    <div className={cn(yt.card)}>
      <EmptyState
        icon={VideoIcon}
        title="Connect your YouTube channel"
        description="Connect a channel to manage videos, Shorts, playlists, comments, live streams and analytics from OmniPlatform. You'll be asked to sign in with Google and choose the permissions to grant."
        action={
          <Button variant="primary" icon={FaYoutubeIcon} loading={busy} gate={can.canManageConnection} onClick={async () => { setBusy(true); await reconnect(); setBusy(false); }}>
            Connect YouTube channel
          </Button>
        }
        secondary={<Button variant="secondary" href={ytRoutes.settings}>Open settings</Button>}
      />
    </div>
  );
}

function FaYoutubeIcon({ className }: { className?: string }) {
  return <FaYoutube className={className} />;
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function WorkspaceTabs({ activeLabel }: { activeLabel: string }) {
  const { comments, liveEvents, videos } = useYouTube();
  const { period } = usePeriod();
  const needsAttention = comments.filter((c) => c.moderationStatus === "heldForReview" || (c.moderationStatus === "published" && c.replies.length === 0 && c.priority)).length;
  const liveNow = liveEvents.some((e) => e.lifecycle === "live");
  const failed = videos.filter((v) => v.status === "failed").length;

  return (
    <div className="flex items-end justify-between gap-3 border-b border-[#E4E9F0]">
      <nav aria-label="YouTube sections" className="scrollbar-thin -mb-px flex min-w-0 gap-0.5 overflow-x-auto">
        {TABS.map((t) => {
          const active = t.label === activeLabel;
          const href = period !== "28d" && PERIOD_KEEP.includes(t.label) ? `${t.href}?period=${period}` : t.href;
          return (
            <Link
              key={t.href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1.5 text-[13px] font-semibold transition-colors",
                active ? "border-[#E5202E] text-[#0F1B3D]" : "border-transparent text-[#6B7890] hover:border-[#D0D7E2] hover:text-[#0F1B3D]",
                yt.focus,
              )}
            >
              {t.label}
              {t.label === "Comments" && needsAttention > 0 && <span className="rounded-sm bg-[#FEF1F2] px-1.5 text-[10.5px] font-bold leading-4 text-[#C81E2B]">{needsAttention}</span>}
              {t.label === "Content" && failed > 0 && <span className="rounded-sm bg-[#FEF1F2] px-1.5 text-[10.5px] font-bold leading-4 text-[#C81E2B]" title={`${failed} failed`}>{failed}</span>}
              {t.label === "Live" && liveNow && (
                <span className="flex items-center gap-1 rounded-sm bg-[#E5202E] px-1.5 text-[10px] font-bold uppercase leading-4 text-white">
                  <span className="size-1.5 animate-pulse rounded-sm bg-white" />Live
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mb-2 hidden shrink-0 min-[1680px]:block">
        <SyncStatus compact />
      </div>
    </div>
  );
}
