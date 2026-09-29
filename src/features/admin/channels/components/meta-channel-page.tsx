"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  ChevronDown,
  Link2,
  Megaphone,
  PenLine,
  RefreshCcw,
  Rocket,
  Signal,
  UsersRound,
  Video,
  XCircle,
} from "lucide-react";
import { ChannelLogo } from "../../shared/channel-logo";
import { cn } from "@/lib/utils/cn";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { integrationsApi, type ProviderOverview } from "@/features/admin/integrations/live/integrations-api";
import type { ScheduledPost } from "@/features/admin/content/live/scheduling-api";
import {
  metaProvider,
  useMetaCampaigns,
  useMetaOverview,
  useMetaScheduledPosts,
} from "../live/meta-instagram-hooks";

/* ── demo-only panels (no backend route exists for these) ───────────────── */

const performance = [
  { d: "Mar 15", fbReach: 12000, igReach: 6800, fbEng: 900, igEng: 520 },
  { d: "Mar 20", fbReach: 18600, igReach: 11200, fbEng: 1250, igEng: 780 },
  { d: "Mar 25", fbReach: 22400, igReach: 14800, fbEng: 1480, igEng: 960 },
  { d: "Mar 30", fbReach: 26800, igReach: 18200, fbEng: 1720, igEng: 1180 },
  { d: "Apr 5", fbReach: 30200, igReach: 21600, fbEng: 1980, igEng: 1420 },
  { d: "Apr 10", fbReach: 34600, igReach: 25400, fbEng: 2240, igEng: 1680 },
  { d: "Apr 14", fbReach: 38200, igReach: 29800, fbEng: 2480, igEng: 1920 },
];

const gender = [
  { name: "Women", value: 62, color: "#F2709B" },
  { name: "Men", value: 36, color: "#3186F3" },
  { name: "Other", value: 2, color: "#C3CDDC" },
];

const locations = [
  { name: "Delhi", value: 28 },
  { name: "Uttar Pradesh", value: 18 },
  { name: "Maharashtra", value: 12 },
  { name: "Bihar", value: 8 },
  { name: "Other", value: 34 },
];

const conversations = [
  { user: "Priya Sharma", platform: "Instagram", message: "This is such an important initiative! ...", time: "10 min ago", type: "Comment" },
  { user: "Rahul Verma", platform: "Facebook", message: "How can I volunteer?", time: "45 min ago", type: "Message" },
  { user: "Sneha Kapoor", platform: "Instagram", message: "Amazing work 🙌", time: "2 hours ago", type: "Comment" },
  { user: "Amit Yadav", platform: "Facebook", message: "Is there a donation link?", time: "4 hours ago", type: "Message" },
  { user: "Neha Singh", platform: "Instagram", message: "Would love to join the next drive!", time: "6 hours ago", type: "Comment" },
];

/* ── live row shapes ────────────────────────────────────────────────────── */

type PlatformName = "Facebook" | "Instagram";

interface AccountRow {
  id: string;
  channel: PlatformName;
  name: string;
  type: string;
  connected: boolean;
  reconnect: boolean;
  metrics: Array<[string, string]>;
}

interface AttentionRow {
  id: string;
  title: string;
  detail: string;
  tone: "amber" | "red";
  icon: typeof AlertTriangle;
}

interface PostRow {
  id: string;
  title: string;
  excerpt: string;
  platform: PlatformName;
  type: string;
  published: string;
}

interface CampaignRow {
  id: string;
  name: string;
  objective: string;
  spend: string;
  leads: string;
  links: string;
  cpl: string;
  status: string;
}

interface ScheduledRow {
  id: string;
  title: string;
  platform: PlatformName;
  type: string;
  date: string;
  time: string;
}

const STATE_COPY: Record<NonNullable<ProviderOverview["state"]>, string> = {
  connected: "Connected",
  disconnected: "Connected · no account mapped",
  setup_required: "Setup required",
  unsupported: "Unsupported",
  coming_soon: "Coming soon",
  permission_required: "Permission required",
  degraded: "Reconnect required",
};

function platformOf(channel: string): PlatformName {
  return channel === "INSTAGRAM_ACCOUNT" ? "Instagram" : "Facebook";
}

function postType(post: ScheduledPost): string {
  const media = post.media ?? [];
  if (media.length > 1) return "Carousel";
  if (media[0]?.asset?.kind === "VIDEO") return "Video";
  return media.length === 1 ? "Image" : "Text";
}

