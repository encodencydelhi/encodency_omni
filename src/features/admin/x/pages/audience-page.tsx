"use client";

import { useMemo, useState } from "react";
import {
  AtSign,
  ExternalLink,
  Filter,
  Globe2,
  Heart,
  MapPin,
  NotebookPen,
  Tag,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useHydrated } from "../hooks/use-now";
import { usePeriod, useQueryState } from "../hooks/use-query-state";
import { xRoutes } from "../lib/constants";
import { compact, date, percent, relative, signed } from "../lib/format";
import { useX } from "../store/x-store";
import type { AudienceMember } from "../x-data/types";
import { ActivityHeatmap, BarList, Donut, FollowerGrowthChart, LegendList, PALETTE, BubbleMap } from "../components/charts";
import { PeriodSegmented } from "../components/date-range";
import { CapabilityState, PageSkeleton } from "../components/states";
import {
  ActionMenu,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  DefinitionRow,
  EmptyState,
  FormField,
  InternalBadge,
  SearchField,
  SelectMenu,
  SourceBadge,
  TagInput,
  UnderlineTabs,
  VerifiedMark,
  buttonClass,
  useDebounced,
  x,
} from "../components/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DEFAULTS = { tab: "recent", q: "", follower: "all", location: "all", engagement: "all" };

type ListTab = "recent" | "engaging" | "mentioners";

export function AudiencePage() {
  const { ready, can } = useX();
  if (!ready) return <PageSkeleton />;
  if (!can.canReadAudience.allowed) {
    return (
      <Card>
        <CapabilityState capability={can.canReadAudience} title="Audience data unavailable" />
      </Card>
    );
  }
  return <Audience />;
}

