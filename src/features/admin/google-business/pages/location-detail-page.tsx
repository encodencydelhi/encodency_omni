"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Activity,
  ChevronRight,
  Clock3,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  RefreshCw,
  SquarePen,
  Star,
  Store,
  TrendingUp,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Sparkline } from "../components/charts";
import { IssueRow, ProfileHealthDrawer, ScoreRing, UploadMediaDialog, downloadCsv } from "../components/dialogs";
import { CapabilityState } from "../components/states";
import {
  ActionMenu,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  DefinitionRow,
  EmptyState,
  InternalBadge,
  Notice,
  Stars,
  Thumb,
  UnderlineTabs,
  ViewLink,
  buttonClass,
  gb,
  tdClass,
  thClass,
  type MenuItem,
} from "../components/ui";
import { useAttention, useMetrics, usePeriod, useProfileHealth, useQueryState, useWithContext } from "../data/hooks";
import { MediaWorkspace } from "./media-page";
import { PerformanceWorkspace } from "./performance-page";
import { PostsWorkspace } from "./posts-page";
import { ProfileEditor } from "./profile-page";
import { ReviewsWorkspace } from "./reviews-page";
import { METRICS, MEDIA_CATEGORY_LABEL, POST_STATE_LABEL, VERIFICATION_LABEL, gbRoutes } from "../lib/constants";
import { compact, date as fmtDate, dateTime, formatAddress, rating as fmtRating, relative, summarizeHours } from "../lib/format";
import { useGbp } from "../store/gbp-store";
import type { Location } from "../types";
import { POST_TONE } from "./posts-page";

