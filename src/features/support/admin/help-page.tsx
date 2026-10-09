"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Plus, SearchX } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { btn, btnPrimary, EmptyState, SearchBox, Section } from "../ui";
import { useRaiseTicket } from "./support-shell";

interface Article {
  topic: string;
  question: string;
  answer: string;
}

/** Plain, honest answers for the things people most often ask support. They describe how the app works today. */
const ARTICLES: Article[] = [
  { topic: "Getting started", question: "How do I raise a support ticket?", answer: "Use the red “Raise a ticket” button at the top of this page. Choose what it is about, give it a title and describe what happened. The more detail you give (what you did, what you expected, the error text), the faster we can fix it." },
  { topic: "Getting started", question: "Who can raise tickets and who can only read them?", answer: "Owners, Admins and Managers can raise tickets and reply. Viewers can read every ticket of the Company but cannot raise or reply. All tickets of your Company are visible to everyone in it." },
  { topic: "Tickets", question: "How fast will you reply?", answer: "It depends on the priority you choose: Urgent within 1 hour, High within 4 hours, Normal within 8 hours and Low within 24 hours. The clock pauses while we wait for your reply. The exact promise is on the Overview page." },
  { topic: "Tickets", question: "What do the statuses mean?", answer: "Open: waiting for us. In progress: someone is working on it. Needs your reply: we asked you a question and wait for the answer. Resolved: we think it is fixed. Closed: finished. You can reopen a resolved ticket any time, and a closed one for 14 days." },
  { topic: "Tickets", question: "Support marked my ticket resolved but it is not fixed. What now?", answer: "Open the ticket and choose “No, it is not fixed”, or simply reply. The ticket reopens and our team is notified straight away." },
  { topic: "Tickets", question: "Can I attach a screenshot?", answer: "File uploads are not available yet. Upload the screenshot to your Media Library or any file sharing service and paste the https link into the description or a reply." },
  { topic: "Integrations", question: "Facebook or Instagram shows no Pages. Why?", answer: "Meta only lists Pages the connected Facebook profile has a role on. Give that profile access to the Page in Meta Business Settings, then open Meta → Settings, choose Reconnect and tick the Page and its Instagram account in Meta's dialog." },
  { topic: "Integrations", question: "A connected account says “reconnect needed”.", answer: "The login expired or was revoked. Open the channel's page (Meta, YouTube, LinkedIn or Google Business) and use Reconnect. Nothing you saved is lost." },
  { topic: "Publishing", question: "A scheduled post failed. Where do I see why?", answer: "Open the post from Calendar or Content. A failed post shows the reason (for example a missing permission or a media problem). If it says the outcome is unknown, check the network before publishing again, because it may already be live." },
  { topic: "Billing", question: "Where are my invoices and plan?", answer: "Under Billing. You can see your plan, usage, invoices and payment status there. For a billing problem raise a ticket with the category Billing & plan and include the invoice number." },
  { topic: "Account", question: "I cannot sign in or lost my authenticator.", answer: "Use one of your recovery codes on the sign-in page. If you have none left, ask your Company Owner to contact us from their account; for security we confirm identity before resetting two-factor sign-in." },
];

export function HelpCenterPage() {
  const raise = useRaiseTicket();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(ARTICLES[0]!.question);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ARTICLES.filter((a) => `${a.question} ${a.answer} ${a.topic}`.toLowerCase().includes(q)) : ARTICLES;
  }, [query]);
  const topics = Array.from(new Set(results.map((a) => a.topic)));

  return (
    <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-2">
        <Section title="Help Center" description="Quick answers. Not what you need? Raise a ticket and we will help.">
          <SearchBox value={query} onChange={setQuery} placeholder="Search help, e.g. “reconnect”, “invoice”, “reply time”…" />
        </Section>
        {results.length === 0 ? (
          <Section title="No answers found" flush>
            <EmptyState
              icon={SearchX}
              title={`Nothing matches “${query}”`}
              description="Raise a ticket and describe it in your own words."
              action={
                <button type="button" className={btnPrimary} onClick={() => raise.open({ subject: query })} disabled={!raise.canRaise}>
                  <Plus className="size-3.5" />
                  Raise a ticket
                </button>
              }
            />
          </Section>
        ) : (
          topics.map((topic) => (
            <Section key={topic} title={topic} flush>
              <ul className="divide-y divide-slate-100">
                {results
                  .filter((a) => a.topic === topic)
                  .map((article) => {
                    const expanded = open === article.question;
                    return (
                      <li key={article.question}>
                        <button type="button" onClick={() => setOpen(expanded ? null : article.question)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs font-semibold text-slate-900 transition hover:bg-slate-50">
                          {article.question}
                          <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition", expanded && "rotate-180")} />
                        </button>
                        {expanded && <p className="px-4 pb-4 text-xs font-medium leading-relaxed text-slate-600">{article.answer}</p>}
                      </li>
                    );
                  })}
              </ul>
            </Section>
          ))
        )}
      </div>

      <aside className="space-y-2">
        <Section title="Still need help?">
          <p className="text-xs font-medium leading-relaxed text-slate-600">Our support team answers inside the app. You will get a notification for every reply.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={() => raise.open()} disabled={!raise.canRaise}>
              <Plus className="size-3.5" />
              Raise a ticket
            </button>
            <Link href="/admin/support/tickets" className={btn}>
              <BookOpen className="size-3.5" />
              My tickets
            </Link>
          </div>
        </Section>
        <Section title="Tips for a fast fix">
          <ul className="space-y-2 text-xs font-medium leading-relaxed text-slate-600">
            <li>• Say what you were doing, what you expected and what happened.</li>
            <li>• Paste the exact error message.</li>
            <li>• Name the Client and the page where it happens.</li>
            <li>• One problem per ticket: it is solved faster.</li>
          </ul>
        </Section>
      </aside>
    </div>
  );
}
