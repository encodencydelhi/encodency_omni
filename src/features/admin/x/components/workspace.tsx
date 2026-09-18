"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  Gauge,
  Loader2,
  ListChecks,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  Sparkles,
  Timer,
  WifiOff,
  XCircle,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";
import { usePeriod, useQueryState } from "../hooks/use-query-state";
import { useHydrated, useNow } from "../hooks/use-now";
import { UnsavedChangesDialog } from "../hooks/use-unsaved-changes";
import { PERIODS, xRoutes } from "../lib/constants";
import { postSummary, relative } from "../lib/format";
import { countMentions, failedPosts, scheduledPosts } from "../x-data/selectors";
import { useX } from "../store/x-store";
import type { Period } from "../x-data/types";
import { Composer } from "./composer";
import { ServiceUnavailableState } from "./states";
import {
  ActionMenu,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  SelectMenu,
  Skeleton,
  VerifiedMark,
  XLogo,
  buttonClass,
  useDebounced,
  x,
} from "./ui";

const TABS = [
  { label: "Overview", href: xRoutes.overview, exact: true },
  { label: "Content", href: xRoutes.content },
  { label: "Mentions & Replies", short: "Mentions", href: xRoutes.mentions },
  { label: "Audience", href: xRoutes.audience },
  { label: "Analytics", href: xRoutes.analytics },
  { label: "Scheduling", href: xRoutes.scheduling },
  { label: "Settings", href: xRoutes.settings },
] as const;

/** Tabs whose data is time-bound share the date range control. */
const PERIOD_TABS = new Set(["Overview", "Analytics", "Audience"]);

