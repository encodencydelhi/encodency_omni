"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FaFacebookF } from "react-icons/fa6";
import { ArrowUpRight, CalendarClock, Link2, MessageCircle, Newspaper, Plus, Share2, ThumbsUp, UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { btn, btnPrimary, card, EmptyState, FilterBar, FilterSelect, PagedFooter, SearchInput, TableShell, Td, Th, Tr } from "@/features/admin/meta-ads/components/ui";
import { usePagination } from "@/features/admin/meta-ads/use-filters";
import { useMeta } from "../connection-context";
import { MapResourceDialog } from "../components/connection-dialogs";
import { ScheduledPostsTable } from "../components/scheduled-posts";
import { messageOf, needsMetaLogin, usePagePosts, useSocialOverview } from "../live/meta-hooks";
import type { SocialPage, SocialPost } from "../live/meta-social-api";
import { Avatar, AssetSwitcher, ConnectionGate, CursorPager, DetailDialog, InlineNotice, KeyValue, META_ROOT, MetaShell, Pill, Section, Stat, Thumb, useCursorPager } from "../ui";

const count = (value: number | null) => (value === null ? "—" : value.toLocaleString("en-IN"));
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const typeLabel = (value: string | null) => (value ? value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "Post");

const TASK_LABEL: Record<string, string> = {
  ADVERTISE: "Run ads",
  ANALYZE: "See insights",
  CREATE_CONTENT: "Publish content",
  MANAGE: "Manage the Page",
  MESSAGING: "Reply to messages",
  MODERATE: "Moderate comments",
};

type TabId = "posts" | "scheduled" | "about";
const TABS: { id: TabId; label: string; icon: typeof Newspaper }[] = [
  { id: "posts", label: "Posts", icon: Newspaper },
  { id: "scheduled", label: "Scheduled", icon: CalendarClock },
  { id: "about", label: "About", icon: UserRound },
];

export function FacebookWorkspacePage() {
  return (
    <MetaShell title="Facebook" subtitle="Your Pages, their posts and what is scheduled." mark={<FaFacebookF className="m-1 size-6 text-[#1877f2]" aria-hidden="true" />}>
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
  const unmanaged = social.data?.unmanagedPages ?? [];
  const linkedIds = useMemo(() => new Set((meta.meta?.resources ?? []).filter((resource) => resource.resourceType === "FACEBOOK_PAGE").map((resource) => resource.externalResourceId)), [meta.meta]);

  const selectedId = params?.get("page") ?? null;
  const selected = pages.find((page) => page.id === selectedId) ?? pages.find((page) => linkedIds.has(page.id)) ?? pages[0] ?? null;
  const tab = (TABS.find((t) => t.id === params?.get("tab"))?.id ?? "posts") as TabId;

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params?.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  if (social.isLoading) return <div className="h-64 animate-pulse rounded-sm border border-slate-200 bg-white" role="status" aria-label="Loading Facebook Pages" />;
  if (social.isError) {
    return (
      <InlineNotice tone={needsMetaLogin(social.error) ? "amber" : "red"} title="Facebook Pages could not be loaded" action={<button type="button" className={btn} onClick={() => void social.refetch()}>Try again</button>}>
        {messageOf(social.error, "Meta did not answer. Try again in a moment.")}
      </InlineNotice>
    );
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        <Stat label="Managed Pages" value={pages.length} sub="Pages this login can act on" icon={FaFacebookF} tone={pages.length === 0 ? "amber" : undefined} />
        <Stat label="Linked to this Client" value={linkedIds.size} sub="Used for publishing" icon={Link2} />
        <Stat label="Followers" value={count(pages.reduce<number | null>((sum, page) => (page.followers === null ? sum : (sum ?? 0) + page.followers), null))} sub="Across managed Pages" icon={UserRound} />
        <Stat label="Can publish" value={pages.filter((page) => page.canPublish).length} sub="Pages with content access" icon={Share2} />
      </div>

      {pages.length === 0 ? (
        <NoPages unmanaged={unmanaged} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AssetSwitcher
              label="Page"
              items={pages.map((page) => ({ id: page.id, name: page.name, detail: page.category, pictureUrl: page.pictureUrl, linked: linkedIds.has(page.id) }))}
              selectedId={selected?.id ?? null}
              onSelect={(id) => go({ page: id, tab: null })}
            />
            <button type="button" className={btnPrimary} onClick={() => setMapOpen(true)}>
              <Plus className="size-4" />
              Link a Page
            </button>
          </div>

          {unmanaged.length > 0 && (
            <InlineNotice tone="blue" title={`${unmanaged.length} more Page${unmanaged.length === 1 ? "" : "s"} used by your ad accounts, but this login has no role on ${unmanaged.length === 1 ? "it" : "them"}`} action={<Link href={`${META_ROOT}/settings#pages`} className={btn}>How to fix</Link>}>
              {unmanaged.map((page) => page.name).join(", ")}
            </InlineNotice>
          )}

          {selected && (
            <PageDetail page={selected} tab={tab} linked={linkedIds.has(selected.id)} onTab={(next) => go({ tab: next })} onLink={() => setMapOpen(true)} />
          )}

          {pages.length > 1 && <AllPagesTable pages={pages} linkedIds={linkedIds} selectedId={selected?.id ?? null} onSelect={(id) => go({ page: id, tab: null })} />}
        </>
      )}

      <MapResourceDialog open={mapOpen} onOpenChange={setMapOpen} kind="FACEBOOK_PAGE" />
    </div>
  );
}

function NoPages({ unmanaged }: { unmanaged: Array<{ id: string; name: string; adAccountIds: string[] }> }) {
  const meta = useMeta();
  return (
    <Section title="No Facebook Page available" description="Meta returned no Page for this login." flush={false}>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3 text-xs font-medium leading-relaxed text-slate-700">
          <p>
            Connecting worked and the permissions are granted, but Meta lists only Pages the logged-in person has a <strong>role on</strong>. This login has none, so there is nothing to read or publish yet.
          </p>
          {unmanaged.length > 0 && (
            <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="font-semibold">Seen through your ad accounts, but not accessible:</p>
              <ul className="mt-1 list-disc pl-4">
                {unmanaged.map((page) => (
                  <li key={page.id}>
                    {page.name} <span className="text-amber-700">(ID {page.id})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ol className="list-decimal space-y-1.5 pl-4">
            <li>In Meta Business Settings → Pages, add this Facebook profile to the Page with full control (or make it an admin of the Page).</li>
            <li>Back here, open Settings and choose Reconnect.</li>
            <li>In Meta&apos;s permission dialog, tick the Page and its linked Instagram account, then save.</li>
            <li>If the Page belongs to a Business portfolio, also enable <code className="rounded bg-slate-100 px-1">business_management</code> (see Settings).</li>
          </ol>
        </div>
        <div className="flex flex-col items-start justify-center gap-2 rounded-sm border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-900">Ready? Reconnect and select the Page.</p>
          <button type="button" className={btnPrimary} onClick={() => void meta.connect()} disabled={meta.busy === "connect"}>
            <FaFacebookF className="size-3.5" />
            Reconnect Meta
          </button>
          <Link href={`${META_ROOT}/settings#pages`} className={btn}>
            Open settings
          </Link>
        </div>
      </div>
    </Section>
  );
}

function AllPagesTable({ pages, linkedIds, selectedId, onSelect }: { pages: SocialPage[]; linkedIds: Set<string>; selectedId: string | null; onSelect: (id: string) => void }) {
  const paged = usePagination(pages, 6);
  return (
    <Section title="All Pages" description="Every Page this Meta login manages." flush>
      <TableShell minWidth={720}>
        <thead>
          <tr>
            <Th>Page</Th>
            <Th>Category</Th>
            <Th numeric>Followers</Th>
            <Th numeric>Likes</Th>
            <Th>Access</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {paged.visible.map((page) => (
            <Tr key={page.id}>
              <Td>
                <span className="flex items-center gap-2.5">
                  <Avatar src={page.pictureUrl} name={page.name} size={30} />
                  <span className="min-w-0">
                    <span className="block max-w-[220px] truncate font-semibold text-slate-900">{page.name}</span>
                    <span className="block text-[10px] font-medium text-slate-500">ID {page.id}</span>
                  </span>
                </span>
              </Td>
              <Td>{page.category ?? "—"}</Td>
              <Td numeric>{count(page.followers)}</Td>
              <Td numeric>{count(page.likes)}</Td>
              <Td>
                <span className="flex flex-wrap gap-1">
                  {linkedIds.has(page.id) ? <Pill tone="green">Linked</Pill> : <Pill>Not linked</Pill>}
                  {page.canPublish ? <Pill tone="blue">Can publish</Pill> : <Pill tone="amber">Read only</Pill>}
                  {page.instagram && <Pill tone="violet">@{page.instagram.username ?? "instagram"}</Pill>}
                </span>
              </Td>
              <Td>
                <button type="button" onClick={() => onSelect(page.id)} className={btn} disabled={selectedId === page.id}>
                  {selectedId === page.id ? "Viewing" : "Open"}
                </button>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>
      <PagedFooter paged={paged} noun="Pages" />
    </Section>
  );
}

function PageDetail({ page, tab, linked, onTab, onLink }: { page: SocialPage; tab: TabId; linked: boolean; onTab: (tab: TabId) => void; onLink: () => void }) {
  return (
    <section className={cn(card, "overflow-hidden")}>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3.5">
        <Avatar src={page.pictureUrl} name={page.name} size={48} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-slate-900">{page.name}</h2>
          <p className="truncate text-[11px] font-medium text-slate-500">
            {page.category ?? "Facebook Page"} · ID {page.id}
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
          {page.link && (
            <a href={page.link} target="_blank" rel="noopener noreferrer" className={btn}>
              Open on Facebook
              <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200 px-2" role="tablist" aria-label="Page sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => onTab(id)}
            className={cn("-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition", tab === id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-600 hover:text-slate-900")}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "posts" && <PostsTab page={page} />}
      {tab === "scheduled" && <ScheduledPostsTable channel="FACEBOOK_PAGE" targetId={page.id} />}
      {tab === "about" && <AboutTab page={page} linked={linked} />}
    </section>
  );
}

const SORTS = ["Newest first", "Most reactions", "Most comments", "Most shares"] as const;

function PostsTab({ page }: { page: SocialPage }) {
  const meta = useMeta();
  const feed = usePagePosts(meta.companyId, page.id);
  const [type, setType] = useState("All types");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Newest first");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const types = useMemo(() => ["All types", ...Array.from(new Set(feed.items.map((post) => typeLabel(post.type))))], [feed.items]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = feed.items.filter((post) => (type === "All types" || typeLabel(post.type) === type) && (!q || (post.message ?? "").toLowerCase().includes(q)));
    const by = (key: "reactions" | "comments" | "shares") => (a: SocialPost, b: SocialPost) => (b[key] ?? -1) - (a[key] ?? -1);
    if (sort === "Most reactions") list.sort(by("reactions"));
    if (sort === "Most comments") list.sort(by("comments"));
    if (sort === "Most shares") list.sort(by("shares"));
    return list;
  }, [feed.items, type, sort, search]);
  const pager = useCursorPager(rows, 8, feed, `${page.id}|${type}|${sort}|${search}`);
  const open = feed.items.find((post) => post.id === openId) ?? null;
  const filtered = type !== "All types" || sort !== "Newest first" || search !== "";

  if (feed.isLoading) return <div className="h-48 animate-pulse bg-slate-50" role="status" aria-label="Loading posts" />;
  if (feed.isError) {
    const reason = messageOf(feed.error, "Posts could not be loaded.");
    return (
      <div className="p-4">
        <InlineNotice tone="amber" title="Posts could not be loaded" action={<button type="button" className={btn} onClick={() => void feed.reload()}>Try again</button>}>
          {reason}
        </InlineNotice>
      </div>
    );
  }

  return (
    <>
      {feed.items.length > 0 && (
        <FilterBar>
          <FilterSelect label="Post type" value={type} onChange={setType} options={types} minWidth={150} />
          <FilterSelect label="Sort" value={sort} onChange={(value) => setSort(value as (typeof SORTS)[number])} options={[...SORTS]} minWidth={160} />
          <SearchInput placeholder="Search post text…" value={search} onChange={setSearch} />
          {filtered && (
            <button
              type="button"
              className={btn}
              onClick={() => {
                setType("All types");
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
        <EmptyState icon={Newspaper} title={filtered ? "No posts match these filters" : "No published posts"} description={filtered ? "Try another type or clear the search. Only posts loaded so far are searched; use Next to load more." : "This Page has not published anything Meta can return."} compact />
      ) : (
        <TableShell minWidth={760}>
          <thead>
            <tr>
              <Th>Post</Th>
              <Th>Type</Th>
              <Th>Posted</Th>
              <Th numeric>Reactions</Th>
              <Th numeric>Comments</Th>
              <Th numeric>Shares</Th>
              <Th>Details</Th>
            </tr>
          </thead>
          <tbody>
            {pager.visible.map((post) => (
              <Tr key={post.id}>
                <Td>
                  <button type="button" onClick={() => setOpenId(post.id)} className="flex max-w-[340px] items-center gap-2.5 text-left">
                    <Thumb src={post.imageUrl} alt="" className="size-10 shrink-0 rounded-sm border border-slate-200" />
                    <span className="line-clamp-2 text-xs font-semibold text-blue-700 hover:underline">{post.message ?? "(no text)"}</span>
                  </button>
                </Td>
                <Td>{typeLabel(post.type)}</Td>
                <Td>{when(post.createdAt)}</Td>
                <Td numeric>{count(post.reactions)}</Td>
                <Td numeric>{count(post.comments)}</Td>
                <Td numeric>{count(post.shares)}</Td>
                <Td>
                  <button type="button" onClick={() => setOpenId(post.id)} className={btn}>
                    View
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}
      <CursorPager page={pager.page} pageCount={pager.pageCount} from={pager.from} to={pager.to} loaded={pager.loaded} hasMore={pager.hasMore} loadingMore={pager.loadingMore} noun="posts" onPrevious={pager.previous} onNext={pager.next} />

      <DetailDialog
        open={Boolean(open)}
        onOpenChange={(next) => !next && setOpenId(null)}
        title="Post details"
        description={open ? `${page.name} · ${when(open.createdAt)}` : undefined}
        wide
        footer={
          open && (
            <>
              {open.permalink && (
                <a href={open.permalink} target="_blank" rel="noopener noreferrer" className={btn}>
                  Open on Facebook
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
            <Thumb src={open.imageUrl} alt="Post image" className="aspect-square w-full rounded-sm border border-slate-200" />
            <div className="space-y-3">
              <p className="whitespace-pre-wrap text-xs font-medium leading-relaxed text-slate-800">{open.message ?? "(this post has no text)"}</p>
              <div className="grid grid-cols-3 gap-2">
                <MiniStat icon={ThumbsUp} label="Reactions" value={count(open.reactions)} />
                <MiniStat icon={MessageCircle} label="Comments" value={count(open.comments)} />
                <MiniStat icon={Share2} label="Shares" value={count(open.shares)} />
              </div>
              <dl>
                <KeyValue label="Type">{typeLabel(open.type)}</KeyValue>
                <KeyValue label="Posted">{when(open.createdAt)}</KeyValue>
                <KeyValue label="Post ID">{open.id}</KeyValue>
              </dl>
            </div>
          </div>
        )}
      </DetailDialog>
    </>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof ThumbsUp; label: string; value: string }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-slate-50 p-2.5 text-center">
      <Icon className="mx-auto size-3.5 text-slate-500" />
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
      <div className="text-[10px] font-semibold text-slate-500">{label}</div>
    </div>
  );
}

function AboutTab({ page, linked }: { page: SocialPage; linked: boolean }) {
  return (
    <div className="grid gap-5 p-4 lg:grid-cols-2">
      <dl>
        <KeyValue label="Name">{page.name}</KeyValue>
        <KeyValue label="Category">{page.category ?? "—"}</KeyValue>
        <KeyValue label="Page ID">{page.id}</KeyValue>
        <KeyValue label="Followers">{count(page.followers)}</KeyValue>
        <KeyValue label="Likes">{count(page.likes)}</KeyValue>
        <KeyValue label="Linked to this Client">{linked ? "Yes" : "No"}</KeyValue>
        <KeyValue label="Instagram">{page.instagram ? `@${page.instagram.username ?? page.instagram.id}` : "No Instagram account linked to this Page"}</KeyValue>
        {page.about && <KeyValue label="About">{page.about}</KeyValue>}
      </dl>
      <div>
        <h3 className="text-xs font-semibold text-slate-900">What this login can do on the Page</h3>
        {page.tasks.length === 0 ? (
          <p className="mt-2 text-xs font-medium text-slate-500">Meta did not report this login&apos;s role on the Page.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {page.tasks.map((task) => (
              <li key={task}>
                <Pill tone={task === "CREATE_CONTENT" ? "blue" : "slate"}>{TASK_LABEL[task] ?? task.replace(/_/g, " ").toLowerCase()}</Pill>
              </li>
            ))}
          </ul>
        )}
        {!page.canPublish && <p className="mt-3 text-xs font-medium leading-relaxed text-amber-800">This login cannot create content on the Page, so scheduled posts to it would fail. Ask a Page admin to grant content access.</p>}
      </div>
    </div>
  );
}
