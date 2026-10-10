"use client";

import Link from "next/link";
import { AlertTriangle, Building2, Coins, Gauge, MessagesSquare, MessageCircleQuestion, ShieldAlert, Sparkles, Ticket, Timer, UsersRound, Zap } from "lucide-react";
import { BarList } from "@/features/support/charts";
import { errorMessage } from "@/features/support/hooks";
import { timeAgo } from "@/features/support/time";
import { Avatar, btn, CountTabs, EmptyState, ListSkeleton, Notice, Section, Skeleton, StatTile } from "@/features/support/ui";
import { useUrlState } from "@/features/support/url-state";
import { KeywordCloud, UsageChart } from "./charts";
import { ConversationRow } from "./conversation-row";
import { cardLabel, compact, Delta, full, RANGE_NOUN, RANGE_TABS, seconds, toolLabel } from "./format";
import { useAssistantAiAnalytics, useAssistantOverview } from "./hooks";
import type { DeskRange } from "./types";

const DEFAULTS = { range: "30d" };
const usd = (micros: number) => `$${(micros / 1_000_000).toFixed(micros > 0 && micros < 10_000 ? 4 : 2)}`;

export function AssistantOverviewPage() {
  const { values, set } = useUrlState(DEFAULTS);
  const range = (RANGE_TABS.some((tab) => tab.id === values.range) ? values.range : "30d") as DeskRange;
  const overview = useAssistantOverview(range);
  const ai = useAssistantAiAnalytics(range);
  const data = overview.data;
  const aiData = ai.data;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CountTabs<DeskRange> label="Period" value={range} onChange={(next) => set({ range: next })} tabs={RANGE_TABS} />
        {data && <span className="text-[11px] font-medium text-slate-500">Chats are kept for {data.retentionDays} days, then deleted.</span>}
      </div>

      {overview.isError && (
        <Notice tone="red" title="The Assistant Numbers Could Not Be Loaded" action={<button type="button" className={btn} onClick={() => void overview.refetch()}>Try Again</button>}>
          {errorMessage(overview.error)}
        </Notice>
      )}

      {overview.isLoading && !data && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[104px]" />
          ))}
        </div>
      )}

      {data && data.totals.conversations === 0 && (
        <Section title="No Conversations Yet" description={`Nobody has used the assistant ${RANGE_NOUN[range]}.`}>
          <EmptyState icon={MessageCircleQuestion} title="Waiting For The First Question" description="When people press Help & Support in the Admin panel and ask something, their conversations and token use appear here." />
        </Section>
      )}

      {data && data.totals.conversations > 0 && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <StatTile label="Conversations" value={full(data.totals.conversations)} icon={MessagesSquare} tone="blue" sub={<Delta value={data.change?.conversations} />} />
            <StatTile label="Questions Asked" value={full(data.totals.questions)} icon={MessageCircleQuestion} tone="violet" sub={<Delta value={data.change?.questions} />} />
            <StatTile label="People" value={full(data.totals.users)} icon={UsersRound} tone="green" sub={`in ${data.totals.companies} ${data.totals.companies === 1 ? "company" : "companies"}`} />
            <StatTile label="Tokens Used" value={compact(data.totals.totalTokens)} icon={Coins} tone="orange" sub={<Delta value={data.change?.tokens} />} />
            <StatTile label="Avg Tokens / Answer" value={full(data.totals.avgTokensPerReply)} icon={Gauge} sub={`↑ ${compact(data.totals.promptTokens)} in · ↓ ${compact(data.totals.completionTokens)} out`} />
            <StatTile label="Tickets Sent" value={full(data.totals.ticketsFromAssistant)} icon={Ticket} tone="green" sub="raised from a conversation" href="/super-admin/assistant/conversations?flag=ticket" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Avg Answer Time" value={seconds(data.totals.avgLatencyMs)} icon={Timer} sub="model + tools" />
            <StatTile label="Failed Answers" value={`${data.totals.failureRate}%`} icon={AlertTriangle} tone={data.totals.degraded > 0 ? "red" : undefined} sub={`${data.totals.degraded} of ${data.totals.replies}`} href="/super-admin/assistant/conversations?flag=degraded" />
            <StatTile label="Secrets Masked" value={full(data.totals.redacted)} icon={ShieldAlert} tone={data.totals.redacted > 0 ? "amber" : undefined} sub="passwords, keys, cards removed" href="/super-admin/assistant/conversations?flag=redacted" />
            <StatTile label="Questions Per Chat" value={data.totals.avgQuestionsPerConversation} icon={MessagesSquare} sub="longer chats can mean unsolved" />
          </div>

          <Section title="AI Performance" description="Provider usage, cache bypasses and estimated cost from assistant usage events." flush>
            {!aiData ? (
              <ListSkeleton rows={3} />
            ) : aiData.totals.usageEvents === 0 ? (
              <EmptyState icon={Sparkles} title="No Usage Events Yet" description="New chats, embeddings, FAQ bypasses and evaluations will appear here once recorded." />
            ) : (
              <div className="space-y-3 p-4">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                  <StatTile label="Usage Events" value={full(aiData.totals.usageEvents)} icon={Sparkles} />
                  <StatTile label="OpenAI Requests" value={full(aiData.totals.openAiRequests)} icon={Zap} tone="violet" />
                  <StatTile label="FAQ Bypasses" value={full(aiData.totals.faqBypasses)} icon={MessageCircleQuestion} tone="green" />
                  <StatTile label="Cache Hit Rate" value={`${aiData.totals.cacheHitRate}%`} icon={Gauge} />
                  <StatTile label="Est. API Cost" value={usd(aiData.totals.estimatedCostMicros)} icon={Coins} tone="orange" sub="estimated, not provider bill" />
                  <StatTile label="Error Rate" value={`${aiData.totals.errorRate}%`} icon={AlertTriangle} tone={aiData.totals.errorRate > 0 ? "red" : undefined} />
                </div>
                <div className="grid gap-2 xl:grid-cols-2">
                  <div className="overflow-hidden rounded-sm border border-slate-200">
                    <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900">Cost By Model</div>
                    <div className="divide-y divide-slate-100">
                      {aiData.byModel.length === 0 ? <p className="p-3 text-xs font-medium text-slate-500">No model usage yet.</p> : aiData.byModel.map((row) => (
                        <div key={`${row.model}-${row.operation}`} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 text-xs">
                          <span className="font-semibold text-slate-900">{row.model}</span>
                          <span className="text-slate-500">{row.requests} {row.operation}</span>
                          <span className="font-semibold tabular-nums text-slate-900">{usd(row.estimatedCostMicros)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-sm border border-slate-200">
                    <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900">Operations</div>
                    <div className="divide-y divide-slate-100">
                      {aiData.byFeature.length === 0 ? <p className="p-3 text-xs font-medium text-slate-500">No operations yet.</p> : aiData.byFeature.map((row) => (
                        <div key={`${row.feature}-${row.operation}-${row.success}`} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 text-xs">
                          <span className="font-semibold text-slate-900">{row.feature} / {row.operation}</span>
                          <span className={row.success ? "text-emerald-700" : "text-rose-700"}>{row.success ? "success" : "failed"}</span>
                          <span className="font-semibold tabular-nums text-slate-900">{row.requests}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 xl:grid-cols-3">
                  <div className="overflow-hidden rounded-sm border border-slate-200">
                    <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900">Learning Health</div>
                    <div className="grid grid-cols-2 gap-2 p-3 text-xs">
                      <span className="font-medium text-slate-500">Auto Learning</span>
                      <span className={aiData.learning.enabled ? "text-right font-semibold text-emerald-700" : "text-right font-semibold text-slate-500"}>{aiData.learning.enabled ? "enabled" : "disabled"}</span>
                      <span className="font-medium text-slate-500">Pending Reviews</span>
                      <span className="text-right font-semibold text-slate-900">{full(aiData.learning.pendingApprovals)}</span>
                      <span className="font-medium text-slate-500">Failed Jobs</span>
                      <span className={aiData.learning.failures > 0 ? "text-right font-semibold text-rose-700" : "text-right font-semibold text-slate-900"}>{full(aiData.learning.failures)}</span>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-sm border border-slate-200">
                    <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900">FAQ Health</div>
                    <div className="grid grid-cols-2 gap-2 p-3 text-xs">
                      <span className="font-medium text-slate-500">Approved FAQs</span>
                      <span className="text-right font-semibold text-slate-900">{full(aiData.knowledgeHealth.approvedFaqs)}</span>
                      <span className="font-medium text-slate-500">FAQ Hits</span>
                      <span className="text-right font-semibold text-slate-900">{full(aiData.knowledgeHealth.faqHits)}</span>
                      <span className="font-medium text-slate-500">Negative Feedback</span>
                      <span className={aiData.knowledgeHealth.negativeFeedback > 0 ? "text-right font-semibold text-amber-700" : "text-right font-semibold text-slate-900"}>{full(aiData.knowledgeHealth.negativeFeedback)}</span>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-sm border border-slate-200">
                    <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900">Feature Flags</div>
                    <div className="grid grid-cols-2 gap-2 p-3 text-xs">
                      <span className="font-medium text-slate-500">Semantic Search</span>
                      <span className="text-right font-semibold text-slate-900">{aiData.config.vectorSearchEnabled ? "on" : "off"}</span>
                      <span className="font-medium text-slate-500">Model Routing</span>
                      <span className="text-right font-semibold text-slate-900">{aiData.config.modelRoutingEnabled ? "on" : "off"}</span>
                      <span className="font-medium text-slate-500">Streaming</span>
                      <span className="text-right font-semibold text-slate-900">{aiData.config.streamingEnabled ? "on" : "off"}</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-sm border border-slate-200">
                  <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900">Knowledge Gaps</div>
                  <div className="divide-y divide-slate-100">
                    {aiData.knowledgeGaps.length === 0 ? <p className="p-3 text-xs font-medium text-slate-500">No repeated unresolved questions in this period.</p> : aiData.knowledgeGaps.map((gap) => (
                      <div key={gap.question} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 text-xs">
                        <span dir="auto" className="min-w-0 truncate font-semibold text-slate-900">{gap.question}</span>
                        <span className="font-medium text-slate-500">{gap.frequency} asks</span>
                        <span className={gap.priority === "high" ? "font-semibold text-rose-700" : gap.priority === "medium" ? "font-semibold text-amber-700" : "font-semibold text-slate-600"}>{gap.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Section>

          <div className="grid gap-2 xl:grid-cols-3">
            <Section title="Usage Over Time" description="Questions per day and the tokens they used." className="xl:col-span-2">
              <UsageChart data={data.series} height={270} />
            </Section>
            <Section title="Where People Ask" description="The page they were on when they asked.">
              <BarList color="bg-blue-500" rows={data.pages.map((page) => ({ key: page.id ?? "other", label: page.title, value: page.questions, hint: `${compact(page.tokens)} tokens` }))} empty="No questions yet." />
            </Section>
          </div>

          <div className="grid gap-2 xl:grid-cols-3">
            <Section title="Most Asked Questions" description="The same question asked again and again points to missing help." className="xl:col-span-2" flush>
              <ul className="divide-y divide-slate-100">
                {data.topQuestions.map((question) => (
                  <li key={question.text} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="mt-0.5 inline-flex min-w-7 justify-center rounded-sm bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">{question.count}×</span>
                    <p dir="auto" className="min-w-0 flex-1 text-xs font-medium leading-relaxed text-slate-800">{question.text}</p>
                    <span className="shrink-0 text-[11px] font-medium text-slate-400">{timeAgo(question.lastAskedAt)}</span>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="What People Talk About" description="Words used most in questions.">
              <KeywordCloud words={data.keywords} />
            </Section>
          </div>

          <div className="grid gap-2 xl:grid-cols-3">
            <Section title="What The Assistant Did" description="Actions it took for people.">
              <BarList color="bg-violet-500" rows={data.tools.map((tool) => ({ key: tool.name, label: toolLabel(tool.name), value: tool.count }))} empty="It only answered questions; no actions yet." />
              {data.cards.length > 0 && (
                <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-500">
                  Cards shown: {data.cards.map((card) => `${cardLabel(card.name)} ${card.count}`).join(" · ")}
                </p>
              )}
            </Section>
            <Section title="Model & Tokens" description="Which model answered and what it used." className="xl:col-span-2" flush>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Model</th>
                    <th className="px-2 py-2.5 text-right">Answers</th>
                    <th className="px-2 py-2.5 text-right">Tokens In</th>
                    <th className="px-2 py-2.5 text-right">Tokens Out</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.models.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center font-medium text-slate-500">No model answers yet.</td>
                    </tr>
                  )}
                  {data.models.map((model) => (
                    <tr key={model.model ?? "none"}>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{model.model}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{full(model.replies)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{full(model.promptTokens)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{full(model.completionTokens)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">{full(model.totalTokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </div>

          <div className="grid gap-2 xl:grid-cols-2">
            <Section title="Busiest Companies" description="By people using it, then questions." flush action={<Link href="/super-admin/assistant/conversations" className={btn}>All Conversations</Link>}>
              <ul className="divide-y divide-slate-100">
                {data.companies.map((company) => (
                  <li key={company.id}>
                    <Link href={`/super-admin/assistant/conversations?company=${company.id}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-slate-100 text-slate-500"><Building2 className="size-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-900">{company.name}</span>
                        <span className="block text-[11px] font-medium text-slate-500">{company.users} {company.users === 1 ? "person" : "people"} · {company.conversations} chats · {company.questions} questions</span>
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-violet-700">{compact(company.tokens)} tokens</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Most Active People" description="Open one to read everything they asked." flush action={<Link href="/super-admin/assistant/people" className={btn}>All People</Link>}>
              <ul className="divide-y divide-slate-100">
                {data.people.map((person) => (
                  <li key={person.id}>
                    <Link href={`/super-admin/assistant/people/${person.id}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50">
                      <Avatar name={person.name} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-900">{person.name}</span>
                        <span className="block truncate text-[11px] font-medium text-slate-500">{person.company} · {person.questions} questions · {timeAgo(person.lastActiveAt)}</span>
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-violet-700">{compact(person.tokens)} tokens</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <Section title="Latest Conversations" description="The newest chats, word for word one click away." flush action={<Link href="/super-admin/assistant/conversations" className={btn}>See All</Link>}>
            {overview.isFetching && !data.recent.length ? <ListSkeleton rows={4} /> : <ul className="divide-y divide-slate-100">{data.recent.map((item) => <ConversationRow key={item.id} item={item} />)}</ul>}
          </Section>
        </>
      )}
    </div>
  );
}