function currentTab(pathname: string) {
  return (
    TABS.find((tab) => ("exact" in tab && tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`))) ??
    TABS[0]
  );
}

export function XWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? xRoutes.overview;
  const tab = currentTab(pathname);
  const { connection, serviceError, simulation, retryLoad } = useX();
  const isSettings = tab.label === "Settings";

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100dvh-60px)] bg-[#F6F8FB] px-4 py-4 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-3">
        <WorkspaceHeader tabLabel={tab.label} />
        <ConnectionBanner />
        <WorkspaceTabs activeLabel={tab.label} />
        <main className="min-w-0">
          {serviceError ? (
            <ServiceUnavailableState message={serviceError.message} hint={serviceError.hint} />
          ) : simulation.loadError && !isSettings ? (
            <LoadErrorState onRetry={retryLoad} />
          ) : connection.state === "disconnected" && !isSettings ? (
            <DisconnectedState />
          ) : (
            children
          )}
        </main>
      </div>
      <Composer />
      <UnsavedChangesDialog />
    </div>
  );
}

function LoadErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <EmptyState
        icon={AlertTriangle}
        title="We couldn't load your X data"
        description="OmniPlatform couldn't reach its X data service. Your account on X isn't affected — nothing has changed there."
        action={
          <Button variant="primary" icon={RefreshCw} onClick={onRetry}>
            Try again
          </Button>
        }
        secondary={
          <Button variant="secondary" href={`${xRoutes.settings}#connection`}>
            Check connection
          </Button>
        }
      />
    </Card>
  );
}

function DisconnectedState() {
  const { reconnect, can } = useX();
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <EmptyState
        icon={XLogo}
        title="Connect your X account"
        description="Connect an account to publish posts, run the engagement inbox, track audience growth and report on performance from OmniPlatform. You'll sign in with X and choose which permissions to grant."
        action={
          <Button
            variant="dark"
            icon={XLogo}
            loading={busy}
            gate={can.canManageConnection}
            onClick={async () => {
              setBusy(true);
              await reconnect();
              setBusy(false);
            }}
          >
            Connect X account
          </Button>
        }
        secondary={
          <Button variant="secondary" href={xRoutes.settings}>
            Open settings
          </Button>
        }
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function WorkspaceHeader({ tabLabel }: { tabLabel: string }) {
  const { can, connection, syncNow, ready } = useX();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  const showCreate = tabLabel !== "Settings";
  const showSchedule = tabLabel === "Content" || tabLabel === "Scheduling" || tabLabel === "Overview";
  const busySync = syncing || connection.state === "syncing";

  return (
    <header className="flex flex-col gap-2.5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] text-[#6B7890]">
        <span>Channels</span>
        <ChevronRight className="size-3.5 text-[#C9D1DC]" />
        <Link href={xRoutes.overview} className={cn("rounded hover:text-[#0F1B3D]", x.focus)}>
          X
        </Link>
        <ChevronRight className="size-3.5 text-[#C9D1DC]" />
        <span aria-current="page" className="font-semibold text-[#0F1B3D]">
          {tabLabel}
        </span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-[#0F1419] text-white shadow-[0_2px_8px_rgba(15,20,25,0.25)]">
            <XLogo className="size-[22px]" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold leading-6 tracking-[-0.015em] text-[#0F1B3D]">X</h1>
            <p className="mt-0.5 max-w-[560px] text-[12.5px] leading-4 text-[#6B7890]">
              Manage your X profile, posts, mentions, audience and performance from one place.
            </p>
            <ConnectedAccount />
          </div>
        </div>

        {/* Below lg the actions get their own full-width row instead of being squeezed beside the title. */}
        <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 lg:w-auto lg:flex-1 lg:justify-end">
          <GlobalSearch />
          {PERIOD_TABS.has(tabLabel) && <DateRangeSelect />}
          <NotificationsButton />
          <Button
            size="md"
            variant="secondary"
            icon={RefreshCw}
            className="h-9 max-sm:hidden"
            loading={busySync}
            disabled={!ready || connection.state === "disconnected"}
            disabledReason={connection.state === "disconnected" ? "Connect an X account first." : "Still loading your X data."}
            onClick={async () => {
              setSyncing(true);
              await syncNow();
              setSyncing(false);
            }}
          >
            {busySync ? "Syncing…" : "Sync"}
          </Button>
          {showSchedule && (
            <Button
              size="md"
              variant="secondary"
              icon={CalendarClock}
              className="h-9 max-lg:hidden"
              gate={can.canSchedulePost}
              onClick={() => router.push(`${xRoutes.content}?compose=new&intent=schedule`)}
            >
              Schedule post
            </Button>
          )}
          {showCreate && (
            <ActionMenu
              label="Create"
              width={230}
              trigger={
                <button type="button" className={buttonClass("primary", "md", "h-9")}>
                  <Plus className="size-4" />
                  Create post
                  <ChevronDown className="size-3.5 opacity-80" />
                </button>
              }
              items={[
                { label: "Single post", icon: MessageSquare, onSelect: () => router.push(`${xRoutes.content}?compose=new`), gate: can.canCreatePost },
                { label: "Thread", icon: ListChecks, onSelect: () => router.push(`${xRoutes.content}?compose=new&mode=thread`), gate: can.canCreatePost },
                { label: "Poll", icon: Gauge, onSelect: () => router.push(`${xRoutes.content}?compose=new&mode=poll`), gate: can.canCreatePost },
                "separator",
                {
                  label: "Schedule a post",
                  icon: CalendarClock,
                  onSelect: () => router.push(`${xRoutes.content}?compose=new&intent=schedule`),
                  gate: can.canSchedulePost.allowed ? can.canCreatePost : can.canSchedulePost,
                },
              ]}
            />
          )}
          <MoreMenu tabLabel={tabLabel} />
        </div>
      </div>
    </header>
  );
}

function MoreMenu({ tabLabel }: { tabLabel: string }) {
  const { account, can } = useX();
  return (
    <ActionMenu
      label="More actions"
      width={225}
      trigger={
        <button type="button" className={buttonClass("secondary", "icon", "size-9")}>
          <span aria-hidden="true" className="text-[15px] font-bold leading-none tracking-[0.08em]">
            ⋯
          </span>
        </button>
      }
      items={[
        { label: "View profile on X", icon: ExternalLink, href: xRoutes.profileOnX(account.handle), external: true },
        { label: "Open content calendar", icon: CalendarDays, href: xRoutes.calendar },
        { label: "Campaigns", icon: Sparkles, href: xRoutes.campaigns },
        "separator",
        { label: "Export data", icon: Download, href: `${xRoutes.settings}#data` },
        { label: "X settings", icon: SettingsIcon, href: xRoutes.settings, hidden: tabLabel === "Settings" },
        { label: "Manage connection", icon: ShieldAlert, href: `${xRoutes.settings}#connection`, gate: can.canManageConnection },
      ]}
    />
  );
}

function ConnectedAccount() {
  const { account, ready } = useX();
  if (!ready) {
    return (
      <div className="mt-1.5 flex items-center gap-2">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-3 w-40" />
      </div>
    );
  }
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span className="flex items-center gap-1.5">
        <Avatar name={account.name} src={account.avatarUrl} className="size-6" />
        <span className="flex items-center gap-1 text-[12.5px] font-semibold text-[#0F1B3D]">
          {account.name}
          <VerifiedMark kind={account.verified} className="[&_svg]:size-3.5" />
        </span>
        <span className="text-[12px] text-[#6B7890]">{account.handle}</span>
      </span>
      <span className="h-3 w-px bg-[#E4E9F0]" aria-hidden="true" />
      <SyncStatus compact />
    </div>
  );
}

function DateRangeSelect() {
  const { period } = usePeriod();
  const { set } = useQueryState(useMemo(() => ({ period: "30d" }), []));
  return (
    <SelectMenu<Period>
      label="Date range"
      icon={CalendarDays}
      size="md"
      align="end"
      value={period}
      onChange={(value) => set({ period: value })}
      options={PERIODS.map((item) => ({ value: item.value, label: item.label }))}
      className="h-9"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Connection status                                                   */
/* ------------------------------------------------------------------ */

export function SyncStatus({ compact, className }: { compact?: boolean; className?: string }) {
  const { connection, syncNow, ready } = useX();
  // Relative times depend on the viewer's clock, so they wait for hydration.
  const hydrated = useHydrated();
  useNow();
  const [busy, setBusy] = useState(false);

  const state = connection.state;
  const pill =
    state === "syncing" ? (
      <Badge tone="blue" icon={Loader2} className="[&_svg]:animate-spin">
        Syncing
      </Badge>
    ) : state === "sync_failed" ? (
      <Badge tone="amber" icon={AlertTriangle}>
        Sync failed
      </Badge>
    ) : state === "token_expired" ? (
      <Badge tone="red" icon={ShieldAlert}>
        Connection expired
      </Badge>
    ) : state === "needs_reconnect" ? (
      <Badge tone="red" icon={ShieldAlert}>
        Needs reconnect
      </Badge>
    ) : state === "missing_permission" ? (
      <Badge tone="amber" icon={ShieldAlert}>
        Missing permission
      </Badge>
    ) : state === "rate_limited" ? (
      <Badge tone="amber" icon={Timer}>
        Rate limited
      </Badge>
    ) : state === "disconnected" ? (
      <Badge tone="neutral" icon={WifiOff}>
        Disconnected
      </Badge>
    ) : (
      <Badge tone="green" icon={CheckCircle2}>
        Connected
      </Badge>
    );

  if (!ready) return <Skeleton className="h-5 w-40" />;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1", className)}>
      {pill}
      {state !== "disconnected" && (
        <span className="text-[12px] text-[#6B7890]">
          Last sync <time dateTime={hydrated ? connection.lastSyncedAt : undefined}>{hydrated ? relative(connection.lastSyncedAt) : "…"}</time>
        </span>
      )}
      {!compact && state !== "disconnected" && (
        <Button
          size="xs"
          variant="ghost"
          icon={RefreshCw}
          loading={busy || state === "syncing"}
          onClick={async () => {
            setBusy(true);
            await syncNow();
            setBusy(false);
          }}
          className="text-[#2563EB] hover:text-[#1D4ED8]"
        >
          Sync now
        </Button>
      )}
    </div>
  );
}

function ConnectionBanner() {
  const { connection, reconnect, syncNow, scopes, can, ready } = useX();
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();
  useNow();

  if (!ready) return null;

  const run = async (action: () => Promise<boolean>) => {
    setBusy(true);
    await action();
    setBusy(false);
  };

  const reconnectButton = (
    <Button size="sm" variant="primary" loading={busy} gate={can.canManageConnection} onClick={() => run(reconnect)}>
      Reconnect account
    </Button>
  );

  const usage = connection.requestsLimit > 0 ? connection.requestsUsed / connection.requestsLimit : 0;

  if (connection.state === "token_expired") {
    return (
      <Strip
        tone="red"
        icon={ShieldAlert}
        title="X connection expired"
        body="You're seeing data from the last successful sync. Publishing, replies and edits are paused until you reconnect."
      >
        {reconnectButton}
      </Strip>
    );
  }

  if (connection.state === "needs_reconnect") {
    return (
      <Strip
        tone="red"
        icon={ShieldAlert}
        title="X needs you to re-authorise OmniPlatform"
        body="X has asked for fresh consent for this app. Reading works; publishing and replying are paused until you re-authorise."
      >
        {reconnectButton}
      </Strip>
    );
  }

  if (connection.state === "missing_permission") {
    return (
      <Strip
        tone="amber"
        icon={ShieldAlert}
        title={`${6 - scopes.length} X permission${6 - scopes.length === 1 ? "" : "s"} missing`}
        body="Some actions are unavailable until OmniPlatform is granted the permissions it needs on X."
      >
        <Button size="sm" variant="secondary" href={`${xRoutes.settings}#permissions`}>
          Review permissions
        </Button>
        {reconnectButton}
      </Strip>
    );
  }

  if (connection.state === "rate_limited") {
    return (
      <Strip
        tone="amber"
        icon={Timer}
        title="X rate limit reached"
        body={`Reading cached data works normally. Publishing and replies resume ${hydrated && connection.rateLimitResetAt ? relative(connection.rateLimitResetAt) : "when the window resets"
          }.`}
      >
        <Button size="sm" variant="secondary" href={`${xRoutes.settings}#sync`}>
          View API usage
        </Button>
      </Strip>
    );
  }

  if (connection.state === "sync_failed") {
    return (
      <Strip
        tone="amber"
        icon={AlertTriangle}
        title="Last sync didn't complete"
        body={`${connection.lastError ?? "X didn't return account data."} Data may be out of date — the last good sync was ${hydrated ? relative(connection.lastSyncedAt) : "recently"
          }.`}
      >
        <Button size="sm" variant="secondary" icon={RefreshCw} loading={busy} onClick={() => run(syncNow)}>
          Try again
        </Button>
      </Strip>
    );
  }

  if (connection.state === "connected" && usage >= 0.8) {
    return (
      <Strip
        tone="amber"
        icon={AlertTriangle}
        title={`X API usage at ${Math.round(usage * 100)}%`}
        body="Bulk syncs and publishing use the most requests. Above the limit, writes pause until the window resets."
      >
        <Button size="sm" variant="secondary" href={`${xRoutes.settings}#sync`}>
          View API usage
        </Button>
      </Strip>
    );
  }

  return null;
}

function Strip({
  tone,
  icon: Icon,
  title,
  body,
  children,
}: {
  tone: "red" | "amber";
  icon: ComponentIcon;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "red" ? "alert" : "status"}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-[10px] border px-3.5 py-2.5",
        tone === "red" ? "border-[#FBD5D9] bg-[#FEF6F7]" : "border-[#FBE3B6] bg-[#FFFAF0]",
      )}
    >
      <Icon className={cn("size-4 shrink-0", tone === "red" ? "text-[#C81E2B]" : "text-[#B54708]")} />
      <p className="min-w-[220px] flex-1 text-[12.5px] leading-5 text-[#3C4A66]">
        <b className="font-semibold text-[#0F1B3D]">{title}.</b> {body}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

type ComponentIcon = typeof ShieldAlert;

/* ------------------------------------------------------------------ */
/* Global search                                                       */
/* ------------------------------------------------------------------ */

type Hit = { type: "Post" | "Draft" | "Scheduled" | "Mention" | "Follower"; title: string; context: string; href: string };

function GlobalSearch() {
  const { posts, mentions, audience, ready } = useX();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { value: needle, pending } = useDebounced(query.trim().toLowerCase(), 220);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo<Hit[]>(() => {
    if (needle.length < 2) return [];
    const out: Hit[] = [];
    posts.forEach((post) => {
      const haystack = `${post.text} ${post.thread.join(" ")} ${post.internalTags.join(" ")}`.toLowerCase();
      if (!haystack.includes(needle)) return;
      out.push({
        type: post.status === "published" ? "Post" : post.status === "scheduled" ? "Scheduled" : "Draft",
        title: postSummary(post.text, 64),
        context: post.status === "published" ? "Published" : post.status === "scheduled" ? "Scheduled" : post.status,
        href: xRoutes.post(post.id),
      });
    });
    mentions.forEach((mention) => {
      const haystack = `${mention.text} ${mention.user.name} ${mention.user.handle}`.toLowerCase();
      if (!haystack.includes(needle)) return;
      out.push({ type: "Mention", title: postSummary(mention.text, 64), context: mention.user.handle, href: xRoutes.mention(mention.id) });
    });
    [...audience.recentFollowers, ...audience.topEngaging].forEach((member) => {
      if (!`${member.name} ${member.handle}`.toLowerCase().includes(needle)) return;
      if (out.some((hit) => hit.title === member.name)) return;
      out.push({ type: "Follower", title: member.name, context: member.handle, href: `${xRoutes.audience}?q=${encodeURIComponent(member.handle)}` });
    });
    return out.slice(0, 9);
  }, [needle, posts, mentions, audience]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (hit: Hit) => {
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    // Below lg the header actions need the room, and every page carries its own search.
    <div className="relative hidden w-full min-w-[190px] lg:block lg:w-[260px] xl:w-[290px]">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#98A2B3]" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="x-search-results"
        aria-label="Search posts, mentions and followers"
        placeholder="Search posts, mentions…"
        value={query}
        disabled={!ready}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, hits.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && hits[active]) {
            go(hits[active]!);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={cn(x.input, "pl-8 pr-14 [&::-webkit-search-cancel-button]:hidden")}
      />
      <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {pending && query.trim().length >= 2 ? (
          <Loader2 className="size-3.5 animate-spin text-[#98A2B3]" />
        ) : query ? (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setQuery("")}
            className="grid size-5 place-items-center rounded text-[#98A2B3] hover:bg-[#F1F4F8] hover:text-[#3C4A66]"
          >
            <XCircle className="size-3.5" />
          </button>
        ) : (
          <kbd className="hidden rounded border border-[#E4E9F0] bg-[#F8FAFC] px-1.5 text-[10px] font-medium text-[#98A2B3] sm:block">/</kbd>
        )}
      </span>

      {showPanel && (
        <div
          id="x-search-results"
          role="listbox"
          className="absolute right-0 top-11 z-40 w-full min-w-[320px] overflow-hidden rounded-[10px] border border-[#E4E9F0] bg-white py-1 shadow-[0_16px_40px_-12px_rgba(15,27,61,0.25)]"
        >
          {pending ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="flex items-center gap-2.5">
                  <Skeleton className="size-8 rounded-sm" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : hits.length === 0 ? (
            <p className="px-3.5 py-4 text-center text-[12.5px] text-[#6B7890]">Nothing matches “{query.trim()}”.</p>
          ) : (
            hits.map((hit, index) => (
              <button
                key={`${hit.type}-${hit.href}-${index}`}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(hit)}
                className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-left", index === active && "bg-[#F3F5F9]")}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#F1F4F8] text-[#6B7890]">
                  {hit.type === "Mention" ? <MessageSquare className="size-4" /> : hit.type === "Follower" ? <Avatar name={hit.title} className="size-8" /> : <XLogo className="size-3.5" />}
                </span>
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
  post_published: { icon: CheckCircle2, tone: "text-[#067647] bg-[#ECFAF3]" },
  post_failed: { icon: XCircle, tone: "text-[#C81E2B] bg-[#FEF1F2]" },
  mention_received: { icon: MessageSquare, tone: "text-[#1D4ED8] bg-[#EFF4FF]" },
  high_priority_mention: { icon: AlertTriangle, tone: "text-[#C81E2B] bg-[#FEF1F2]" },
  connection_issue: { icon: ShieldAlert, tone: "text-[#B54708] bg-[#FFF7E8]" },
  rate_limit: { icon: Timer, tone: "text-[#B54708] bg-[#FFF7E8]" },
  approval_requested: { icon: Clock3, tone: "text-[#6D28D9] bg-[#F4F0FF]" },
  sync_failed: { icon: AlertTriangle, tone: "text-[#B54708] bg-[#FFF7E8]" },
} as const;

function NotificationsButton() {
  const { notifications, markNotificationRead, markAllNotificationsRead, ready } = useX();
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const unread = notifications.filter((item) => !item.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={!ready}
          aria-label={`X notifications${unread ? `, ${unread} unread` : ""}`}
          className={buttonClass("secondary", "icon", "relative size-9")}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-sm bg-[#2563EB] px-1 text-[10px] font-bold text-white ring-2 ring-[#F6F8FB]">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[370px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[10px] border-[#E4E9F0] p-0">
        <div className="flex items-center justify-between border-b border-[#EEF1F5] px-3.5 py-2.5">
          <p className="text-[13px] font-semibold text-[#0F1B3D]">X notifications</p>
          <Button variant="link" size="xs" onClick={markAllNotificationsRead} disabled={!unread}>
            Mark all as read
          </Button>
        </div>
        <ul className="max-h-[380px] overflow-y-auto">
          {notifications.length === 0 && <li className="px-4 py-8 text-center text-[12.5px] text-[#6B7890]">You&apos;re all caught up.</li>}
          {notifications.map((notification) => {
            const meta = NOTIFICATION_ICON[notification.kind];
            const Icon = meta.icon;
            return (
              <li key={notification.id}>
                <Link
                  href={notification.href}
                  onClick={() => {
                    markNotificationRead(notification.id);
                    setOpen(false);
                  }}
                  className={cn("flex gap-2.5 border-b border-[#F3F5F9] px-3.5 py-2.5 last:border-0 hover:bg-[#F8FAFC]", !notification.read && "bg-[#F9FBFF]")}
                >
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-sm", meta.tone)}>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12.5px] font-semibold text-[#0F1B3D]">{notification.title}</span>
                      {!notification.read && <span className="size-2 shrink-0 rounded-sm bg-[#2563EB]" aria-label="Unread" />}
                    </span>
                    <span className="line-clamp-2 text-[12px] leading-4 text-[#3C4A66]">{notification.body}</span>
                    <span className="mt-0.5 block text-[11px] text-[#98A2B3]">{hydrated ? relative(notification.at) : "…"}</span>
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
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function WorkspaceTabs({ activeLabel }: { activeLabel: string }) {
  const { posts, mentions, ready } = useX();
  const { period } = usePeriod();

  const counts = useMemo(() => countMentions(mentions), [mentions]);
  const failed = useMemo(() => failedPosts(posts).length, [posts]);
  const queued = useMemo(() => scheduledPosts(posts).length, [posts]);

  return (
    <div className="flex items-end justify-between gap-3 border-b border-[#E4E9F0]">
      <nav aria-label="X sections" className="scrollbar-thin -mb-px flex min-w-0 gap-0.5 overflow-x-auto">
        {TABS.map((tab) => {
          const active = tab.label === activeLabel;
          // Carry the date range across the tabs that use it.
          const carriesPeriod = PERIOD_TABS.has(tab.label) && period !== "30d";
          const href = carriesPeriod ? `${tab.href}?period=${period}` : tab.href;
          const label = "short" in tab && tab.short ? tab.short : tab.label;

          return (
            <Link
              key={tab.href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1.5 text-[13px] font-semibold transition-colors",
                active ? "border-[#2563EB] text-[#0F1B3D]" : "border-transparent text-[#6B7890] hover:border-[#D0D7E2] hover:text-[#0F1B3D]",
                x.focus,
              )}
            >
              <span className="max-md:hidden">{tab.label}</span>
              <span className="md:hidden">{label}</span>
              {ready && tab.label === "Mentions & Replies" && counts.unanswered > 0 && (
                <span
                  className={cn(
                    "rounded-sm px-1.5 text-[10.5px] font-bold leading-4 tabular-nums",
                    counts.needsAttention > 0 ? "bg-[#FEF1F2] text-[#C81E2B]" : "bg-[#EFF4FF] text-[#1D4ED8]",
                  )}
                  title={`${counts.unanswered} unanswered`}
                >
                  {counts.unanswered}
                </span>
              )}
              {ready && tab.label === "Content" && failed > 0 && (
                <span className="rounded-sm bg-[#FEF1F2] px-1.5 text-[10.5px] font-bold leading-4 tabular-nums text-[#C81E2B]" title={`${failed} failed`}>
                  {failed}
                </span>
              )}
              {ready && tab.label === "Scheduling" && queued > 0 && (
                <span className="rounded-sm bg-[#F1F4F8] px-1.5 text-[10.5px] font-bold leading-4 tabular-nums text-[#6B7890]" title={`${queued} scheduled`}>
                  {queued}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* <div className="mb-2 hidden shrink-0 items-center gap-2 xl:flex">
        {X_MOCK_MODE && (
          <Badge tone="violet" icon={Sparkles} className="h-[22px]">
            Sample data
          </Badge>
        )}
      </div> */}
    </div>
  );
}
