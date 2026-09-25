"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  Store,
  Wifi,
  XCircle,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";
import { searchEntities, ALL_LOCATIONS } from "../data/selectors";
import { useLocationScope, usePeriod, useQueryState } from "../data/hooks";
import { useDebounced } from "../hooks/use-now";
import { UnsavedChangesDialog } from "../hooks/use-unsaved-changes";
import { PERIODS, VERIFICATION_LABEL, gbRoutes, type Period } from "../lib/constants";
import { relative } from "../lib/format";
import { useGbp } from "../store/gbp-store";
import { CreatePostShortcut, UploadMediaDialog } from "./dialogs";
import { LoadErrorState, NotConnectedState, PageSkeleton } from "./states";
import { ActionMenu, Button, SelectMenu, Skeleton, buttonClass, gb } from "./ui";

const TABS = [
  { label: "Overview", href: gbRoutes.overview, exact: true },
  { label: "Locations", href: gbRoutes.locations },
  { label: "Reviews", href: gbRoutes.reviews },
  { label: "Posts", href: gbRoutes.posts },
  { label: "Media", href: gbRoutes.media },
  { label: "Performance", href: gbRoutes.performance },
  { label: "Profile", href: gbRoutes.profile },
  { label: "Settings", href: gbRoutes.settings },
] as const;

/** Tabs whose data is time-bound show the shared date range control. */
const PERIOD_TABS = new Set(["Overview", "Performance"]);