function Audience() {
  const { account, audience, settings } = useX();
  const { days, label } = usePeriod();

  const series = useMemo(() => audience.followerSeries.slice(-days), [audience.followerSeries, days]);
  const previousSeries = useMemo(() => audience.followerSeries.slice(-days * 2, -days), [audience.followerSeries, days]);

  const gained = series.reduce((sum, point) => sum + point.gained, 0);
  const lost = series.reduce((sum, point) => sum + point.lost, 0);
  const net = gained - lost;
  const previousNet = previousSeries.reduce((sum, point) => sum + point.gained - point.lost, 0);

  const ratio = account.following ? account.followers / account.following : null;

  return (
    <div className="space-y-1">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        <SimpleKpi label="Followers" value={compact(account.followers)} detail="Total accounts following you" source />
        <SimpleKpi
          label="Follower growth"
          value={signed(net)}
          detail={`${compact(gained)} gained · ${compact(lost)} lost`}
          tone={net >= 0 ? "green" : "red"}
          delta={previousNet ? ((net - previousNet) / Math.abs(previousNet)) * 100 : null}
          source
        />
        <SimpleKpi label="Following" value={compact(account.following)} detail="Accounts this profile follows" source />
        <SimpleKpi
          label="Follower / following"
          value={ratio === null ? "—" : `${ratio.toFixed(1)}×`}
          detail="Higher means a stronger inbound pull"
          internal
        />
        <SimpleKpi
          label="Profile visits"
          value={compact(audience.profileVisits)}
          detail={`vs ${compact(audience.previousProfileVisits)} previous period`}
          delta={audience.previousProfileVisits ? ((audience.profileVisits - audience.previousProfileVisits) / audience.previousProfileVisits) * 100 : null}
          source
        />
        <SimpleKpi
          label="Engaged followers"
          value={compact(audience.engagedFollowers)}
          detail={`${percent((audience.engagedFollowers / Math.max(account.followers, 1)) * 100, 1)} of your followers`}
          delta={audience.previousEngagedFollowers ? ((audience.engagedFollowers - audience.previousEngagedFollowers) / audience.previousEngagedFollowers) * 100 : null}
          internal
        />
      </div>

      {/* Growth */}
      <div className="grid gap-1 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader
            title="Follower growth"
            description={label}
            badge={<SourceBadge />}
            icon={TrendingUp}
            actions={<PeriodSegmented />}
          />
          <div className="px-4 pb-4">
            <FollowerGrowthChart data={series} height={248} />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#6B7890]">
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-sm bg-[#12B76A]" />
                New followers
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-sm bg-[#F0A9AE]" />
                Unfollows
              </span>
              <span className="ml-auto">
                Net for this period: <b className={cn("font-semibold tabular-nums", net >= 0 ? "text-[#067647]" : "text-[#C81E2B]")}>{signed(net)}</b>
              </span>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader
            title="Who engages with you"
            description="Followers versus everyone else"
            badge={<SourceBadge />}
            icon={Heart}
          />
          <div className="flex flex-wrap items-center gap-5 px-4 pb-4">
            <Donut
              data={audience.followerSplit}
              centerValue={`${audience.followerSplit[0]?.value.toFixed(0) ?? 0}%`}
              centerLabel="from followers"
              colors={["#2563EB", "#C9D1DC"]}
            />
            <div className="min-w-[140px] flex-1">
              <LegendList data={audience.followerSplit} colors={["#2563EB", "#C9D1DC"]} />
              <p className="mt-3 rounded-sm border border-[#E2D8FD] bg-[#F9F7FF] px-2.5 py-2 text-[11.5px] leading-4 text-[#3C4A66]">
                <b className="font-semibold text-[#6D28D9]">OmniPlatform insight.</b>{" "}
                {(audience.followerSplit[1]?.value ?? 0) > 30
                  ? "A healthy share of engagement comes from outside your followers — your posts are travelling beyond the timeline."
                  : "Most engagement comes from existing followers. Posts with a broader hook could widen the reach."}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity */}
      <div className="grid gap-1 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader
            title="When your audience is active"
            description="Relative activity by day and hour"
            badge={<SourceBadge hint="Derived from when your audience engages, as reported by X." />}
          />
          <div className="px-4 pb-4">
            <ActivityHeatmap matrix={audience.activity} timezone={settings.publishing.timezone} />
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader title="Engagement by day" description="Average engagement rate" badge={<SourceBadge />} />
          <div className="px-4 pb-4">
            <BarList data={audience.byDay} format={(value) => `${value.toFixed(1)}%`} />
          </div>
        </Card>
      </div>

      {/* Geography */}
      {audience.geography && audience.geography.length > 0 && (
        <Card>
          <CardHeader title="Where your followers are" description="Top countries by follower count" icon={Globe2} badge={<SourceBadge />} />
          <div className="grid gap-4 px-4 pb-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <BubbleMap rows={audience.geography} metric="followers" />
            <ul className="space-y-1.5">
              {audience.geography.map((row, index) => (
                <li key={row.code} className="flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[12.5px] hover:bg-[#F8FAFC]">
                  <i className="size-2 shrink-0 rounded-sm" style={{ background: PALETTE[index % PALETTE.length] }} />
                  <span className="min-w-0 flex-1 truncate text-[#3C4A66]">{row.country}</span>
                  <b className="shrink-0 font-semibold tabular-nums text-[#0F1B3D]">{compact(row.followers)}</b>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      <AccountLists />
    </div>
  );
}

function SimpleKpi({
  label,
  value,
  detail,
  tone,
  delta,
  source,
  internal,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "green" | "red";
  delta?: number | null;
  source?: boolean;
  internal?: boolean;
}) {
  return (
    <div className={cn(x.card, "p-3.5")}>
      <p className="flex items-center justify-between gap-2 text-[12px] font-medium text-[#6B7890]">
        <span className="truncate">{label}</span>
        {internal ? <InternalBadge label="Internal" hint="Calculated by OmniPlatform from data X provides." /> : source ? <SourceBadge /> : null}
      </p>
      <p className={cn("mt-1.5 text-[21px] font-semibold leading-7 tracking-[-0.02em] tabular-nums", tone === "green" ? "text-[#067647]" : tone === "red" ? "text-[#C81E2B]" : "text-[#0F1B3D]")}>
        {value}
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 truncate text-[11.5px] text-[#98A2B3]">
        {delta !== null && delta !== undefined && Number.isFinite(delta) && (
          <span className={cn("font-semibold tabular-nums", delta >= 0 ? "text-[#067647]" : "text-[#C81E2B]")}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        <span className="truncate">{detail}</span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Account lists                                                       */
/* ------------------------------------------------------------------ */

function AccountLists() {
  const { audience } = useX();
  const { values, set, reset } = useQueryState(useMemo(() => DEFAULTS, []));
  const { value: search, pending } = useDebounced(values.q, 220);
  const [detail, setDetail] = useState<AudienceMember | null>(null);

  const tab = values.tab as ListTab;
  const source = tab === "recent" ? audience.recentFollowers : tab === "engaging" ? audience.topEngaging : audience.frequentMentioners;

  const locations = useMemo(
    () => [...new Set([...audience.recentFollowers, ...audience.topEngaging, ...audience.frequentMentioners].map((member) => member.location))].sort(),
    [audience],
  );

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return source.filter((member) => {
      if (needle && !`${member.name} ${member.handle} ${member.bio}`.toLowerCase().includes(needle)) return false;
      if (values.follower === "followers" && !member.isFollower) return false;
      if (values.follower === "non_followers" && member.isFollower) return false;
      if (values.location !== "all" && member.location !== values.location) return false;
      if (values.engagement === "engaged" && member.engagements < 5) return false;
      if (values.engagement === "quiet" && member.engagements >= 5) return false;
      return true;
    });
  }, [source, search, values]);

  const activeFilters = (values.q ? 1 : 0) + (values.follower !== "all" ? 1 : 0) + (values.location !== "all" ? 1 : 0) + (values.engagement !== "all" ? 1 : 0);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[#E4E9F0] px-3 pt-2">
        <UnderlineTabs
          label="Audience lists"
          value={tab}
          onChange={(value) => set({ tab: value })}
          items={[
            { value: "recent" as ListTab, label: "Recent followers", count: audience.recentFollowers.length, icon: UserPlus },
            { value: "engaging" as ListTab, label: "Top engaging accounts", count: audience.topEngaging.length, icon: Heart },
            { value: "mentioners" as ListTab, label: "Most frequent mentions", count: audience.frequentMentioners.length, icon: AtSign },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#EEF1F5] px-3 py-2.5">
        <SearchField
          value={values.q}
          onChange={(value) => set({ q: value })}
          loading={pending}
          placeholder="Search accounts"
          className="min-w-[180px] flex-1 sm:max-w-[260px]"
        />
        <SelectMenu
          label="Follower status"
          prefix="Status:"
          value={values.follower}
          onChange={(value) => set({ follower: value })}
          options={[
            { value: "all", label: "Everyone" },
            { value: "followers", label: "Follows you" },
            { value: "non_followers", label: "Doesn't follow you" },
          ]}
        />
        <SelectMenu
          label="Engagement"
          prefix="Engagement:"
          value={values.engagement}
          onChange={(value) => set({ engagement: value })}
          options={[
            { value: "all", label: "Any" },
            { value: "engaged", label: "5+ interactions" },
            { value: "quiet", label: "Fewer than 5" },
          ]}
        />
        <SelectMenu
          label="Location"
          prefix="Location:"
          value={values.location}
          onChange={(value) => set({ location: value })}
          options={[{ value: "all", label: "Anywhere" }, ...locations.map((location) => ({ value: location, label: location }))]}
        />
        {activeFilters > 0 && (
          <Button size="sm" variant="ghost" icon={Filter} onClick={() => reset(["tab"])}>
            Clear filters ({activeFilters})
          </Button>
        )}
        <span className="ml-auto flex items-center gap-2 text-[11.5px] text-[#98A2B3]">
          <InternalBadge label="Tags, notes & lists are internal" hint="Tags, notes, owners and lists live in OmniPlatform. Nothing is written back to X." />
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={activeFilters ? "No accounts match these filters" : "No accounts in this list yet"}
          description={
            activeFilters
              ? "Try a different search term, or clear the filters to see the whole list."
              : "As people follow, engage with and mention this account, they appear here."
          }
          action={activeFilters ? <Button variant="primary" onClick={() => reset(["tab"])}>Clear filters</Button> : undefined}
        />
      ) : (
        <ul className="divide-y divide-[#EEF1F5]">
          {rows.map((member) => (
            <MemberRow key={member.id} member={member} tab={tab} onOpen={() => setDetail(member)} />
          ))}
        </ul>
      )}

      <MemberDialog member={detail} open={detail !== null} onOpenChange={(open) => !open && setDetail(null)} />
    </Card>
  );
}

function MemberRow({ member, tab, onOpen }: { member: AudienceMember; tab: ListTab; onOpen: () => void }) {
  const { audienceMeta, memberName } = useX();
  const hydrated = useHydrated();
  const meta = audienceMeta(member.handle);

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFBFD]">
      <Avatar name={member.name} src={member.avatarUrl} className="size-9" />

      <div className="min-w-[180px] flex-1">
        <p className="flex flex-wrap items-center gap-x-1.5 text-[12.5px]">
          <b className="truncate font-semibold text-[#0F1B3D]">{member.name}</b>
          <VerifiedMark kind={member.verified} className="[&_svg]:size-3.5" />
          <span className="truncate text-[#6B7890]">{member.handle}</span>
          {member.isFollower && <Badge tone="blue">Follows you</Badge>}
        </p>
        {member.bio && <p className="mt-0.5 line-clamp-1 text-[11.5px] text-[#6B7890]">{member.bio}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#98A2B3]">
          <span>{compact(member.followers)} followers</span>
          {member.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {member.location}
            </span>
          )}
          {tab === "recent" && member.followedAt && <span>Followed {hydrated ? relative(member.followedAt) : "…"}</span>}
          {meta.ownerId && <span className="text-[#6D28D9]">Owner: {memberName(meta.ownerId)}</span>}
        </p>
        {(meta.internalTags.length > 0 || meta.lists.length > 0) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-1">
            {meta.internalTags.map((tag) => (
              <Badge key={tag} tone="violet">
                {tag}
              </Badge>
            ))}
            {meta.lists.map((list) => (
              <Badge key={list} tone="neutral">
                {list}
              </Badge>
            ))}
          </p>
        )}
      </div>

      <dl className="flex shrink-0 items-center gap-4">
        <div className="text-right">
          <dt className="text-[10.5px] uppercase tracking-[0.03em] text-[#98A2B3]">Interactions</dt>
          <dd className="text-[12.5px] font-semibold tabular-nums text-[#0F1B3D]">{compact(member.engagements)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-[10.5px] uppercase tracking-[0.03em] text-[#98A2B3]">Mentions</dt>
          <dd className="text-[12.5px] font-semibold tabular-nums text-[#0F1B3D]">{compact(member.mentions)}</dd>
        </div>
      </dl>

      <div className="flex shrink-0 items-center gap-1">
        <Button size="xs" variant="secondary" onClick={onOpen}>
          Manage
        </Button>
        <ActionMenu
          label={`Actions for ${member.handle}`}
          width={220}
          items={[
            { label: "View profile on X", icon: ExternalLink, href: xRoutes.userOnX(member.handle), external: true },
            { label: "Add internal tag", icon: Tag, onSelect: onOpen },
            { label: "Add a note", icon: NotebookPen, onSelect: onOpen },
            { label: "Assign an owner", icon: UserPlus, onSelect: onOpen },
            { label: "Add to internal list", icon: Users, onSelect: onOpen },
            "separator",
            { label: "Find their mentions", icon: AtSign, href: `${xRoutes.mentions}?q=${encodeURIComponent(member.handle)}` },
          ]}
          trigger={
            <button type="button" className={buttonClass("ghost", "iconSm")}>
              <span aria-hidden="true" className="text-[14px] font-bold leading-none tracking-[0.08em]">
                ⋯
              </span>
            </button>
          }
        />
      </div>
    </li>
  );
}

const INTERNAL_LISTS = ["Press", "Partners", "Donors", "Volunteers", "Watchlist"];

function MemberDialog({ member, open, onOpenChange }: { member: AudienceMember | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { audienceMeta, updateAudienceMeta, team } = useX();
  const existing = member ? audienceMeta(member.handle) : null;
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [owner, setOwner] = useState("");
  const [lists, setLists] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Load the member's saved metadata the first time the dialog opens for them.
  if (member && loadedFor !== member.handle && existing) {
    setLoadedFor(member.handle);
    setTags(existing.internalTags);
    setNote(existing.note);
    setOwner(existing.ownerId ?? "");
    setLists(existing.lists);
  }

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[500px] gap-0 p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="flex items-center gap-2 text-[15px] text-[#0F1B3D]">
            {member.name}
            <VerifiedMark kind={member.verified} className="[&_svg]:size-3.5" />
            <InternalBadge hint="These fields are private to your workspace and never sent to X." />
          </DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] text-[#3C4A66]">
            {member.handle} · {compact(member.followers)} followers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 pt-4">
          <dl className="rounded-sm border border-[#E4E9F0] px-3 py-1">
            <DefinitionRow label="Follows you">{member.isFollower ? "Yes" : "No"}</DefinitionRow>
            <DefinitionRow label="Location">{member.location || "Not set"}</DefinitionRow>
            <DefinitionRow label="Interactions">{compact(member.engagements)}</DefinitionRow>
            {member.followedAt && <DefinitionRow label="Following since">{date(member.followedAt)}</DefinitionRow>}
          </dl>

          <FormField label="Internal tags" hint="Used to segment and filter the audience inside OmniPlatform.">
            <TagInput value={tags} onChange={setTags} placeholder="Add a tag and press Enter" />
          </FormField>

          <FormField label="Internal list">
            <div className="flex flex-wrap gap-1.5">
              {INTERNAL_LISTS.map((list) => {
                const selected = lists.includes(list);
                return (
                  <button
                    key={list}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLists((current) => (selected ? current.filter((item) => item !== list) : [...current, list]))}
                    className={cn(
                      "h-7 rounded-sm border px-2.5 text-[12px] font-medium transition",
                      selected ? "border-[#2563EB] bg-[#EFF4FF] text-[#1D4ED8]" : "border-[#DCE2EA] bg-white text-[#3C4A66] hover:border-[#C9D1DC]",
                      x.focus,
                    )}
                  >
                    {list}
                  </button>
                );
              })}
            </div>
          </FormField>

          <FormField label="Owner" hint="The person on your team responsible for this relationship.">
            <SelectMenu
              label="Owner"
              fullWidth
              size="md"
              value={owner}
              onChange={setOwner}
              placeholder="Unassigned"
              options={[{ value: "", label: "Unassigned" }, ...team.map((item) => ({ value: item.id, label: item.name, description: item.role }))]}
            />
          </FormField>

          <FormField label="Note">
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Context your team should know…" className={x.textarea} />
          </FormField>
        </div>

        <DialogFooter className="mt-4 border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" href={xRoutes.userOnX(member.handle)} external icon={ExternalLink}>
            View on X
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await updateAudienceMeta(
                member.handle,
                { internalTags: tags, note, ownerId: owner || null, lists },
                `Updated internal details for ${member.handle}`,
              );
              setBusy(false);
              if (ok) onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