const TABS = [
  { value: "overview", label: "Overview", icon: Store },
  { value: "profile", label: "Profile", icon: SquarePen },
  { value: "reviews", label: "Reviews", icon: MessageSquare },
  { value: "posts", label: "Posts", icon: Upload },
  { value: "media", label: "Media", icon: ImageIcon },
  { value: "performance", label: "Performance", icon: TrendingUp },
  { value: "activity", label: "Activity", icon: Activity },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const DEFAULTS = { tab: "overview" };

export function LocationDetailPage() {
  const params = useParams<{ locationId: string }>();
  const { locations, status, reviews, posts, media } = useGbp();
  const { values, set } = useQueryState(DEFAULTS);

  if (status !== "ready") return null;

  const location = locations.find((item) => item.locationId === params?.locationId) ?? null;

  if (!location) {
    return (
      <Card>
        <EmptyState
          icon={MapPin}
          title="Location not found"
          description="This location is not on the connected Google Business account, or it is no longer managed here."
          action={
            <Button variant="primary" href={gbRoutes.locations}>
              Back to locations
            </Button>
          }
        />
      </Card>
    );
  }

  const tab = (TABS.some((item) => item.value === values.tab) ? values.tab : "overview") as TabValue;
  const counts = {
    reviews: reviews.filter((review) => review.locationId === location.locationId && !review.reply).length,
    posts: posts.filter((post) => post.locationIds.includes(location.locationId) && post.state !== "published").length,
    media: media.filter((item) => item.locationId === location.locationId).length,
  };

  return (
    <div className="space-y-1">
      <LocationHeader location={location} />
      <Card className="px-3 pt-1">
        <UnderlineTabs<TabValue>
          label="Location sections"
          value={tab}
          onChange={(value) => set({ tab: value })}
          items={TABS.map((item) => ({
            value: item.value,
            label: item.label,
            icon: item.icon,
            count: item.value === "reviews" ? counts.reviews || undefined : item.value === "posts" ? counts.posts || undefined : item.value === "media" ? counts.media : undefined,
          }))}
        />
      </Card>

      {tab === "overview" && <LocationOverview location={location} onOpenTab={(value) => set({ tab: value })} />}
      {tab === "profile" && <ProfileEditor key={location.locationId} location={location} />}
      {tab === "reviews" && <ReviewsWorkspace lockedLocationId={location.locationId} />}
      {tab === "posts" && <PostsWorkspace lockedLocationId={location.locationId} />}
      {tab === "media" && <MediaWorkspace lockedLocationId={location.locationId} />}
      {tab === "performance" && <PerformanceWorkspace lockedLocationId={location.locationId} />}
      {tab === "activity" && <LocationActivity location={location} />}
    </div>
  );
}

function LocationHeader({ location }: { location: Location }) {
  const { capabilitiesFor, syncLocations, setLocationManaged } = useGbp();
  const withContext = useWithContext();
  const can = capabilitiesFor(location.locationId);
  const [syncing, setSyncing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const menu: (MenuItem | "separator")[] = [
    { label: "Upload media", icon: Upload, onSelect: () => setUploadOpen(true), gate: can.canManageMedia },
    { label: "Create post", icon: SquarePen, href: withContext(`${gbRoutes.postCreate}?location=${location.locationId}`), gate: can.canCreatePosts },
    { label: "View performance", icon: TrendingUp, href: `${gbRoutes.location(location.locationId)}?tab=performance`, gate: can.canViewPerformance },
    "separator",
    { label: "Copy location ID", icon: Store, onSelect: () => void navigator.clipboard?.writeText(location.locationId) },
    { label: "Open on Google Maps", icon: ExternalLink, href: gbRoutes.mapsSearch(location.placeId), external: true },
    { label: "Business Profile Manager", icon: ExternalLink, href: gbRoutes.businessProfileManager, external: true },
    "separator",
    {
      label: location.managed ? "Stop managing here" : "Manage in OmniPlatform",
      icon: Store,
      danger: location.managed,
      gate: can.canManageLocations,
      onSelect: () => void setLocationManaged(location.locationId, !location.managed),
    },
  ];

  return (
    <div className="space-y-2">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] text-[#5F6368]">
        <Link href={gbRoutes.overview} className={cn("rounded hover:text-[#1A73E8]", gb.focus)}>
          Google Business
        </Link>
        <ChevronRight className="size-3 text-[#BDC1C6]" />
        <Link href={gbRoutes.locations} className={cn("rounded hover:text-[#1A73E8]", gb.focus)}>
          Locations
        </Link>
        <ChevronRight className="size-3 text-[#BDC1C6]" />
        <span className="truncate text-[#202124]" aria-current="page">
          {location.profile.title}
        </span>
      </nav>

      <Card className="p-4">
        <div className="flex flex-wrap items-start gap-1">
          <div className="min-w-[260px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[20px] font-medium leading-6 text-[#202124]">{location.profile.title}</h1>
              <Badge tone={location.verification === "verified" ? "green" : location.verification === "pending" ? "amber" : "red"}>
                {VERIFICATION_LABEL[location.verification]}
              </Badge>
              {location.openState !== "open" && (
                <Badge tone={location.openState === "closed_permanently" ? "red" : "amber"}>
                  {location.openState === "closed_permanently" ? "Permanently closed" : "Temporarily closed"}
                </Badge>
              )}
              {!location.managed && <Badge tone="neutral">Not managed here</Badge>}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[#5F6368]">
              <span>{formatAddress(location.profile.address)}</span>
              <span aria-hidden>&middot;</span>
              <span>Store code {location.storeCode}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#3C4043]">
              <span className="flex items-center gap-1.5">
                <Stars rating={location.rating ?? 0} size={13} />
                <span className="font-medium tabular-nums text-[#202124]">{fmtRating(location.rating)}</span>
                <span className="text-[#5F6368]">({compact(location.reviewCount)} reviews)</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#5F6368]">
                <ImageIcon className="size-3.5" /> {compact(location.photoCount)} photos
              </span>
              <span className="flex items-center gap-1.5 text-[#5F6368]">
                <RefreshCw className={cn("size-3.5", location.sync.state === "failed" && "text-[#C5221F]")} />
                {location.sync.state === "failed"
                  ? "Last sync failed"
                  : location.sync.lastSyncedAt
                    ? `Synced ${relative(location.sync.lastSyncedAt)}`
                    : "Never synced"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={RefreshCw}
              loading={syncing || location.sync.state === "syncing"}
              gate={can.canSyncLocations}
              onClick={async () => {
                setSyncing(true);
                await syncLocations([location.locationId]);
                setSyncing(false);
              }}
            >
              Sync
            </Button>
            <Button variant="secondary" icon={ExternalLink} href={gbRoutes.mapsSearch(location.placeId)} external>
              View on Google
            </Button>
            <Button variant="primary" icon={SquarePen} gate={can.canEditProfile} href={`${gbRoutes.location(location.locationId)}?tab=profile`}>
              Edit profile
            </Button>
            <ActionMenu
              label="More location actions"
              items={menu}
              trigger={
                <button type="button" className={buttonClass("secondary", "icon")} aria-label="More location actions">
                  <MoreHorizontal className="size-4" />
                </button>
              }
            />
          </div>
        </div>

        {location.sync.state === "failed" && location.sync.error && (
          <Notice tone="red" className="mt-3" title="Last sync failed">
            {location.sync.error} Data below is from {location.sync.lastSyncedAt ? relative(location.sync.lastSyncedAt) : "the last successful sync"}.
          </Notice>
        )}
        {location.verification === "pending" && (
          <Notice tone="amber" className="mt-3" title="Verification in progress">
            Google is still verifying this location. Posts, replies and profile edits cannot be published until verification completes.
          </Notice>
        )}
        {location.verification === "duplicate" && (
          <Notice tone="amber" className="mt-3" title="Google flagged a possible duplicate">
            Resolve the duplicate in Business Profile Manager before editing this listing.
          </Notice>
        )}
      </Card>
      <UploadMediaDialog open={uploadOpen} onOpenChange={setUploadOpen} defaultLocationId={location.locationId} />
    </div>
  );
}

function LocationOverview({ location, onOpenTab }: { location: Location; onOpenTab: (tab: TabValue) => void }) {
  const { reviews, posts, media, categories, capabilitiesFor } = useGbp();
  const { period, days, label: periodLabel } = usePeriod();
  const can = capabilitiesFor(location.locationId);
  const ids = useMemo(() => [location.locationId], [location.locationId]);
  const metrics = useMetrics(ids, period);
  const health = useProfileHealth(location.locationId);
  const issues = useAttention(location.locationId);
  const [healthOpen, setHealthOpen] = useState(false);

  const locationReviews = useMemo(
    () => reviews.filter((review) => review.locationId === location.locationId).sort((a, b) => b.createTime.localeCompare(a.createTime)),
    [reviews, location.locationId],
  );
  const locationPosts = useMemo(
    () => posts.filter((post) => post.locationIds.includes(location.locationId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [posts, location.locationId],
  );
  const locationMedia = useMemo(() => media.filter((item) => item.locationId === location.locationId).slice(0, 6), [media, location.locationId]);
  const primaryCategory = categories.find((category) => category.categoryId === location.profile.primaryCategoryId);
  const hoursLines = summarizeHours(location.profile.regularHours);

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        {(["searchImpressions", "mapsImpressions", "callClicks", "directionRequests"] as const).map((key) => {
          const meta = METRICS[key];
          const value = metrics.total(key);
          const spark = metrics.spark(key);
          return (
            <Card key={key} className="p-3.5">
              <p className="truncate text-[12px] text-[#5F6368]" title={meta.help}>
                {meta.label}
              </p>
              {can.canViewPerformance.allowed ? (
                <>
                  <p className="mt-1 text-[20px] font-medium tabular-nums leading-6 text-[#202124]">{compact(value)}</p>
                  <div className="mt-2 h-8">
                    <Sparkline data={spark} color={meta.color} />
                  </div>
                  <p className="mt-1 text-[11px] text-[#80868B]">{periodLabel}</p>
                </>
              ) : (
                <p className="mt-2 text-[12px] text-[#5F6368]">{can.canViewPerformance.reason}</p>
              )}
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-1">
          <Card>
            <CardHeader
              title="Business information"
              icon={Store}
              actions={
                <Button size="sm" variant="secondary" icon={SquarePen} gate={can.canEditProfile} onClick={() => onOpenTab("profile")}>
                  Edit
                </Button>
              }
              className="border-b border-[#F1F3F4] pb-3"
            />
            <div className="grid gap-x-6 px-4 py-2 sm:grid-cols-2">
              <dl>
                <DefinitionRow label="Category">{primaryCategory?.displayName ?? "Not set"}</DefinitionRow>
                <DefinitionRow label="Phone">
                  {location.profile.phone ? (
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-3.5 text-[#80868B]" />
                      {location.profile.phone}
                    </span>
                  ) : (
                    <span className="text-[#C5221F]">Missing</span>
                  )}
                </DefinitionRow>
                <DefinitionRow label="Website">
                  {location.profile.website ? (
                    <a href={location.profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[#1A73E8] hover:underline">
                      <Globe className="size-3.5" />
                      <span className="truncate">{location.profile.website.replace(/^https?:\/\//, "")}</span>
                    </a>
                  ) : (
                    <span className="text-[#C5221F]">Missing</span>
                  )}
                </DefinitionRow>
                <DefinitionRow label="Opened">{location.profile.openingDate ? fmtDate(location.profile.openingDate) : "Not set"}</DefinitionRow>
              </dl>
              <dl>
                <DefinitionRow label="Address">{location.profile.serviceArea ? "Service area business" : formatAddress(location.profile.address)}</DefinitionRow>
                <DefinitionRow label="Hours">
                  {hoursLines.length ? (
                    <span className="flex flex-col gap-0.5">
                      {hoursLines.map((line) => (
                        <span key={line} className="flex items-center gap-1.5">
                          <Clock3 className="size-3.5 shrink-0 text-[#80868B]" />
                          {line}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-[#C5221F]">No hours set</span>
                  )}
                </DefinitionRow>
                <DefinitionRow label="Special hours">
                  {location.profile.specialHours.length ? `${location.profile.specialHours.length} upcoming` : "None"}
                </DefinitionRow>
                <DefinitionRow label="Location ID" mono>
                  {location.locationId}
                </DefinitionRow>
              </dl>
            </div>
            {location.profile.description ? (
              <p className="border-t border-[#F1F3F4] px-4 py-3 text-[12.5px] leading-5 text-[#3C4043]">{location.profile.description}</p>
            ) : (
              <p className="border-t border-[#F1F3F4] px-4 py-3 text-[12.5px] text-[#5F6368]">
                No business description yet.{" "}
                <button type="button" className={cn("rounded font-medium text-[#1A73E8] hover:underline", gb.focus)} onClick={() => onOpenTab("profile")}>
                  Add one
                </button>
              </p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Recent reviews"
              icon={MessageSquare}
              description={`${locationReviews.filter((review) => !review.reply).length} awaiting a reply`}
              actions={<ViewLink href={`${gbRoutes.location(location.locationId)}?tab=reviews`}>View all</ViewLink>}
              className="border-b border-[#F1F3F4] pb-3"
            />
            {!can.canReadReviews.allowed ? (
              <CapabilityState capability={can.canReadReviews} compact />
            ) : locationReviews.length === 0 ? (
              <EmptyState icon={Star} title="No reviews yet" description="Reviews customers leave on Google will appear here." />
            ) : (
              <ul className="divide-y divide-[#F1F3F4]">
                {locationReviews.slice(0, 4).map((review) => (
                  <li key={review.reviewId} className="flex gap-1 px-4 py-3">
                    <Avatar name={review.reviewer.displayName} src={review.reviewer.profilePhotoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-[#202124]">{review.reviewer.displayName}</span>
                        <Stars rating={review.starRating} size={12} />
                        <span className="text-[11.5px] text-[#80868B]">{relative(review.createTime)}</span>
                        {!review.reply && <Badge tone="amber">Needs reply</Badge>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-[#3C4043]">{review.comment || "No comment left."}</p>
                    </div>
                    <Link
                      href={`${gbRoutes.location(location.locationId)}?tab=reviews&review=${review.reviewId}`}
                      className={cn(buttonClass("ghost", "sm"), "shrink-0 self-start")}
                    >
                      {review.reply ? "View" : "Reply"}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Recent posts"
              icon={SquarePen}
              actions={<ViewLink href={`${gbRoutes.location(location.locationId)}?tab=posts`}>View all</ViewLink>}
              className="border-b border-[#F1F3F4] pb-3"
            />
            {locationPosts.length === 0 ? (
              <EmptyState
                icon={SquarePen}
                title="No posts for this location"
                description="Posts appear on your Business Profile in Search and Maps for seven days."
                action={
                  <Button variant="primary" gate={can.canCreatePosts} href={`${gbRoutes.postCreate}?location=${location.locationId}`}>
                    Create a post
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-[#F1F3F4]">
                {locationPosts.slice(0, 4).map((post) => (
                  <li key={post.id} className="flex items-center gap-1 px-4 py-2.5">
                    {post.media[0] ? <Thumb src={post.media[0]} className="size-10 shrink-0" /> : <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#F1F3F4]"><SquarePen className="size-4 text-[#80868B]" /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-[#202124]">{post.summary}</p>
                      <p className="text-[11.5px] text-[#5F6368]">
                        {relative(post.publishedAt ?? post.scheduledAt ?? post.createdAt)} &middot; {post.type}
                      </p>
                    </div>
                    <Badge tone={POST_TONE[post.state]}>{POST_STATE_LABEL[post.state]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-1">
          <Card>
            <CardHeader
              title="Profile health"
              icon={Store}
              badge={<InternalBadge label="OmniPlatform score" hint="Calculated by OmniPlatform from your Google profile data. Google does not publish a profile score." />}
              className="border-b border-[#F1F3F4] pb-3"
            />
            <div className="flex items-center gap-1 px-4 py-4">
              <ScoreRing score={health?.score ?? 0} size={84} />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-5 text-[#3C4043]">
                  {(health?.factors ?? []).filter((factor) => factor.status !== "good").length} of {health?.factors.length ?? 0} checks need attention.
                </p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => setHealthOpen(true)}>
                  View breakdown
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Needs attention" icon={Activity} badge={<InternalBadge />} className="border-b border-[#F1F3F4] pb-3" />
            {issues.length === 0 ? (
              <EmptyState icon={Store} title="Nothing to fix" description="This location has no open issues." />
            ) : (
              <ul className="divide-y divide-[#F1F3F4]">
                {issues.slice(0, 6).map((issue) => (
                  <IssueRow key={issue.id} issue={issue} />
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Photos"
              icon={ImageIcon}
              description={`${location.photoCount} on Google`}
              actions={<ViewLink href={`${gbRoutes.location(location.locationId)}?tab=media`}>View all</ViewLink>}
              className="border-b border-[#F1F3F4] pb-3"
            />
            {locationMedia.length === 0 ? (
              <EmptyState icon={ImageIcon} title="No photos" description="Locations with photos get more direction requests." />
            ) : (
              <div className="grid grid-cols-3 gap-1 p-3">
                {locationMedia.map((item) => (
                  <Thumb key={item.mediaId} src={item.thumbnailUrl} className="aspect-square w-full" alt={MEDIA_CATEGORY_LABEL[item.category]} />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Sync status" icon={RefreshCw} className="border-b border-[#F1F3F4] pb-3" />
            <dl className="px-4 py-2">
              <DefinitionRow label="State">
                <Badge tone={location.sync.state === "synced" ? "green" : location.sync.state === "failed" ? "red" : location.sync.state === "syncing" ? "blue" : "neutral"}>
                  {location.sync.state === "synced" ? "Synced" : location.sync.state === "failed" ? "Failed" : location.sync.state === "syncing" ? "Syncing" : "Never synced"}
                </Badge>
              </DefinitionRow>
              <DefinitionRow label="Last synced">{location.sync.lastSyncedAt ? dateTime(location.sync.lastSyncedAt) : "Never"}</DefinitionRow>
              <DefinitionRow label="Managed here">{location.managed ? "Yes" : "No - read only"}</DefinitionRow>
              <DefinitionRow label="Labels">
                {location.labels.length ? (
                  <span className="flex flex-wrap gap-1">
                    {location.labels.map((tag) => (
                      <Badge key={tag} tone="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  "None"
                )}
              </DefinitionRow>
            </dl>
          </Card>
        </div>
      </div>

      <ProfileHealthDrawer open={healthOpen} onOpenChange={setHealthOpen} locationId={location.locationId} />
      <span className="sr-only" aria-live="polite">
        Showing {days} days of performance for {location.profile.title}
      </span>
    </div>
  );
}

function LocationActivity({ location }: { location: Location }) {
  const { activity } = useGbp();
  const [limit, setLimit] = useState(15);
  const rows = useMemo(
    () => activity.filter((event) => event.locationId === location.locationId || event.entity.id === location.locationId),
    [activity, location.locationId],
  );

  return (
    <Card>
      <CardHeader
        title="Activity"
        icon={Activity}
        badge={<InternalBadge label="OmniPlatform" />}
        description="Changes made to this location through OmniPlatform, plus what Google sync reported."
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              downloadCsv(
                [
                  ["Time", "User", "Action", "Entity", "Previous", "New", "Source"],
                  ...rows.map((event) => [event.at, event.actor, event.summary, event.entity.label, event.previous ?? "", event.next ?? "", event.source]),
                ],
                `${location.storeCode}-activity.csv`,
              )
            }
          >
            Export
          </Button>
        }
        className="border-b border-[#F1F3F4] pb-3"
      />
      {rows.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" description="Edits, replies, posts and syncs for this location will be listed here." />
      ) : (
        <>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr>
                  <th className={cn(thClass, "static pl-4")}>When</th>
                  <th className={cn(thClass, "static")}>User</th>
                  <th className={cn(thClass, "static")}>Action</th>
                  <th className={cn(thClass, "static")}>Change</th>
                  <th className={cn(thClass, "static pr-4")}>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((event) => (
                  <tr key={event.id} className="hover:bg-[#F8F9FA]">
                    <td className={cn(tdClass, "pl-4 text-[12px]")} title={dateTime(event.at)}>
                      {relative(event.at)}
                    </td>
                    <td className={tdClass}>
                      <span className="flex items-center gap-2">
                        <Avatar name={event.actor} className="size-6 text-[9px]" />
                        {event.actor}
                      </span>
                    </td>
                    <td className={cn(tdClass, "font-medium text-[#202124]")}>{event.summary}</td>
                    <td className={cn(tdClass, "max-w-[220px] text-[12px]")}>
                      {event.previous || event.next ? (
                        <span className="block truncate" title={`${event.previous ?? "-"} to ${event.next ?? "-"}`}>
                          <span className="text-[#80868B] line-through">{event.previous ?? "-"}</span> <span className="text-[#202124]">{event.next ?? "-"}</span>
                        </span>
                      ) : (
                        <span className="text-[#80868B]">-</span>
                      )}
                    </td>
                    <td className={cn(tdClass, "pr-4")}>
                      <Badge tone={event.source === "OmniPlatform" ? "violet" : "neutral"}>{event.source}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > limit && (
            <div className="border-t border-[#F1F3F4] p-3 text-center">
              <Button size="sm" variant="secondary" onClick={() => setLimit((value) => value + 15)}>
                Show more ({rows.length - limit} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