function currentTab(pathname: string) {
  return TABS.find((tab) => ("exact" in tab && tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`))) ?? TABS[0];
}

export function GoogleBusinessWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? gbRoutes.overview;
  const tab = currentTab(pathname);
  const { status, error, reload, connection } = useGbp();
  const isSettings = tab.label === "Settings";

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100dvh-60px)] bg-[#F8F9FA] px-4 py-4 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-3">
        <WorkspaceHeader tabLabel={tab.label} />
        <ConnectionBanners />
        <WorkspaceTabs activeLabel={tab.label} />
        <main className="min-w-0">
          {status === "loading" ? (
            <PageSkeleton variant={tab.label === "Locations" || tab.label === "Reviews" ? "table" : tab.label === "Media" ? "grid" : "dashboard"} />
          ) : status === "not_connected" ? (
            <NotConnectedState />
          ) : status === "error" ? (
            <LoadErrorState message={error} onRetry={reload} />
          ) : connection.state === "disconnected" && !isSettings ? (
            <DisconnectedState />
          ) : (
            children
          )}
        </main>
      </div>
      <UnsavedChangesDialog />
      <style>{`@media print { aside, header.sticky, footer, [data-gb-no-print] { display: none !important; } [class*="lg:pl-"] { padding-left: 0 !important; } }`}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function WorkspaceHeader({ tabLabel }: { tabLabel: string }) {
  return (
    <header className="flex flex-col gap-2.5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] text-[#5F6368]">
        <span>Channels</span>
        <ChevronRight className="size-3.5 text-[#C6C9CD]" />
        <Link href={gbRoutes.overview} className="rounded hover:text-[#202124]">
          Google Business
        </Link>
        <ChevronRight className="size-3.5 text-[#C6C9CD]" />
        <span aria-current="page" className="font-medium text-[#202124]">
          {tabLabel}
        </span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex shrink-0 items-center justify-center">
            <img src="/gbp-logo.png" alt="Google Business Logo" className="size-14 object-contain drop-shadow-sm scale-[1.2]" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-medium leading-6 tracking-[-0.015em] text-[#202124]">Google Business</h1>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                Reviews · Insights · Profile — Preview Mode
              </span>
            </div>
            <p className="truncate text-[12.5px] text-[#5F6368]">Manage locations, reviews, posts, insights and local visibility.</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
          <LocationSelect />
          <GlobalSearch />
          {PERIOD_TABS.has(tabLabel) && <DateRangeSelect />}
          <NotificationsButton />
        </div>
      </div>
    </header>
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
      options={PERIODS.map((option) => ({ value: option.value, label: option.label }))}
      className="h-9"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Location context                                                    */
/* ------------------------------------------------------------------ */

function LocationSelect() {
  const { locations, account } = useGbp();
  const { selected, setLocation } = useLocationScope();

  const options = [
    { value: ALL_LOCATIONS, label: `All locations (${locations.length})`, description: account?.accountName },
    ...locations.map((item) => ({
      value: item.locationId,
      label: item.profile.title,
      description: `${item.profile.address.locality} · ${VERIFICATION_LABEL[item.verification]}`,
    })),
  ];

  return (
    <SelectMenu
      label="Select location"
      value={selected}
      onChange={setLocation}
      options={options}
      size="md"
      className="w-[200px]"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Global search                                                       */
/* ------------------------------------------------------------------ */

function GlobalSearch() {
  const { locations, reviews, posts } = useGbp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { value: debounced, pending } = useDebounced(query.trim(), 220);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => searchEntities(debounced, { locations, reviews, posts }), [debounced, locations, reviews, posts]);
  const showPanel = open && query.trim().length >= 2;

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

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <div className="relative w-full min-w-[200px] sm:w-[250px] lg:w-[290px]">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#80868B]" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="gb-search-results"
        aria-label="Search locations, reviews and posts"
        placeholder="Search locations, reviews, posts..."
        value={query}
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
            setActive((value) => Math.min(value + 1, hits.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((value) => Math.max(value - 1, 0));
          } else if (event.key === "Enter" && hits[active]) {
            go(hits[active]!.href);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={cn(gb.input, "pl-8 pr-12 [&::-webkit-search-cancel-button]:hidden")}
      />
      <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {pending && query.trim().length >= 2 ? (
          <Loader2 className="size-3.5 animate-spin text-[#80868B]" />
        ) : query ? (
          <button type="button" aria-label="Clear search" onMouseDown={(event) => event.preventDefault()} onClick={() => setQuery("")} className="grid size-5 place-items-center rounded text-[#80868B] hover:bg-[#F1F3F4]">
            <XCircle className="size-3.5" />
          </button>
        ) : (
          <kbd className="hidden rounded border border-[#E8EAED] bg-[#F8F9FA] px-1.5 text-[10px] font-medium text-[#80868B] sm:block">/</kbd>
        )}
      </span>
      {showPanel && (
        <div id="gb-search-results" role="listbox" className="absolute right-0 top-11 z-40 w-full min-w-[320px] overflow-hidden rounded-lg border border-[#E8EAED] bg-white py-1 shadow-[0_8px_24px_rgba(60,64,67,0.22)]">
          {pending ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              ))}
            </div>
          ) : hits.length === 0 ? (
            <p className="px-3.5 py-4 text-center text-[12.5px] text-[#5F6368]">No locations, reviews or posts match &ldquo;{query.trim()}&rdquo;.</p>
          ) : (
            hits.map((hit, index) => (
              <button
                key={`${hit.type}-${hit.href}-${index}`}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(hit.href)}
                className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-left", index === active && "bg-[#F1F3F4]")}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-[#202124]">{hit.title}</span>
                  <span className="block truncate text-[11.5px] text-[#5F6368]">{hit.context}</span>
                </span>
                <span className="shrink-0 rounded bg-[#F1F3F4] px-1.5 py-0.5 text-[10.5px] font-medium text-[#3C4043]">{hit.type}</span>
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
  new_review: { icon: Star, tone: "text-[#B06000] bg-[#FEF7E0]" },
  low_rating_review: { icon: Star, tone: "text-[#C5221F] bg-[#FCE8E6]" },
  reply_needed: { icon: MessageSquare, tone: "text-[#1967D2] bg-[#E8F0FE]" },
  location_update: { icon: Store, tone: "text-[#1967D2] bg-[#E8F0FE]" },
  sync_failure: { icon: AlertTriangle, tone: "text-[#B06000] bg-[#FEF7E0]" },
  verification_change: { icon: ShieldAlert, tone: "text-[#B06000] bg-[#FEF7E0]" },
  permission_expired: { icon: ShieldAlert, tone: "text-[#C5221F] bg-[#FCE8E6]" },
  duplicate_location: { icon: MapPin, tone: "text-[#8430CE] bg-[#F3E8FD]" },
  post_published: { icon: CheckCircle2, tone: "text-[#137333] bg-[#E6F4EA]" },
  post_failed: { icon: XCircle, tone: "text-[#C5221F] bg-[#FCE8E6]" },
  approval_requested: { icon: Check, tone: "text-[#8430CE] bg-[#F3E8FD]" },
} as const;

function NotificationsButton() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useGbp();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((item) => !item.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Google Business notifications${unread ? `, ${unread} unread` : ""}`} className={cn(buttonClass("secondary", "icon", "relative size-9"))}>
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#D93025] px-1 text-[10px] font-bold text-white ring-2 ring-[#F8F9FA]">{unread}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border-[#E8EAED] p-0">
        <div className="flex items-center justify-between border-b border-[#F1F3F4] px-3.5 py-2.5">
          <p className="text-[13px] font-medium text-[#202124]">Notifications</p>
          <Button variant="link" size="xs" onClick={markAllNotificationsRead} disabled={!unread}>
            Mark all as read
          </Button>
        </div>
        <ul className="max-h-[380px] overflow-y-auto">
          {notifications.length === 0 && <li className="px-4 py-8 text-center text-[12.5px] text-[#5F6368]">You are all caught up.</li>}
          {notifications.map((item) => {
            const meta = NOTIFICATION_ICON[item.kind];
            const Icon = meta.icon;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => {
                    markNotificationRead(item.id);
                    setOpen(false);
                  }}
                  className={cn("flex gap-2.5 border-b border-[#F1F3F4] px-3.5 py-2.5 hover:bg-[#F8F9FA]", !item.read && "bg-[#F8FBFF]")}
                >
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", meta.tone)}>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12.5px] font-medium text-[#202124]">{item.title}</span>
                      {!item.read && <span className="size-2 shrink-0 rounded-full bg-[#1A73E8]" aria-label="Unread" />}
                    </span>
                    <span className="line-clamp-2 text-[12px] leading-4 text-[#3C4043]">{item.body}</span>
                    <span className="mt-0.5 block text-[11px] text-[#80868B]">{relative(item.at)}</span>
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
/* Banners                                                             */
/* ------------------------------------------------------------------ */

function Strip({
  tone,
  icon: Icon,
  title,
  body,
  children,
}: {
  tone: "red" | "amber" | "blue";
  icon: ComponentIcon;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const palette = tone === "red" ? "border-[#FAD2CF] bg-[#FCE8E6]" : tone === "amber" ? "border-[#FEEFC3] bg-[#FEF7E0]" : "border-[#D2E3FC] bg-[#E8F0FE]";
  const iconColor = tone === "red" ? "text-[#C5221F]" : tone === "amber" ? "text-[#B06000]" : "text-[#1967D2]";
  return (
    <div role={tone === "red" ? "alert" : "status"} className={cn("flex flex-wrap items-center gap-3 rounded-lg border px-3.5 py-2.5", palette)}>
      <Icon className={cn("size-4 shrink-0", iconColor)} />
      <p className="min-w-[220px] flex-1 text-[12.5px] leading-5 text-[#3C4043]">
        <b className="font-medium text-[#202124]">{title}.</b> {body}
      </p>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

type ComponentIcon = typeof AlertTriangle;

function ConnectionBanners() {
  const { status, connection, reconnect, can, scopes } = useGbp();
  const [busy, setBusy] = useState(false);
  if (status !== "ready") return null;

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  const quotaShare = connection.quotaLimit ? connection.quotaUsed / connection.quotaLimit : 0;

  if (connection.state === "token_expired") {
    return (
      <Strip tone="red" icon={ShieldAlert} title="Google connection expired" body="You are seeing data from the last successful sync. Replies, posts and profile edits are paused until you reconnect.">
        <Button size="sm" variant="primary" loading={busy} gate={can.canManageConnection} onClick={() => run(reconnect)}>
          Reconnect account
        </Button>
      </Strip>
    );
  }
  if (connection.state === "quota_exceeded") {
    return (
      <Strip tone="amber" icon={AlertTriangle} title="Google API quota reached" body="Viewing synced data works normally. Writes resume once the daily quota resets.">
        <Button size="sm" variant="secondary" href={`${gbRoutes.settings}#sync`}>
          View quota usage
        </Button>
      </Strip>
    );
  }

  if (!scopes.includes("business.manage")) {
    return (
      <Strip tone="amber" icon={ShieldAlert} title="Google permissions missing" body="Most actions are unavailable until the Business Profile permission is granted again.">
        <Button size="sm" variant="primary" loading={busy} gate={can.canManageConnection} onClick={() => run(reconnect)}>
          Reconnect permissions
        </Button>
      </Strip>
    );
  }
  if (quotaShare >= 0.8) {
    return (
      <Strip tone="amber" icon={AlertTriangle} title={`API quota at ${Math.round(quotaShare * 100)}%`} body="Bulk syncs and uploads use the most quota. Writes pause if the daily limit is reached.">
        <Button size="sm" variant="secondary" href={`${gbRoutes.settings}#sync`}>
          View quota usage
        </Button>
      </Strip>
    );
  }
  return null;
}

function DisconnectedState() {
  const { reconnect, can } = useGbp();
  const [busy, setBusy] = useState(false);
  return (
    <div className={gb.card}>
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <span className="grid size-11 place-items-center rounded-xl bg-[#F1F3F4] text-[#5F6368] ring-1 ring-[#E8EAED]">
          <Wifi className="size-5" />
        </span>
        <h3 className="mt-3 text-[14px] font-medium text-[#202124]">Connect your Google Business account</h3>
        <p className="mt-1 max-w-[420px] text-[12.5px] leading-5 text-[#5F6368]">
          Connect an account to manage locations, reviews, posts, photos and performance from OmniPlatform. You will sign in with Google and choose which permissions to grant.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            variant="primary"
            loading={busy}
            gate={can.canManageConnection}
            onClick={async () => {
              setBusy(true);
              await reconnect();
              setBusy(false);
            }}
          >
            Connect Google Business
          </Button>
          <Button variant="secondary" href={gbRoutes.settings}>
            Open settings
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function WorkspaceTabs({ activeLabel }: { activeLabel: string }) {
  const { reviews, posts, locations, status, can, syncLocations, connection } = useGbp();
  const { period } = usePeriod();
  const { selected } = useLocationScope();
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const unanswered = reviews.filter((review) => review.reply === null).length;
  const pendingPosts = posts.filter((post) => post.state === "pending_approval").length;
  const attentionLocations = locations.filter((location) => location.sync.state === "failed" || location.verification !== "verified").length;

  const withContext = (href: string, label: string) => {
    const params = new URLSearchParams();
    if (selected !== ALL_LOCATIONS) params.set("location", selected);
    if (period !== "30d" && PERIOD_TABS.has(label)) params.set("period", period);
    const query = params.toString();
    return query ? `${href}?${query}` : href;
  };

  return (
    <div className="flex flex-wrap items-center justify-between border-b border-[#E8EAED] pb-px">
      <nav aria-label="Google Business sections" className="scrollbar-thin -mb-px flex min-w-0 gap-0.5 overflow-x-auto pt-1">
        {TABS.map((tab) => {
          const active = tab.label === activeLabel;
          return (
            <Link
              key={tab.href}
              href={withContext(tab.href, tab.label)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2 pt-1.5 text-[13px] font-medium transition-colors",
                active ? "border-[#1A73E8] text-[#1A73E8]" : "border-transparent text-[#5F6368] hover:border-[#DADCE0] hover:text-[#202124]",
                gb.focus,
              )}
            >
              {tab.label}
              {tab.label === "Reviews" && unanswered > 0 && <span className="rounded-full bg-[#FEF7E0] px-1.5 text-[10.5px] font-bold leading-4 text-[#B06000]">{unanswered}</span>}
              {tab.label === "Posts" && pendingPosts > 0 && <span className="rounded-full bg-[#F3E8FD] px-1.5 text-[10.5px] font-bold leading-4 text-[#8430CE]">{pendingPosts}</span>}
              {tab.label === "Locations" && attentionLocations > 0 && <span className="rounded-full bg-[#FCE8E6] px-1.5 text-[10.5px] font-bold leading-4 text-[#C5221F]">{attentionLocations}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="ml-4 flex shrink-0 items-center gap-2 pb-1.5">
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          className="h-8 text-[13px]"
          loading={syncing || connection.state === "syncing"}
          gate={can.canSyncLocations}
          disabled={status !== "ready"}
          disabledReason="Data is still loading"
          onClick={async () => {
            setSyncing(true);
            await syncLocations();
            setSyncing(false);
          }}
        >
          Sync locations
        </Button>
        <ActionMenu
          label="Quick actions"
          width={224}
          trigger={
            <button type="button" className={buttonClass("primary", "sm", "h-8 text-[13px]")}>
              Create
              <ChevronDown className="size-3.5 opacity-80" />
            </button>
          }
          items={[
            { label: "Create post", icon: MessageSquare, onSelect: () => setPostOpen(true), gate: can.canCreatePosts },
            { label: "Upload photos", icon: ImageIcon, onSelect: () => setUploadOpen(true), gate: can.canManageMedia },
            { label: "Reply to reviews", icon: Star, onSelect: () => router.push(`${gbRoutes.reviews}?tab=unanswered`), gate: can.canReadReviews },
            "separator",
            { label: "Update business profile", icon: Store, onSelect: () => router.push(gbRoutes.profile), gate: can.canEditProfile },
            { label: "View performance", icon: CalendarDays, onSelect: () => router.push(gbRoutes.performance), gate: can.canViewPerformance },
          ]}
        />
      </div>
      <CreatePostShortcut open={postOpen} onOpenChange={setPostOpen} />
      <UploadMediaDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
