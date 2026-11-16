import type { Deal, DealStage } from "../types";
import type { CrmDealsSummary } from "./crm-api";

/**
 * Pure rules of the deal board, mirroring what the server computes for /crm/deals/summary and /crm/deals/page.
 * Live data never uses the sums here (the database does); this is used for the sample-data preview, to decide whether a
 * card that was just created or edited still belongs on the filtered board, and to place a moved card in its column.
 */

export interface BoardFilters {
  pipelineId: string;
  search?: string;
  ownerId?: string;
  priority?: string;
  close?: string;
  /** The viewer's local date, YYYY-MM-DD. */
  today: string;
}

export const OWNER_NONE = "__none__";
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function lastDayOfMonth(day: string): string {
  const date = new Date(`${day.slice(0, 8)}01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

export function localDay(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const isOpen = (deal: Deal) => deal.stage !== "won" && deal.stage !== "lost";
const closeDay = (deal: Deal) => deal.expectedCloseDate.slice(0, 10);
const hasClose = (deal: Deal) => DAY.test(closeDay(deal));

/** Whether a deal is shown by the board's search and filters (the pipeline itself is checked separately). */
export function matchesFilters(deal: Deal, filters: BoardFilters): boolean {
  const q = filters.search?.trim().toLowerCase();
  if (q && !(deal.name.toLowerCase().includes(q) || deal.companyName.toLowerCase().includes(q) || deal.primaryContactName.toLowerCase().includes(q))) return false;
  if (filters.ownerId) {
    if (filters.ownerId === OWNER_NONE ? deal.ownerId : deal.ownerId !== filters.ownerId) return false;
  }
  if (filters.priority && deal.priority !== filters.priority) return false;
  if (filters.close) {
    if (filters.close === "none") return !hasClose(deal);
    if (!hasClose(deal) || !isOpen(deal)) return false;
    const day = closeDay(deal);
    if (filters.close === "overdue") return day < filters.today;
    if (filters.close === "month") return day >= filters.today && day <= lastDayOfMonth(filters.today);
    if (filters.close === "30") return day >= filters.today && day <= addDays(filters.today, 30);
  }
  return true;
}

export function inPipeline(deal: Deal, pipelineId: string): boolean {
  return deal.pipelineId === pipelineId;
}

/** Newest first, ties broken by id (the order the server pages in). */
export function newestFirst(a: Deal, b: Deal): number {
  return a.createdAt === b.createdAt ? (a.id < b.id ? 1 : a.id > b.id ? -1 : 0) : a.createdAt < b.createdAt ? 1 : -1;
}

/**
 * Places a card in a column at the position the server would return it. A card older than every loaded card, in a
 * column that has more pages, is NOT added: it will arrive through "Load more", so it is never shown twice or out of order.
 */
export function insertInOrder(rows: Deal[], deal: Deal, hasMore: boolean): Deal[] {
  const without = rows.filter((row) => row.id !== deal.id);
  const index = without.findIndex((row) => newestFirst(deal, row) < 0);
  if (index === -1) return hasMore ? without : [...without, deal];
  return [...without.slice(0, index), deal, ...without.slice(index)];
}

/** The sample-data equivalent of the server's per-stage summary and card figures. */
export function buildSummary(deals: Deal[], filters: BoardFilters): CrmDealsSummary {
  const inThis = deals.filter((deal) => inPipeline(deal, filters.pipelineId));
  const shown = inThis.filter((deal) => matchesFilters(deal, filters));
  const monthEnd = lastDayOfMonth(filters.today);
  const monthStart = `${filters.today.slice(0, 8)}01`;
  const stages = new Map<string, { stage: string; total: number; count: number; value: number }>();
  for (const deal of inThis) {
    const entry = stages.get(deal.stage) ?? { stage: deal.stage, total: 0, count: 0, value: 0 };
    entry.total += 1;
    stages.set(deal.stage, entry);
  }
  for (const deal of shown) {
    const entry = stages.get(deal.stage)!;
    entry.count += 1;
    entry.value += deal.value;
  }
  const open = inThis.filter(isOpen);
  const closing = open.filter((deal) => hasClose(deal) && closeDay(deal) >= filters.today && closeDay(deal) <= monthEnd);
  const wonMonth = inThis.filter((deal) => deal.stage === "won" && deal.updatedAt.slice(0, 10) >= monthStart);
  const sum = (rows: Deal[], pick: (deal: Deal) => number) => rows.reduce((total, deal) => total + pick(deal), 0);
  const owners = new Map<string, string>();
  for (const deal of inThis) if (deal.ownerId) owners.set(deal.ownerId, deal.ownerName);
  const pipelineCounts: Record<string, number> = {};
  for (const deal of deals) pipelineCounts[deal.pipelineId] = (pipelineCounts[deal.pipelineId] ?? 0) + 1;
  return {
    pipelineId: filters.pipelineId,
    total: inThis.length,
    stages: [...stages.values()],
    metrics: {
      open: { count: open.length, value: sum(open, (d) => d.value), weighted: sum(open, (d) => (d.value * d.probability) / 100) },
      won: { count: inThis.filter((d) => d.stage === "won").length },
      lost: { count: inThis.filter((d) => d.stage === "lost").length },
      wonThisMonth: { count: wonMonth.length, value: sum(wonMonth, (d) => d.value) },
    },
    forecast: {
      closingCount: closing.length, bestCase: sum(closing, (d) => d.value), expected: sum(closing, (d) => (d.value * d.probability) / 100),
      committed: sum(closing.filter((d) => d.probability >= 80 || d.stage === "negotiation"), (d) => d.value),
      overdue: open.filter((deal) => hasClose(deal) && closeDay(deal) < filters.today).length,
    },
    owners: [...owners].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    pipelineCounts,
  };
}

/** The cards of one stage as the board shows them (filtered, newest first). */
export function stageCards(deals: Deal[], stage: DealStage | string, filters: BoardFilters): Deal[] {
  return deals.filter((deal) => inPipeline(deal, filters.pipelineId) && deal.stage === stage && matchesFilters(deal, filters)).sort(newestFirst);
}

/** Open stages from the pipeline, then any other open stage a deal carries, then Won and Lost. */
export function orderStages(pipelineStages: DealStage[], present: string[], known: DealStage[]): DealStage[] {
  const open = pipelineStages.filter((stage) => stage !== "won" && stage !== "lost");
  const extra = known.filter((stage) => stage !== "won" && stage !== "lost" && !open.includes(stage) && present.includes(stage));
  return [...open, ...extra, "won", "lost"];
}
