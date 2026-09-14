"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleHelp,
  Info,
  LifeBuoy,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  articlesInCategory,
  getArticle,
  helpCategories,
} from "@/features/admin/meta-ads/help-content";
import { date } from "@/features/admin/meta-ads/format";
import {
  btn,
  btnPrimary,
  card,
  NotFoundState,
  Panel,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";

const RECENT_KEY = "meta-ads-help-recent";

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const article = getArticle(slug);
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  /** Remember what was read so the Help Center can offer it again. */
  useEffect(() => {
    if (!article) return;
    try {
      const stored = window.localStorage.getItem(RECENT_KEY);
      const list: string[] = stored ? JSON.parse(stored) : [];
      const next = [article.slug, ...list.filter((s) => s !== article.slug)].slice(0, 8);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Storage can be blocked; recently viewed is a convenience only.
    }
  }, [article]);

  if (!article) {
    return (
      <AdsWorkspace>
        <NotFoundState
          title="Article not found"
          description="This help article may have been renamed. Search the Help Center or browse by category to find what you need."
          backHref={`${ADS_ROOT}/help`}
          backLabel="Back to Help Center"
        />
      </AdsWorkspace>
    );
  }

  const category = helpCategories.find((c) => c.id === article.category);
  const siblings = articlesInCategory(article.category).filter(
    (a) => a.slug !== article.slug,
  );
  const related = article.related
    .map(getArticle)
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <AdsWorkspace
      showDateRange={false}
      actions={
        <Link href={`${ADS_ROOT}/help`} className={cn(btn, "h-10")}>
          <CircleHelp className="size-3.5" />
          Help Center
        </Link>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[220px_1fr_260px]">
        {/* Category navigation */}
        <nav aria-label="Help categories" className={cn(card, "h-fit p-2")}>
          <p className="px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Categories
          </p>
          <ul>
            {helpCategories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`${ADS_ROOT}/help?category=${c.id}`}
                  aria-current={c.id === article.category ? "page" : undefined}
                  className={cn(
                    "block rounded-sm px-2 py-1.5 text-[11px] font-medium transition",
                    c.id === article.category
                      ? "bg-[#eff6ff] text-[#1877f2]"
                      : "text-[#475569] hover:bg-[#f7f9fc]",
                  )}
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Article */}
        <article className={cn(card, "p-5")}>
          <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-[10px] text-[#64748b]">
            <Link href={ADS_ROOT} className="font-medium hover:text-[#1877f2] hover:underline">
              Meta Ads Manager
            </Link>
            <span aria-hidden="true">/</span>
            <Link href={`${ADS_ROOT}/help`} className="font-medium hover:text-[#1877f2] hover:underline">
              Help Center
            </Link>
            {category && (
              <>
                <span aria-hidden="true">/</span>
                <Link
                  href={`${ADS_ROOT}/help?category=${category.id}`}
                  className="font-medium hover:text-[#1877f2] hover:underline"
                >
                  {category.title}
                </Link>
              </>
            )}
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-[#14213d]">{article.title}</span>
          </nav>

          <h1 className="text-[22px] font-semibold leading-tight">{article.title}</h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#64748b]">{article.summary}</p>
          <p className="mt-2 text-[10px] text-[#94a3b8]">
            Last updated {date(article.updated)} · {article.readMinutes} min read
          </p>

          <div className="mt-4 space-y-4">
            {article.sections.map((section, i) => (
              <section key={i}>
                {section.heading && (
                  <h2 className="mb-1.5 text-[13px] font-semibold">{section.heading}</h2>
                )}

                {section.paragraphs?.map((p, j) => (
                  <p key={j} className="mb-2 text-[12px] leading-relaxed text-[#334155]">
                    {p}
                  </p>
                ))}

                {section.bullets && (
                  <ul className="mb-2 space-y-1.5">
                    {section.bullets.map((b, j) => (
                      <li key={j} className="flex gap-2 text-[12px] leading-relaxed text-[#334155]">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-[#10b981]" aria-hidden="true" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.steps && (
                  <ol className="mb-2 space-y-1.5">
                    {section.steps.map((s, j) => (
                      <li key={j} className="flex gap-2.5 text-[12px] leading-relaxed text-[#334155]">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8eef5] text-[9px] font-semibold text-[#475569]">
                          {j + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {section.callout && (
                  <div
                    className={cn(
                      "flex gap-2.5 rounded-sm border p-2.5",
                      section.callout.tone === "warning"
                        ? "border-[#fae0a6] bg-[#fffaeb] text-[#b45309]"
                        : "border-[#bcd9ff] bg-[#eff6ff] text-[#0b5ed7]",
                    )}
                  >
                    {section.callout.tone === "warning" ? (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    )}
                    <p className="text-[11px] leading-relaxed">{section.callout.text}</p>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Was this helpful */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-[#e8edf4] bg-[#fbfcfe] p-3">
            {feedback === null ? (
              <>
                <p className="text-[11px] font-semibold">Was this helpful?</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback("yes");
                      toast.success("Thanks — glad it helped.");
                    }}
                    className={btn}
                  >
                    <ThumbsUp className="size-3.5" />
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback("no");
                      toast.success("Thanks — we will improve this article.");
                    }}
                    className={btn}
                  >
                    <ThumbsDown className="size-3.5" />
                    No
                  </button>
                </div>
              </>
            ) : feedback === "yes" ? (
              <p className="text-[11px] font-semibold text-[#087a50]">
                Thanks for the feedback.
              </p>
            ) : (
              <>
                <p className="text-[11px] font-semibold text-[#475569]">
                  Sorry this did not help. Our team can look at your account directly.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    toast.success("Support request started", {
                      description: "Our team replies within one business day.",
                    })
                  }
                  className={btnPrimary}
                >
                  Contact Support
                </button>
              </>
            )}
          </div>
        </article>

        {/* Related */}
        <aside className="space-y-3">
          {related.length > 0 && (
            <Panel title="Related articles" icon={<CircleHelp className="size-4 text-[#1877f2]" />}>
              <ul className="space-y-1.5">
                {related.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`${ADS_ROOT}/help/${a.slug}`}
                      className="block rounded-sm px-2 py-1.5 text-[11px] font-medium text-[#0671e9] transition hover:bg-[#f7f9fc] hover:underline"
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {siblings.length > 0 && category && (
            <Panel title={`More in ${category.title}`} icon={<CircleHelp className="size-4 text-[#1877f2]" />}>
              <ul className="space-y-1.5">
                {siblings.slice(0, 6).map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`${ADS_ROOT}/help/${a.slug}`}
                      className="block rounded-sm px-2 py-1.5 text-[11px] font-medium text-[#475569] transition hover:bg-[#f7f9fc]"
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Need more help?" icon={<LifeBuoy className="size-4 text-[#1877f2]" />}>
            <p className="text-[11px] leading-relaxed text-[#64748b]">
              Contact support and we will look at your ad account with you.
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
          </Panel>
        </aside>
      </div>
    </AdsWorkspace>
  );
}
