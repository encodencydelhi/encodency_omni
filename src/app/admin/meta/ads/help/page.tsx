"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  CircleHelp,
  Clock,
  FileImage,
  FileText,
  Grid2X2,
  LifeBuoy,
  Megaphone,
  Plug,
  Rocket,
  Search,
  Sparkles,
  Target,
  UsersRound,
  WalletCards,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  articlesInCategory,
  CONTEXT_CATEGORY,
  getArticle,
  helpCategories,
  popularArticles,
  searchArticles,
  type HelpCategoryId,
} from "@/features/admin/meta-ads/help-content";
import { date } from "@/features/admin/meta-ads/format";
import {
  btn,
  btnPrimary,
  card,
  EmptyState,
  Panel,
  SkeletonTable,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";

const ICONS: Record<string, typeof Rocket> = {
  rocket: Rocket,
  megaphone: Megaphone,
  grid: Grid2X2,
  image: FileImage,
  file: FileText,
  users: UsersRound,
  target: Target,
  chart: BarChart3,
  plug: Plug,
  wallet: WalletCards,
  wrench: Wrench,
};

const RECENT_KEY = "meta-ads-help-recent";

function HelpCenter() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  /** Contextual entry: ?category=ads, or ?from=create from the campaign builder. */
  const requestedCategory = params?.get("category") as HelpCategoryId | null;
  const from = params?.get("from");
  const highlighted: HelpCategoryId | null =
    (requestedCategory && helpCategories.some((c) => c.id === requestedCategory)
      ? requestedCategory
      : null) ?? (from ? (CONTEXT_CATEGORY[from] ?? null) : null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_KEY);
      if (stored) setRecent(JSON.parse(stored) as string[]);
    } catch {
      // Private browsing or blocked storage — recently viewed is optional.
    }
  }, []);

  const results = useMemo(() => searchArticles(query), [query]);
  const searching = query.trim().length >= 2;

  const highlightedCategory = highlighted
    ? helpCategories.find((c) => c.id === highlighted)
    : undefined;

  const recentArticles = recent
    .map(getArticle)
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .slice(0, 4);

  return (
    <AdsWorkspace
      showDateRange={false}
      actions={
        <button
          type="button"
          onClick={() =>
            toast.success("Support request started", {
              description: "Our team replies within one business day.",
            })
          }
          className={cn(btnPrimary, "h-10")}
        >
          <LifeBuoy className="size-3.5" />
          Contact Support
        </button>
      }
    >
      <section className={cn(card, "mb-3 p-6")}>
        <div className="mx-auto max-w-[680px] text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-blue-50/80 shadow-sm ring-1 ring-blue-100">
            <CircleHelp className="size-6 text-blue-600" aria-hidden="true" />
          </span>
          <h1 className="mt-2.5 text-[22px] font-semibold leading-tight">
            Meta Ads Manager Help Center
          </h1>
          <p className="mx-auto mt-1.5 max-w-[520px] text-[12px] leading-relaxed text-[#64748b]">
            Guides and answers for creating and managing your Meta advertising campaigns.
          </p>

          <div className="relative mx-auto mt-4 max-w-[480px]">
            <Search
              className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#64748b]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Ads Manager help..."
              aria-label="Search Ads Manager help"
              className="h-12 w-full rounded-xl border border-slate-200/60 bg-white/80 pl-11 pr-4 text-xs shadow-sm backdrop-blur-md outline-none transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:bg-white hover:shadow-md"
            />
          </div>
        </div>
      </section>

      {searching ? (
        <section className={cn(card, "overflow-hidden")}>
          <div className="border-b border-[#dde5ee] px-3 py-2.5">
            <h2 className="text-sm font-semibold">
              {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
            </h2>
          </div>
          {results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nothing matched that search"
              description="Try a shorter phrase, browse the categories, or contact support if you are stuck."
              compact
            />
          ) : (
            <ul className="divide-y divide-[#eef2f7]">
              {results.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`${ADS_ROOT}/help/${article.slug}`}
                    className="block px-3 py-2.5 transition hover:bg-[#f7f9fc]"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-semibold text-[#0671e9]">{article.title}</span>
                      <span className="rounded-md border border-slate-200/50 bg-slate-50/80 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-slate-500">
                        {helpCategories.find((c) => c.id === article.category)?.title}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-[#64748b]">
                      {article.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            {highlightedCategory && (
              <Panel
                title={`${highlightedCategory.title} — recommended for you`}
                icon={<Sparkles className="size-4 text-[#f5b000]" />}
                action={
                  <Link
                    href={`${ADS_ROOT}/help`}
                    className="text-[10px] font-semibold text-[#1877f2] hover:underline"
                  >
                    Show all categories
                  </Link>
                }
              >
                <p className="mb-2.5 text-[11px] text-[#64748b]">
                  {highlightedCategory.description}
                </p>
                <ul className="grid gap-1.5 md:grid-cols-2">
                  {articlesInCategory(highlightedCategory.id).map((article) => (
                    <li key={article.slug}>
                      <Link
                        href={`${ADS_ROOT}/help/${article.slug}`}
                        className="block rounded-lg border border-slate-200/60 bg-white/60 p-3 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                      >
                        <span className="block text-[11px] font-semibold text-[#0671e9]">
                          {article.title}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-relaxed text-[#64748b]">
                          {article.summary}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <section>
              <h2 className="mb-2 text-sm font-semibold">Browse by category</h2>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {helpCategories.map((category) => {
                  const Icon = ICONS[category.icon] ?? CircleHelp;
                  const count = articlesInCategory(category.id).length;
                  return (
                    <li key={category.id}>
                      <Link
                        href={`${ADS_ROOT}/help?category=${category.id}`}
                        className={cn(
                          "flex h-full gap-3 rounded-xl border bg-white/60 p-3.5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                          highlighted === category.id
                            ? "border-blue-500 ring-1 ring-blue-500/30"
                            : "border-slate-200/60 hover:border-blue-200",
                        )}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50/80 shadow-sm ring-1 ring-blue-100">
                          <Icon className="size-4.5 text-blue-600" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[12px] font-semibold">{category.title}</span>
                          <span className="mt-0.5 block text-[10px] leading-relaxed text-[#64748b]">
                            {category.description}
                          </span>
                          <span className="mt-1 block text-[9px] font-semibold text-[#94a3b8]">
                            {count} article{count === 1 ? "" : "s"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <aside className="space-y-3">
            <Panel title="Popular articles" icon={<Sparkles className="size-4 text-[#f5b000]" />}>
              <ul className="space-y-1.5">
                {popularArticles().map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`${ADS_ROOT}/help/${article.slug}`}
                      className="block rounded-md px-2 py-1.5 text-[11px] font-medium text-[#0671e9] transition hover:bg-[#f7f9fc] hover:underline"
                    >
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>

            {recentArticles.length > 0 && (
              <Panel title="Recently viewed" icon={<Clock className="size-4 text-[#1877f2]" />}>
                <ul className="space-y-1.5">
                  {recentArticles.map((article) => (
                    <li key={article.slug}>
                      <Link
                        href={`${ADS_ROOT}/help/${article.slug}`}
                        className="block rounded-md px-2 py-1.5 text-[11px] font-medium text-[#475569] transition hover:bg-[#f7f9fc]"
                      >
                        {article.title}
                        <span className="block text-[9px] text-[#94a3b8]">
                          Updated {date(article.updated)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <Panel title="Need more help?" icon={<LifeBuoy className="size-4 text-[#1877f2]" />}>
              <p className="text-[11px] leading-relaxed text-[#64748b]">
                If an article did not answer your question, our team can look at your ad account
                directly.
              </p>
              <button
                type="button"
                onClick={() =>
                  toast.success("Support request started", {
                    description: "Our team replies within one business day.",
                  })
                }
                className={cn(btnPrimary, "mt-2.5 w-full")}
              >
                Contact Support
              </button>
              <Link href={`${ADS_ROOT}/issues`} className={cn(btn, "mt-1.5 w-full")}>
                Check Issues &amp; Warnings
              </Link>
            </Panel>
          </aside>
        </div>
      )}
    </AdsWorkspace>
  );
}

export default function HelpPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={5} columns={3} />}>
      <HelpCenter />
    </Suspense>
  );
}
