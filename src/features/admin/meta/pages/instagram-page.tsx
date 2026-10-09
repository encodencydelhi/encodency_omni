"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FaInstagram } from "react-icons/fa6";
import { ArrowUpRight, CalendarClock, Film, Heart, Images, Link2, MessageCircle, Plus, UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { btn, btnPrimary, card, EmptyState, FilterBar, FilterSelect, PagedFooter, SearchInput, TableShell, Td, Th, Tr } from "@/features/admin/meta-ads/components/ui";
import { usePagination } from "@/features/admin/meta-ads/use-filters";
import { useMeta } from "../connection-context";
import { MapResourceDialog } from "../components/connection-dialogs";
import { ScheduledPostsTable } from "../components/scheduled-posts";
import { messageOf, needsMetaLogin, useInstagramMedia, useInstagramProfile, useSocialOverview } from "../live/meta-hooks";
import type { InstagramMedia, SocialPage } from "../live/meta-social-api";
import { Avatar, AssetSwitcher, ConnectionGate, CursorPager, DetailDialog, InlineNotice, KeyValue, META_ROOT, MetaShell, Pill, Section, Stat, Thumb, useCursorPager } from "../ui";

const count = (value: number | null) => (value === null ? "—" : value.toLocaleString("en-IN"));
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

/** Reels are VIDEO media with product type REELS; keep them apart from ordinary videos. */
function kindOf(media: InstagramMedia): string {
  if (media.product === "REELS") return "Reel";
  if (media.type === "VIDEO") return "Video";
  if (media.type === "CAROUSEL_ALBUM") return "Carousel";
  if (media.type === "IMAGE") return "Photo";
  return "Post";
}

type TabId = "media" | "scheduled" | "about";
const TABS: { id: TabId; label: string; icon: typeof Images }[] = [
  { id: "media", label: "Posts & Reels", icon: Images },
  { id: "scheduled", label: "Scheduled", icon: CalendarClock },
  { id: "about", label: "About", icon: UserRound },
];

export function InstagramWorkspacePage() {
  return (
    <MetaShell title="Instagram" subtitle="Your professional accounts, their posts and reels, and what is scheduled." mark={<FaInstagram className="m-1 size-6 text-[#d946ef]" aria-hidden="true" />}>
      <ConnectionGate>
        <Workspace />
      </ConnectionGate>
    </MetaShell>
  );
}

function Workspace() {
  const meta = useMeta();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const social = useSocialOverview(meta.companyId, meta.state === "connected");
  const [mapOpen, setMapOpen] = useState(false);

  const pages = useMemo(() => social.data?.pages ?? [], [social.data]);
  const accounts = useMemo(() => pages.filter((page): page is SocialPage & { instagram: NonNullable<SocialPage["instagram"]> } => page.instagram !== null), [pages]);
  const linkedIds = useMemo(() => new Set((meta.instagram?.resources ?? []).filter((resource) => resource.resourceType === "INSTAGRAM_ACCOUNT").map((resource) => resource.externalResourceId)), [meta.instagram]);

  const selectedId = params?.get("account") ?? null;
  const selected = accounts.find((account) => account.instagram.id === selectedId) ?? accounts.find((account) => linkedIds.has(account.instagram.id)) ?? accounts[0] ?? null;
  const tab = (TABS.find((t) => t.id === params?.get("tab"))?.id ?? "media") as TabId;

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params?.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  if (social.isLoading) return <div className="h-64 animate-pulse rounded-sm border border-slate-200 bg-white" role="status" aria-label="Loading Instagram accounts" />;
  if (social.isError) {
    return (
      <InlineNotice tone={needsMetaLogin(social.error) ? "amber" : "red"} title="Instagram accounts could not be loaded" action={<button type="button" className={btn} onClick={() => void social.refetch()}>Try again</button>}>
        {messageOf(social.error, "Meta did not answer. Try again in a moment.")}
      </InlineNotice>
    );
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        <Stat label="Instagram accounts" value={accounts.length} sub="Linked to a managed Page" icon={FaInstagram} tone={accounts.length === 0 ? "amber" : undefined} />
        <Stat label="Linked to this Client" value={linkedIds.size} sub="Used for publishing" icon={Link2} />
        <Stat label="Followers" value={count(accounts.reduce<number | null>((sum, account) => (account.instagram.followers === null ? sum : (sum ?? 0) + account.instagram.followers), null))} sub="Across accounts" icon={UserRound} />
        <Stat label="Facebook Pages" value={pages.length} sub="Instagram is reached through its Page" icon={Images} />
      </div>

      {accounts.length === 0 ? (
        <NoAccounts pagesCount={pages.length} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AssetSwitcher
              label="Account"
              items={accounts.map((account) => ({ id: account.instagram.id, name: `@${account.instagram.username ?? account.instagram.id}`, detail: `via ${account.name}`, pictureUrl: account.instagram.pictureUrl, linked: linkedIds.has(account.instagram.id) }))}
              selectedId={selected?.instagram.id ?? null}
              onSelect={(id) => go({ account: id, tab: null })}
            />
            <button type="button" className={btnPrimary} onClick={() => setMapOpen(true)}>
              <Plus className="size-4" />
              Link an account
            </button>
          </div>

          {selected && <AccountDetail account={selected} tab={tab} linked={linkedIds.has(selected.instagram.id)} onTab={(next) => go({ tab: next })} onLink={() => setMapOpen(true)} />}

          {accounts.length > 1 && <AllAccountsTable accounts={accounts} linkedIds={linkedIds} selectedId={selected?.instagram.id ?? null} onSelect={(id) => go({ account: id, tab: null })} />}
        </>
      )}

      <MapResourceDialog open={mapOpen} onOpenChange={setMapOpen} kind="INSTAGRAM_ACCOUNT" />
    </div>
  );
}

function AllAccountsTable({ accounts, linkedIds, selectedId, onSelect }: { accounts: Array<SocialPage & { instagram: NonNullable<SocialPage["instagram"]> }>; linkedIds: Set<string>; selectedId: string | null; onSelect: (id: string) => void }) {
  const paged = usePagination(accounts, 6);
  return (
    <Section title="All Instagram accounts" description="Every professional account reachable through the Pages this login manages." flush>
      <TableShell minWidth={640}>
        <thead>
          <tr>
            <Th>Account</Th>
            <Th>Connected Page</Th>
            <Th numeric>Followers</Th>
            <Th>Access</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {paged.visible.map((account) => (
            <Tr key={account.instagram.id}>
              <Td>
                <span className="flex items-center gap-2.5">
                  <Avatar src={account.instagram.pictureUrl} name={account.instagram.username ?? account.instagram.id} size={30} />
                  <span className="min-w-0">
                    <span className="block max-w-[200px] truncate font-semibold text-slate-900">@{account.instagram.username ?? account.instagram.id}</span>
                    <span className="block text-[10px] font-medium text-slate-500">ID {account.instagram.id}</span>
                  </span>
                </span>
              </Td>
              <Td>{account.name}</Td>
              <Td numeric>{count(account.instagram.followers)}</Td>
              <Td>{linkedIds.has(account.instagram.id) ? <Pill tone="green">Linked</Pill> : <Pill>Not linked</Pill>}</Td>
              <Td>
                <button type="button" onClick={() => onSelect(account.instagram.id)} className={btn} disabled={selectedId === account.instagram.id}>
                  {selectedId === account.instagram.id ? "Viewing" : "Open"}
                </button>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>
      <PagedFooter paged={paged} noun="accounts" />
    </Section>
  );
}

function NoAccounts({ pagesCount }: { pagesCount: number }) {
  const meta = useMeta();
  return (
    <Section title="No Instagram account available" description={pagesCount === 0 ? "Instagram is reached through a Facebook Page, and this login manages none." : "None of your Pages has an Instagram professional account linked."}>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <ol className="list-decimal space-y-1.5 pl-4 text-xs font-medium leading-relaxed text-slate-700">
          {pagesCount === 0 ? (
            <li>First give this login access to the Facebook Page (see the Facebook tab) — Instagram accounts are read through their Page.</li>
          ) : (
            <li>In Instagram → Settings → Account type, switch the account to <strong>Professional</strong> (Business or Creator).</li>
          )}
          <li>Link the Instagram account to the Facebook Page (Page settings → Linked accounts).</li>
          <li>Reconnect Meta and tick the Instagram account in Meta&apos;s permission dialog.</li>
        </ol>
        <div className="flex flex-col items-start justify-center gap-2 rounded-sm border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-900">Done? Reconnect to pick it up.</p>
          <button type="button" className={btnPrimary} onClick={() => void meta.connect()} disabled={meta.busy === "connect"}>
            <FaInstagram className="size-3.5" />
            Reconnect Meta
          </button>
          <Link href={`${META_ROOT}/facebook`} className={btn}>
            Open Facebook
          </Link>
        </div>
      </div>
    </Section>
  );
}

function AccountDetail({ account, tab, linked, onTab, onLink }: { account: SocialPage & { instagram: NonNullable<SocialPage["instagram"]> }; tab: TabId; linked: boolean; onTab: (tab: TabId) => void; onLink: () => void }) {
  const meta = useMeta();
  const profile = useInstagramProfile(meta.companyId, account.instagram.id);
  const data = profile.data;
  const name = data?.username ?? account.instagram.username ?? account.instagram.id;

  return (
    <section className={cn(card, "overflow-hidden")}>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3.5">
        <Avatar src={data?.pictureUrl ?? account.instagram.pictureUrl} name={name} size={52} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-slate-900">@{name}</h2>
          <p className="truncate text-[11px] font-medium text-slate-500">
            {data?.name ?? account.instagram.name ?? "Instagram professional account"} · ID {account.instagram.id}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-600">
            {count(data?.followers ?? account.instagram.followers)} followers · {count(data?.following ?? null)} following · {count(data?.mediaCount ?? null)} posts
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {linked ? (
            <Pill tone="green" className="h-8 px-3">Linked to this Client</Pill>
          ) : (
            <button type="button" className={btn} onClick={onLink}>
              <Link2 className="size-3.5" />
              Link to this Client
            </button>
          )}
          <a href={`https://www.instagram.com/${name}/`} target="_blank" rel="noopener noreferrer" className={btn}>
            Open on Instagram
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>

      <div className="border-b border-slate-200 px-2" role="tablist" aria-label="Account sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => onTab(id)} className={cn("-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition", tab === id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-600 hover:text-slate-900")}>
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "media" && <MediaTab instagramId={account.instagram.id} username={name} />}
      {tab === "scheduled" && <ScheduledPostsTable channel="INSTAGRAM_ACCOUNT" targetId={account.instagram.id} />}
      {tab === "about" && (
        <div className="p-4">
          {profile.isError && <InlineNotice tone="amber" title="Profile details could not be loaded">{messageOf(profile.error, "Meta did not answer.")}</InlineNotice>}
          <dl className={cn("grid gap-x-8 lg:grid-cols-2", profile.isError && "mt-4")}>
            <div>
              <KeyValue label="Username">@{name}</KeyValue>
              <KeyValue label="Name">{data?.name ?? account.instagram.name ?? "—"}</KeyValue>
              <KeyValue label="Account ID">{account.instagram.id}</KeyValue>
              <KeyValue label="Connected Page">{account.name}</KeyValue>
              <KeyValue label="Linked to this Client">{linked ? "Yes" : "No"}</KeyValue>
            </div>
            <div>
              <KeyValue label="Followers">{count(data?.followers ?? account.instagram.followers)}</KeyValue>
              <KeyValue label="Following">{count(data?.following ?? null)}</KeyValue>
              <KeyValue label="Posts">{count(data?.mediaCount ?? null)}</KeyValue>
              <KeyValue label="Website">{data?.website ? <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">{data.website}</a> : "—"}</KeyValue>
              <KeyValue label="Bio">{data?.biography ?? "—"}</KeyValue>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}

const SORTS = ["Newest first", "Most likes", "Most comments"] as const;

function MediaTab({ instagramId, username }: { instagramId: string; username: string }) {
  const meta = useMeta();
  const feed = useInstagramMedia(meta.companyId, instagramId);
  const [kind, setKind] = useState("All types");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Newest first");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const kinds = useMemo(() => ["All types", ...Array.from(new Set(feed.items.map(kindOf)))], [feed.items]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = feed.items.filter((item) => (kind === "All types" || kindOf(item) === kind) && (!q || (item.caption ?? "").toLowerCase().includes(q)));
    const by = (key: "likes" | "comments") => (a: InstagramMedia, b: InstagramMedia) => (b[key] ?? -1) - (a[key] ?? -1);
    if (sort === "Most likes") list.sort(by("likes"));
    if (sort === "Most comments") list.sort(by("comments"));
    return list;
  }, [feed.items, kind, sort, search]);
  const pager = useCursorPager(rows, 12, feed, `${instagramId}|${kind}|${sort}|${search}`);
  const open = feed.items.find((item) => item.id === openId) ?? null;
  const filtered = kind !== "All types" || sort !== "Newest first" || search !== "";

  if (feed.isLoading) return <div className="h-48 animate-pulse bg-slate-50" role="status" aria-label="Loading posts" />;
  if (feed.isError) {
    return (
      <div className="p-4">
        <InlineNotice tone="amber" title="Posts could not be loaded" action={<button type="button" className={btn} onClick={() => void feed.reload()}>Try again</button>}>
          {messageOf(feed.error, "Meta did not answer.")}
        </InlineNotice>
      </div>
    );
  }

  return (
    <>
      {feed.items.length > 0 && (
        <FilterBar>
          <FilterSelect label="Type" value={kind} onChange={setKind} options={kinds} minWidth={150} />
          <FilterSelect label="Sort" value={sort} onChange={(value) => setSort(value as (typeof SORTS)[number])} options={[...SORTS]} minWidth={160} />
          <SearchInput placeholder="Search captions…" value={search} onChange={setSearch} />
          {filtered && (
            <button
              type="button"
              className={btn}
              onClick={() => {
                setKind("All types");
                setSort("Newest first");
                setSearch("");
              }}
            >
              Clear
            </button>
          )}
        </FilterBar>
      )}
      {rows.length === 0 ? (
        <EmptyState icon={Images} title={filtered ? "No posts match these filters" : "No posts yet"} description={filtered ? "Try another type or clear the search. Only posts loaded so far are searched; use Next to load more." : "This account has not published any media Meta can return."} compact />
      ) : (
        <ul className="grid grid-cols-2 gap-1 p-1 md:grid-cols-3 xl:grid-cols-4">
          {pager.visible.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => setOpenId(item.id)} className="group block w-full overflow-hidden rounded-sm border border-slate-200 bg-white text-left transition hover:border-blue-300 hover:shadow-md">
                <div className="relative">
                  <Thumb src={item.imageUrl} alt={item.caption ?? "Instagram post"} className="aspect-square w-full" />
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-sm bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {kindOf(item) === "Reel" || kindOf(item) === "Video" ? <Film className="size-3" /> : <Images className="size-3" />}
                    {kindOf(item)}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 min-h-8 text-[11.5px] font-medium leading-snug text-slate-800">{item.caption ?? "(no caption)"}</p>
                  <p className="mt-1.5 flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                    <span className="inline-flex items-center gap-1"><Heart className="size-3" />{count(item.likes)}</span>
                    <span className="inline-flex items-center gap-1"><MessageCircle className="size-3" />{count(item.comments)}</span>
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <CursorPager page={pager.page} pageCount={pager.pageCount} from={pager.from} to={pager.to} loaded={pager.loaded} hasMore={pager.hasMore} loadingMore={pager.loadingMore} noun="posts" onPrevious={pager.previous} onNext={pager.next} />

      <DetailDialog
        open={Boolean(open)}
        onOpenChange={(next) => !next && setOpenId(null)}
        title={open ? `${kindOf(open)} by @${username}` : "Post"}
        description={open ? when(open.postedAt) : undefined}
        wide
        footer={
          open && (
            <>
              {open.permalink && (
                <a href={open.permalink} target="_blank" rel="noopener noreferrer" className={btn}>
                  Open on Instagram
                  <ArrowUpRight className="size-3.5" />
                </a>
              )}
              <button type="button" className={btnPrimary} onClick={() => setOpenId(null)}>
                Close
              </button>
            </>
          )
        }
      >
        {open && (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,260px)_1fr]">
            <Thumb src={open.imageUrl} alt={open.caption ?? "Instagram post"} className="aspect-square w-full rounded-sm border border-slate-200" />
            <div className="space-y-3">
              <p className="whitespace-pre-wrap text-xs font-medium leading-relaxed text-slate-800">{open.caption ?? "(no caption)"}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-sm border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <Heart className="mx-auto size-3.5 text-slate-500" />
                  <div className="mt-1 text-sm font-semibold text-slate-900">{count(open.likes)}</div>
                  <div className="text-[10px] font-semibold text-slate-500">Likes</div>
                </div>
                <div className="rounded-sm border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <MessageCircle className="mx-auto size-3.5 text-slate-500" />
                  <div className="mt-1 text-sm font-semibold text-slate-900">{count(open.comments)}</div>
                  <div className="text-[10px] font-semibold text-slate-500">Comments</div>
                </div>
              </div>
              <dl>
                <KeyValue label="Type">{kindOf(open)}</KeyValue>
                <KeyValue label="Posted">{when(open.postedAt)}</KeyValue>
                <KeyValue label="Media ID">{open.id}</KeyValue>
              </dl>
            </div>
          </div>
        )}
      </DetailDialog>
    </>
  );
}