function splitContent(content: string): { title: string; excerpt: string } {
  const clean = content.replace(/\s+/g, " ").trim();
  if (clean.length <= 44) return { title: clean || "(empty post)", excerpt: "" };
  return { title: `${clean.slice(0, 44)}…`, excerpt: clean.slice(44, 96) };
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function accountRow(provider: ProviderOverview | null, channel: PlatformName, type: string): AccountRow {
  return {
    id: channel,
    channel,
    name: provider?.resources[0]?.externalResourceId
      ? `${type} · ${provider.resources[0].externalResourceId}`
      : type,
    type: provider ? STATE_COPY[provider.state] : "Setup required",
    connected: provider?.state === "connected",
    reconnect: Boolean(provider?.reconnectRequired),
    metrics: [
      [String(provider?.mappedResourceCount ?? 0), "Mapped"],
      [provider?.health ? provider.health.replace("_", " ") : "—", "Health"],
      [provider?.publishingSupported ? "Yes" : "No", "Publishing"],
      [provider?.lastUpdatedAt ? formatDate(provider.lastUpdatedAt) : "—", "Updated"],
    ],
  };
}

/* ── page ───────────────────────────────────────────────────────────────── */

export function MetaChannelPage() {
  const { companyId, clientId, isReady } = useTenancyContext();
  const [connecting, setConnecting] = useState(false);

  const enabled = isReady && Boolean(companyId) && Boolean(clientId);
  const overviewQuery = useMetaOverview(companyId, clientId, enabled);
  const postsQuery = useMetaScheduledPosts(companyId, clientId, enabled);
  const campaignsQuery = useMetaCampaigns(companyId, clientId, enabled);

  const meta = metaProvider(overviewQuery.data, "META");
  const instagram = metaProvider(overviewQuery.data, "INSTAGRAM");

  const allPosts = postsQuery.data?.items ?? [];
  const scheduledPosts = allPosts.filter((post) => post.status === "SCHEDULED");
  const publishedPosts = allPosts.filter((post) => post.status === "PUBLISHED");
  const failedPosts = allPosts.filter((post) => post.status === "FAILED");

  const refresh = () => {
    void overviewQuery.refetch();
    void postsQuery.refetch();
    void campaignsQuery.refetch();
  };

  const connectMeta = async () => {
    if (!companyId) {
      toast.error("Select a Company before connecting Meta.");
      return;
    }
    setConnecting(true);
    try {
      const { authUrl } = await integrationsApi.initOAuth(companyId, "META");
      window.location.assign(authUrl);
      return;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start the Meta connection.");
      setConnecting(false);
    }
  };

  const scopeNotice = !isReady
    ? null
    : !companyId
      ? "Select a Company to manage Meta & Instagram."
      : !clientId
        ? "Select a Client to load connections, posts and campaigns."
        : null;

  const loadError = !isReady
    ? null
    : overviewQuery.error
      ? message(overviewQuery.error, "Unable to load the channel overview.")
      : postsQuery.error
        ? message(postsQuery.error, "Unable to load publishing history.")
        : campaignsQuery.error
          ? message(campaignsQuery.error, "Unable to load campaigns.")
          : null;

  const connectedCount = [meta, instagram].filter((row) => row && row.state !== "setup_required").length;

  const accounts: AccountRow[] = [
    accountRow(meta, "Facebook", "Facebook Page"),
    accountRow(instagram, "Instagram", "Instagram Business"),
  ];

  const attention: AttentionRow[] = [];
  for (const provider of [meta, instagram]) {
    if (!provider) continue;
    if (provider.reconnectRequired) {
      attention.push({
        id: `${provider.provider}-reconnect`,
        title: `${provider.provider} connection needs attention`,
        detail: provider.reason ?? "Reconnect the account to keep publishing.",
        tone: "red",
        icon: XCircle,
      });
    } else if (provider.state === "setup_required") {
      attention.push({
        id: `${provider.provider}-setup`,
        title: `${provider.provider} is not connected yet`,
        detail: provider.reason ?? "Connect the account before publishing.",
        tone: "amber",
        icon: AlertTriangle,
      });
    } else if (provider.state === "disconnected") {
      attention.push({
        id: `${provider.provider}-unmapped`,
        title: `${provider.provider} has no account mapped to this Client`,
        detail: "Map a Page or Instagram account from Integrations.",
        tone: "amber",
        icon: Link2,
      });
    }
  }
  if (failedPosts.length) {
    attention.push({
      id: "publish-failures",
      title: `${failedPosts.length} post${failedPosts.length === 1 ? "" : "s"} failed to publish`,
      detail: failedPosts[0]?.failureCode ?? "Open Content → Scheduled posts for details.",
      tone: "red",
      icon: RefreshCcw,
    });
  }

  const published: PostRow[] = publishedPosts.slice(0, 6).map((post) => ({
    id: post.id,
    ...splitContent(post.content),
    platform: platformOf(post.channel),
    type: postType(post),
    published: formatDate(post.publishedAt),
  }));

  const campaigns: CampaignRow[] = (campaignsQuery.data?.items ?? []).slice(0, 6).map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    objective: campaign.objective ?? "—",
    spend: campaign.budget ? `${campaign.budget.currency} ${campaign.budget.amount}` : "—",
    leads: campaign.kpis?.targetLeads != null ? String(campaign.kpis.targetLeads) : "—",
    links: "—",
    cpl: "—",
    status: campaign.status,
  }));

  const scheduled: ScheduledRow[] = scheduledPosts.slice(0, 6).map((post) => ({
    id: post.id,
    title: splitContent(post.content).title,
    platform: platformOf(post.channel),
    type: postType(post),
    date: formatDate(post.scheduledFor),
    time: formatTime(post.scheduledFor),
  }));

  const isLoading = overviewQuery.isLoading || postsQuery.isLoading || campaignsQuery.isLoading;

  const stats = [
    { label: "Connected Accounts", value: String(connectedCount), trend: null, note: "Facebook + Instagram", icon: Link2, color: "blue", demo: false },
    { label: "Scheduled Posts", value: String(scheduledPosts.length), trend: null, note: `${publishedPosts.length} published · ${failedPosts.length} failed`, icon: CalendarRange, color: "purple", demo: false },
    { label: "Mapped Accounts", value: String((meta?.mappedResourceCount ?? 0) + (instagram?.mappedResourceCount ?? 0)), trend: null, note: "Resources mapped to this Client", icon: UsersRound, color: "sky", demo: false },
    { label: "Total Followers", value: "—", trend: null, note: "Not exposed by the backend", icon: UsersRound, color: "green", demo: true },
    { label: "Total Reach", value: "—", trend: null, note: "Not exposed by the backend", icon: Signal, color: "red", demo: true },
    { label: "Ad Spend", value: "—", trend: null, note: "Meta Ads is not connected yet", icon: Megaphone, color: "rose", demo: true },
  ] as const;

  return (
    <div className="space-y-2">
      <Header
        connectedCount={connectedCount}
        onConnect={connectMeta}
        connecting={connecting}
        onRefresh={refresh}
      />

      {scopeNotice && (
        <div className="rounded-sm border border-[#DDE4ED] bg-white px-3 py-2 text-[11px] text-[#52617D]" role="status">
          {scopeNotice}
        </div>
      )}

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900" role="alert">
          <span>{loadError}</span>
          <button className="shrink-0 font-semibold underline" onClick={refresh}>Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} loading={isLoading} />
        ))}
      </div>

      <div className="grid items-start gap-2 [&>section]:h-[232px] xl:grid-cols-[1.5fr_1fr_.86fr]">
        <PerformanceOverview />
        <ConnectedAccounts rows={accounts} loading={overviewQuery.isLoading} onConnect={connectMeta} connecting={connecting} />
        <NeedsAttention rows={attention} loading={overviewQuery.isLoading || postsQuery.isLoading} />
      </div>

      <div className="grid items-start gap-2 [&>section]:h-[236px] xl:grid-cols-[1.16fr_1.2fr_.64fr]">
        <TopPosts rows={published} loading={postsQuery.isLoading} />
        <CampaignPerformance rows={campaigns} loading={campaignsQuery.isLoading} />
        <QuickActions onConnect={connectMeta} connecting={connecting} />
      </div>

      <div className="grid items-start gap-2 [&>section]:h-[224px] xl:grid-cols-[1fr_1.1fr_.9fr]">
        <AudienceInsights />
        <Conversations />
        <ScheduledContent rows={scheduled} loading={postsQuery.isLoading} />
      </div>

      <RefreshHint cachedAt={overviewQuery.dataUpdatedAt} onRefresh={refresh} />
    </div>
  );
}

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function RefreshHint({ cachedAt, onRefresh }: { cachedAt: number; onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border border-[#DDE4ED] bg-white px-3 py-2 text-[11px] text-[#7C89A2]">
      <span>
        Meta &amp; Instagram panels read live from the backend
        {cachedAt ? ` · last refresh ${new Date(cachedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}.
        Followers, reach and inbox metrics have no backend route yet and are hidden rather than simulated.
      </span>
      <button className="flex shrink-0 items-center gap-1 font-semibold text-[#EB0711]" onClick={onRefresh}>
        <RefreshCcw className="size-3" /> Refresh
      </button>
    </div>
  );
}

/* ── shared chrome ──────────────────────────────────────────────────────── */

function Header({
  connectedCount,
  onConnect,
  connecting,
  onRefresh,
}: {
  connectedCount: number;
  onConnect: () => void;
  connecting: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex min-h-[52px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="self-center">
        <h1 className="flex items-center gap-2 text-[20px] font-semibold leading-6 tracking-[-0.025em] text-[#111B43]">
          Meta &amp; Instagram
          <ChannelLogo channel="Meta" className="size-[22px] bg-transparent" />
          <ChannelLogo channel="Instagram" className="size-[19px] bg-transparent" />
        </h1>
        <p className="mt-0.5 text-[11px] leading-4 text-[#687797]">
          {connectedCount > 0
            ? `${connectedCount} of 2 channels connected · manage content, campaigns and publishing for Facebook and Instagram.`
            : "Connect Facebook and Instagram to publish content and track what the backend knows about this Client."}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={onConnect}
          disabled={connecting}
          className="flex h-12 items-center gap-2 rounded-sm bg-[#1769DF] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1259BD] disabled:opacity-60"
        >
          <span className="text-left">
            <span className="block">{connecting ? "Opening Meta…" : "Connect Facebook & Instagram"}</span>
            <span className="block text-[11px] font-medium text-blue-100">OAuth via the platform backend</span>
          </span>
        </button>
        <Link
          href="/admin/meta/ads"
          className="flex h-12 items-center gap-2 rounded-sm border border-[#D7E0EB] bg-white px-4 text-xs font-semibold text-[#172044] shadow-[0_1px_4px_rgb(31_50_81/0.08)] transition-colors hover:bg-[#F8FAFD]"
        >
          Meta Ads Manager
        </Link>
        <button className="flex h-12 items-center gap-2 rounded-sm border border-[#D7E0EB] bg-white px-3 shadow-[0_1px_4px_rgb(31_50_81/0.08)]">
          <CalendarDays className="size-3.5 shrink-0 text-[#19315E]" />
          <span className="text-left leading-none">
            <b className="block text-[11px] leading-4 text-[#172044]">Live data</b>
            <small className="block whitespace-nowrap text-[11px] leading-3 text-[#75829D]">Fetched on load</small>
          </span>
          <ChevronDown className="ml-auto size-3 shrink-0" />
        </button>
        <button
          onClick={onRefresh}
          title="Refresh live data"
          aria-label="Refresh live data"
          className="grid size-12 place-items-center rounded-sm border border-[#D7E0EB] bg-white text-[#425273] shadow-[0_1px_4px_rgb(31_50_81/0.08)] transition-colors hover:bg-[#F8FAFD]"
        >
          <RefreshCcw className="size-4" />
        </button>
      </div>
    </div>
  );
}

const tint: Record<string, string> = {
  blue: "bg-[#E8F2FF] text-[#1975E7]",
  sky: "bg-[#E4F1FE] text-[#0E86D4]",
  red: "bg-[#FFE9EB] text-[#EA1A26]",
  rose: "bg-[#FFECF1] text-[#E0356F]",
  green: "bg-[#E4F8F0] text-[#0AA673]",
  purple: "bg-[#F2E9FF] text-[#8A38DD]",
  amber: "bg-[#FFF1D8] text-[#E79A00]",
  slate: "bg-[#EDF1F7] text-[#4E6182]",
};

function Stat({
  label,
  value,
  trend,
  note,
  icon: Icon,
  color,
  demo,
  loading,
}: {
  label: string;
  value: string;
  trend: string | null;
  note: string;
  icon: typeof Link2;
  color: string;
  demo?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex min-h-[78px] items-center rounded-sm border border-[#DCE4EE] bg-white px-2.5 py-2.5 shadow-[0_1px_4px_rgb(31_50_81/0.05)] transition-shadow hover:shadow-md">
      <div className="flex w-full items-center gap-2">
        <span className={cn("grid size-[30px] shrink-0 place-items-center rounded-sm", tint[color])}>
          <Icon className="size-[15px]" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-[11px] font-semibold leading-3 text-[#52617D]">
            {label}
            {demo && (
              <i className="shrink-0 rounded bg-[#EDF1F7] px-1 text-[9px] font-semibold not-italic text-[#7C89A2]">demo</i>
            )}
          </p>
          <div className="flex items-baseline gap-1">
            <b className="text-[19px] leading-[22px] tracking-[-0.02em] text-[#142044]">{loading ? "…" : value}</b>
            {trend && <span className="whitespace-nowrap text-[11px] font-semibold text-[#05A36D]">↑ {trend}</span>}
          </div>
          <p className="mt-0.5 truncate text-[11px] leading-3 text-[#7C89A2]">{note}</p>
        </div>
      </div>
    </div>
  );
}

function Box({
  title,
  subtitle,
  badge,
  action,
  onAction,
  filter,
  demo,
  empty,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: string;
  onAction?: () => void;
  filter?: string;
  demo?: boolean;
  empty?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-sm">
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b border-[#E8EDF3] px-2.5",
          subtitle || demo ? "h-[38px]" : "h-8",
        )}
      >
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-[12px] font-semibold leading-4 text-[#172044]">
            {title}
            {badge && (
              <i className="grid size-[15px] place-items-center rounded-sm bg-[#EB0711] text-[11px] font-semibold not-italic text-white">
                {badge}
              </i>
            )}
            {demo && (
              <i className="rounded bg-[#EDF1F7] px-1 text-[9px] font-semibold not-italic text-[#7C89A2]">demo data</i>
            )}
          </h2>
          {subtitle && <p className="truncate text-[11px] leading-3 text-[#7C89A2]">{subtitle}</p>}
        </div>
        {filter && (
          <button className="flex h-[22px] shrink-0 items-center gap-1 rounded-sm border border-[#DDE4ED] px-1.5 text-[11px] font-semibold text-[#425273]">
            {filter}
            <ChevronDown className="size-2.5" />
          </button>
        )}
        {action && (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#EB0711]"
          >
            {action} →
          </button>
        )}
      </header>
      {children}
      {empty && (
        <p className="px-3 py-6 text-center text-[11px] text-[#7C89A2]">{empty}</p>
      )}
    </section>
  );
}

/* ── panels ─────────────────────────────────────────────────────────────── */

function PerformanceOverview() {
  const legend = [
    ["Facebook Reach", "#1877F2"],
    ["Instagram Reach", "#E4405F"],
    ["Facebook Engagement", "#5DA9FF"],
    ["Instagram Engagement", "#F58EA8"],
  ] as const;
  return (
    <Box
      title="Performance Overview"
      subtitle="Reach and engagement are not exposed by the backend yet — illustrative series"
      filter="Last 30 days"
      demo
    >
      <div className="flex min-h-0 flex-1 flex-col px-2 pb-1">
        <div className="flex h-6 shrink-0 flex-wrap items-center gap-x-2.5 text-[11px] text-[#52617D]">
          {legend.map(([label, color]) => (
            <span key={label} className="flex items-center gap-1">
              <i className="size-1.5 rounded-sm" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer>
            <AreaChart data={performance} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="metaFbReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1877F2" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#1877F2" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="metaIgReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E4405F" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#E4405F" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E8EDF3" vertical />
              <XAxis dataKey="d" tick={{ fontSize: 11, fill: "#71809D" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#71809D" }}
                axisLine={false}
                tickLine={false}
                width={42}
                domain={[0, 40000]}
                ticks={[0, 10000, 20000, 30000, 40000]}
                tickFormatter={(value: number) => (value ? `${value / 1000}K` : "0")}
              />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #DDE4ED", padding: "4px 8px" }}
                formatter={(value) => Number(value).toLocaleString("en-IN")}
              />
              <Area
                dataKey="fbReach"
                name="Facebook Reach"
                stroke="#1877F2"
                strokeWidth={1.6}
                fill="url(#metaFbReach)"
                dot={{ r: 1.8, strokeWidth: 0, fill: "#1877F2" }}
                isAnimationActive={false}
              />
              <Area
                dataKey="igReach"
                name="Instagram Reach"
                stroke="#E4405F"
                strokeWidth={1.6}
                fill="url(#metaIgReach)"
                dot={{ r: 1.8, strokeWidth: 0, fill: "#E4405F" }}
                isAnimationActive={false}
              />
              <Area
                dataKey="fbEng"
                name="Facebook Engagement"
                stroke="#5DA9FF"
                strokeWidth={1.4}
                fill="transparent"
                dot={{ r: 1.6, strokeWidth: 0, fill: "#5DA9FF" }}
                isAnimationActive={false}
              />
              <Area
                dataKey="igEng"
                name="Instagram Engagement"
                stroke="#F58EA8"
                strokeWidth={1.4}
                fill="transparent"
                dot={{ r: 1.6, strokeWidth: 0, fill: "#F58EA8" }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Box>
  );
}

function ConnectedAccounts({
  rows,
  loading,
  onConnect,
  connecting,
}: {
  rows: AccountRow[];
  loading: boolean;
  onConnect: () => void;
  connecting: boolean;
}) {
  return (
    <Box
      title="Connected Accounts"
      action={rows.some((row) => row.connected) ? "Manage" : "Connect"}
      onAction={onConnect}
      subtitle="GET /integrations/overview"
    >
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col divide-y divide-[#EDF1F5] overflow-y-auto">
        {loading && <p className="px-3 py-6 text-[11px] text-[#7C89A2]">Loading connections…</p>}
        {!loading &&
          rows.map((account) => (
            <div key={account.id} className="flex flex-1 flex-col justify-center p-2">
              <div className="flex items-center gap-1.5">
                <ChannelLogo channel={account.channel} className="size-[26px] shadow-[0_1px_4px_rgb(31_50_81/0.14)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold leading-4 text-[#172044]">{account.name}</p>
                  <p className="truncate text-[11px] leading-3 text-[#7C89A2]">{account.type}</p>
                </div>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold",
                    account.reconnect
                      ? "bg-[#FFEAEC] text-[#EA1A26]"
                      : account.connected
                        ? "bg-[#E5F7EF] text-[#078359]"
                        : "bg-[#FFF1D8] text-[#B87600]",
                  )}
                >
                  {account.connected ? <BadgeCheck className="size-2.5" /> : <AlertTriangle className="size-2.5" />}
                  {account.reconnect ? "Reconnect" : account.connected ? "Connected" : "Setup"}
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-4 gap-1 text-center">
                {account.metrics.map(([value, label]) => (
                  <span key={label} className="min-w-0">
                    <b className="block truncate text-[11px] leading-4 text-[#172044]">{value}</b>
                    <small className="block truncate text-[11px] leading-3 text-[#7C89A2]">{label}</small>
                  </span>
                ))}
              </div>
            </div>
          ))}
        {!loading && rows.every((row) => !row.connected) && (
          <div className="p-2">
            <button
              onClick={onConnect}
              disabled={connecting}
              className="w-full rounded-sm border border-dashed border-[#C9D5E5] px-2 py-2 text-[11px] font-semibold text-[#1769DF] hover:bg-[#F5F9FF] disabled:opacity-60"
            >
              {connecting ? "Opening Meta…" : "Connect Facebook & Instagram"}
            </button>
          </div>
        )}
      </div>
    </Box>
  );
}

function NeedsAttention({ rows, loading }: { rows: AttentionRow[]; loading: boolean }) {
  return (
    <Box
      title="Needs Attention"
      badge={rows.length ? String(rows.length) : undefined}
      subtitle="Derived from connection health and publish failures"
      empty={!loading && rows.length === 0 ? "Nothing needs attention right now." : undefined}
    >
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col divide-y divide-[#EDF1F5] overflow-y-auto">
        {loading && <p className="px-3 py-6 text-[11px] text-[#7C89A2]">Checking status…</p>}
        {!loading &&
          rows.map(({ id, title, detail, tone, icon: Icon }) => (
            <div key={id} className="flex flex-1 items-center gap-2 px-2 py-[9px]">
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-sm",
                  tone === "amber" ? "bg-[#FFF0E2] text-[#F07800]" : "bg-[#FFEAEC] text-[#EA1A26]",
                )}
              >
                <Icon className="size-3" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold leading-4 text-[#1B2647]">{title}</p>
                <p className="truncate text-[11px] leading-3 text-[#7A87A0]">{detail}</p>
              </div>
            </div>
          ))}
      </div>
    </Box>
  );
}

const postCols = "grid-cols-[1.5fr_.42fr_.62fr_.72fr]";

function TopPosts({ rows, loading }: { rows: PostRow[]; loading: boolean }) {
  const router = useRouter();
  return (
    <Box
      title="Published Posts / Reels"
      subtitle="GET /content/scheduled-posts · status PUBLISHED"
      action="Open content"
      onAction={() => {
        router.push("/admin/content");
      }}
      empty={!loading && rows.length === 0 ? "No published posts yet for this Client." : undefined}
    >
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2">
        <div className={cn("sticky top-0 z-10 grid gap-1 bg-white py-1 text-[11px] text-[#7A87A0]", postCols)}>
          <span>Content</span>
          <span>Platform</span>
          <span>Type</span>
          <span>Published</span>
        </div>
        {loading && <p className="py-6 text-center text-[11px] text-[#7C89A2]">Loading published posts…</p>}
        {!loading &&
          rows.map((post) => (
            <div
              key={post.id}
              className={cn(
                "grid items-center gap-1 border-t border-[#EDF1F5] py-1.5 text-[11px] text-[#3B4A6B]",
                postCols,
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <ChannelLogo channel={post.platform} className="size-[22px] shrink-0 rounded shadow-sm" />
                <span className="min-w-0">
                  <b className="block truncate text-[#172044]">{post.title}</b>
                  {post.excerpt && <small className="block truncate text-[#8A97AF]">{post.excerpt}</small>}
                </span>
              </span>
              <ChannelLogo channel={post.platform} className="size-[15px]" />
              <span>{post.type}</span>
              <span className="text-[11px] text-[#71809D]">{post.published}</span>
            </div>
          ))}
      </div>
    </Box>
  );
}

const campaignCols = "grid-cols-[1.32fr_.8fr_.7fr_.42fr_.42fr_.72fr]";

function CampaignPerformance({ rows, loading }: { rows: CampaignRow[]; loading: boolean }) {
  const router = useRouter();
  return (
    <Box
      title="Campaign Performance"
      subtitle="GET /campaigns · spend and target KPIs from the backend"
      action="Open campaigns"
      onAction={() => {
        router.push("/admin/campaigns");
      }}
      empty={!loading && rows.length === 0 ? "No campaigns for this Client yet." : undefined}
    >
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2">
        <div className={cn("sticky top-0 z-10 grid gap-1 bg-white py-1 text-[11px] text-[#7A87A0]", campaignCols)}>
          <span>Campaign</span>
          <span>Objective</span>
          <span>Budget</span>
          <span>Leads</span>
          <span>CPL</span>
          <span>Status</span>
        </div>
        {loading && <p className="py-6 text-center text-[11px] text-[#7C89A2]">Loading campaigns…</p>}
        {!loading &&
          rows.map((campaign) => (
            <div
              key={campaign.id}
              className={cn(
                "grid items-center gap-1 border-t border-[#EDF1F5] py-1.5 text-[11px] text-[#3B4A6B]",
                campaignCols,
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <b className="truncate text-[#172044]">{campaign.name}</b>
              </span>
              <span className="truncate">{campaign.objective}</span>
              <b className="truncate text-[#172044]">{campaign.spend}</b>
              <span>{campaign.leads}</span>
              <span>{campaign.cpl}</span>
              <i
                className={cn(
                  "w-fit rounded px-1 py-0.5 text-[11px] font-semibold not-italic",
                  campaign.status === "ACTIVE"
                    ? "bg-[#E5F7EF] text-[#078359]"
                    : campaign.status === "PAUSED"
                      ? "bg-[#FFF1D8] text-[#B87600]"
                      : "bg-[#EAF2FF] text-[#286CB7]",
                )}
              >
                {campaign.status}
              </i>
            </div>
          ))}
      </div>
    </Box>
  );
}

const actionSkin: Record<string, string> = {
  rose: "border-[#FFDCE2] bg-[#FFF5F7] text-[#D8285F] hover:bg-[#FFECF1]",
  purple: "border-[#E7DAFB] bg-[#FAF6FF] text-[#7B3FE4] hover:bg-[#F2E9FF]",
  blue: "border-[#D6E7FC] bg-[#F5F9FF] text-[#1769D2] hover:bg-[#E8F1FF]",
  green: "border-[#CFEFE2] bg-[#F4FCF8] text-[#0A9E70] hover:bg-[#E4F8F0]",
  amber: "border-[#FBE5C0] bg-[#FFFBF3] text-[#DE8A00] hover:bg-[#FFF1D8]",
  slate: "border-[#DFE6F0] bg-[#F8FAFD] text-[#43567A] hover:bg-[#EDF1F7]",
};

function QuickActions({ onConnect, connecting }: { onConnect: () => void; connecting: boolean }) {
  const actions: Array<{ label: string; icon: typeof PenLine; color: string; href?: string; onClick?: () => void }> = [
    { label: "Connect Instagram", icon: Link2, color: "rose", onClick: onConnect },
    { label: "Create Post", icon: PenLine, color: "purple", href: "/admin/content" },
    { label: "Schedule Reel", icon: Video, color: "blue", href: "/admin/calendar" },
    { label: "Launch Campaign", icon: Rocket, color: "green", href: "/admin/campaigns/new" },
    { label: "View Leads", icon: UsersRound, color: "amber", href: "/admin/meta/ads/leads" },
    { label: "Open Calendar", icon: CalendarPlus, color: "slate", href: "/admin/calendar" },
  ];
  return (
    <Box title="Quick Actions">
      <div className="grid min-h-0 flex-1 grid-cols-2 content-between gap-2 p-2">
        {actions.map(({ label, icon: Icon, color, href, onClick }) => {
          const content = (
            <>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-sm", tint[color])}>
                <Icon className="size-3.5" />
              </span>
              {label}
            </>
          );
          const className = cn(
            "flex h-[44px] items-center gap-1.5 rounded-sm border px-1.5 text-left text-[11px] font-semibold leading-3 transition-colors disabled:opacity-60",
            actionSkin[color],
          );
          if (href) {
            return (
              <Link href={href} key={label} className={className}>
                {content}
              </Link>
            );
          }
          return (
            <button key={label} type="button" onClick={onClick} disabled={connecting && label === "Connect Instagram"} className={className}>
              {content}
            </button>
          );
        })}
      </div>
    </Box>
  );
}

function AudienceInsights() {
  return (
    <Box title="Audience Insights" subtitle="No backend route for follower demographics yet" filter="Last 30 days" demo>
      <div className="grid min-h-0 flex-1 grid-cols-[150px_1fr] items-center gap-2 px-2.5 pb-2">
        <div>
          <div className="relative mx-auto size-[140px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={gender}
                  dataKey="value"
                  innerRadius={42}
                  outerRadius={64}
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {gender.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 space-y-[3px] px-0.5 text-[11px] text-[#52617D]">
            {gender.map((slice) => (
              <span key={slice.name} className="flex items-center gap-1.5">
                <i className="size-2 shrink-0 rounded-sm" style={{ background: slice.color }} />
                <span className="flex-1">{slice.name}</span>
                <b className="text-[#172044]">{slice.value}%</b>
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0 self-start pt-1">
          <p className="mb-2 text-[11px] font-semibold text-[#172044]">Top Audience Locations</p>
          <div className="space-y-[9px]">
            {locations.map((location) => (
              <div
                key={location.name}
                className="grid grid-cols-[74px_1fr_26px] items-center gap-2 text-[11px]"
              >
                <span className="truncate text-[#52617D]">{location.name}</span>
                <span className="h-2 overflow-hidden rounded-sm bg-[#EDF1F7]">
                  <i
                    className="block h-full rounded-sm bg-[#3186F3]"
                    style={{ width: `${location.value}%` }}
                  />
                </span>
                <b className="text-right text-[#172044]">{location.value}%</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Box>
  );
}

const conversationCols = "grid-cols-[.85fr_.42fr_1.5fr_.7fr_.62fr]";

function Conversations() {
  return (
    <Box title="Recent Comments & Messages" subtitle="No inbox route in this backend version" demo>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2">
        <div className={cn("sticky top-0 z-10 grid gap-1 bg-white py-1 text-[11px] text-[#7A87A0]", conversationCols)}>
          <span>User</span>
          <span>Platform</span>
          <span>Message</span>
          <span>Time</span>
          <span>Type</span>
        </div>
        {conversations.map((item, index) => (
          <div
            key={item.user}
            className={cn(
              "grid items-center gap-1 border-t border-[#EDF1F5] py-[7px] text-[11px] text-[#3B4A6B]",
              conversationCols,
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <i
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-sm text-[11px] font-semibold not-italic",
                  [
                    "bg-[#FFECF1] text-[#D8285F]",
                    "bg-[#E7F0FF] text-[#3478DB]",
                    "bg-[#EEE7FF] text-[#8357DC]",
                    "bg-[#FFF0DC] text-[#F28C28]",
                    "bg-[#DDF8E9] text-[#16A16C]",
                  ][index],
                )}
              >
                {item.user.charAt(0)}
              </i>
              <b className="truncate text-[#172044]">{item.user}</b>
            </span>
            <ChannelLogo channel={item.platform} className="size-[15px]" />
            <span className="truncate">{item.message}</span>
            <span className="truncate text-[11px] text-[#71809D]">{item.time}</span>
            <i
              className={cn(
                "w-fit rounded px-1 py-0.5 text-[11px] font-semibold not-italic",
                item.type === "Comment" ? "bg-[#E5F7EF] text-[#078359]" : "bg-[#EAF2FF] text-[#286CB7]",
              )}
            >
              {item.type}
            </i>
          </div>
        ))}
      </div>
    </Box>
  );
}

const scheduledCols = "grid-cols-[1.5fr_.5fr_.66fr_.9fr]";

function ScheduledContent({ rows, loading }: { rows: ScheduledRow[]; loading: boolean }) {
  const router = useRouter();
  return (
    <Box
      title="Scheduled Content"
      subtitle="GET /content/scheduled-posts · status SCHEDULED"
      action="Open calendar"
      onAction={() => {
        router.push("/admin/calendar");
      }}
      empty={!loading && rows.length === 0 ? "Nothing scheduled for this Client." : undefined}
    >
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2">
        <div className={cn("sticky top-0 z-10 grid gap-1 bg-white py-1 text-[11px] text-[#7A87A0]", scheduledCols)}>
          <span>Content</span>
          <span>Platform</span>
          <span>Type</span>
          <span>Schedule</span>
        </div>
        {loading && <p className="py-6 text-center text-[11px] text-[#7C89A2]">Loading schedule…</p>}
        {!loading &&
          rows.map((item) => (
            <div
              key={item.id}
              className={cn(
                "grid items-center gap-1 border-t border-[#EDF1F5] py-1.5 text-[11px] text-[#3B4A6B]",
                scheduledCols,
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <ChannelLogo channel={item.platform} className="size-[22px] shrink-0 rounded shadow-sm" />
                <b className="truncate text-[#172044]">{item.title}</b>
              </span>
              <ChannelLogo channel={item.platform} className="size-[15px]" />
              <span>{item.type}</span>
              <span className="text-[11px] leading-3 text-[#62718E]">
                {item.date}
                <br />
                {item.time}
              </span>
            </div>
          ))}
      </div>
    </Box>
  );
}
