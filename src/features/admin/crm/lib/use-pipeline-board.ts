"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { crmApi, type CrmDealsSummary, type CrmScope } from "../data/crm-api";
import { buildSummary, inPipeline, insertInOrder, matchesFilters, orderStages, stageCards, type BoardFilters } from "../data/pipeline-board";
import type { Deal, DealStage } from "../types";
import { DEAL_STAGES, normalizeDeal } from "./crm-records";

export const BOARD_PAGE_SIZE = 25;

export interface BoardColumn { rows: Deal[]; next: string | null; loading: boolean; loadingMore: boolean; error: string | null }
const EMPTY: BoardColumn = { rows: [], next: null, loading: true, loadingMore: false, error: null };
const messageOf = (error: unknown) => (error instanceof Error ? error.message : "The request could not be completed.");

interface Options {
  scope: CrmScope | null;
  ready: boolean;
  filters: BoardFilters;
  /** The pipeline's own stages; extra stages that deals carry are added from the summary. */
  pipelineStages: DealStage[];
  /** Sample-data preview: the board is derived from this local list instead of the server. */
  mock?: { deals: Deal[]; setDeals: Dispatch<SetStateAction<Deal[]>> };
}

/**
 * The Pipeline board's data. Live data comes in two independent parts: a summary (per-stage counts and values, the cards
 * and forecast figures) and each stage's first 25 cards, with "Load more" per stage. Nothing loads every deal. Moves
 * are optimistic, applied to the one card and to the stage figures, and rolled back (with the figures re-read) on failure.
 */
export function usePipelineBoard({ scope, ready, filters, pipelineStages, mock }: Options) {
  const isMock = Boolean(mock);
  const [summary, setSummary] = useState<CrmDealsSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [columns, setColumns] = useState<Record<string, BoardColumn>>({});
  const [summaryVersion, setSummaryVersion] = useState(0);
  const [boardVersion, setBoardVersion] = useState(0);

  const filtersRef = useRef(filters);
  const columnsRef = useRef(columns);
  useLayoutEffect(() => { filtersRef.current = filters; columnsRef.current = columns; });
  const filterKey = JSON.stringify(filters);
  const params = useMemo(() => ({
    pipelineId: filters.pipelineId, search: filters.search?.trim() || undefined, ownerId: filters.ownerId, priority: filters.priority, close: filters.close, today: filters.today,
  }), [filters.pipelineId, filters.search, filters.ownerId, filters.priority, filters.close, filters.today]);

  const mockSummary = useMemo(() => (mock ? buildSummary(mock.deals, filters) : null), [mock, filters]);
  const liveSummary = isMock ? mockSummary : summary;
  const displayStages = useMemo(
    () => orderStages(pipelineStages, (liveSummary?.stages ?? []).filter((entry) => entry.total > 0).map((entry) => entry.stage), DEAL_STAGES),
    [pipelineStages, liveSummary],
  );
  const stageKey = displayStages.join(",");

  /* ---- Summary ---- */
  useEffect(() => {
    if (isMock || !ready || !scope) return;
    let active = true;
    const timer = window.setTimeout(() => {
      crmApi.dealsSummary(params, scope)
        .then((value) => { if (active) { setSummary(value); setSummaryError(null); } })
        .catch((error) => { if (active) setSummaryError(messageOf(error)); });
    }, 150);
    return () => { active = false; window.clearTimeout(timer); };
  }, [isMock, ready, scope, params, summaryVersion, boardVersion]);

  /* ---- Each stage's first page ---- */
  const lastBoardKey = useRef("");
  useEffect(() => {
    if (isMock || !ready || !scope) return;
    let active = true;
    const stages = stageKey.split(",").filter(Boolean);
    const key = `${filterKey}|${stageKey}`;
    const sameBoard = lastBoardKey.current === key;
    lastBoardKey.current = key;
    const timer = window.setTimeout(() => {
      // The same board (a refresh) keeps its cards while re-reading; a new pipeline or filter starts clean.
      setColumns((previous) => Object.fromEntries(stages.map((stage) => [stage, sameBoard && previous[stage] ? { ...previous[stage]!, loading: true, error: null } : { ...EMPTY }])));
      for (const stage of stages) {
        crmApi.dealsPage<Deal>({ ...params, stage, limit: BOARD_PAGE_SIZE }, scope)
          .then((page) => { if (active) setColumns((previous) => ({ ...previous, [stage]: { rows: page.items.map(normalizeDeal), next: page.page.nextCursor, loading: false, loadingMore: false, error: null } })); })
          .catch((error) => { if (active) setColumns((previous) => ({ ...previous, [stage]: { ...(previous[stage] ?? EMPTY), loading: false, loadingMore: false, error: messageOf(error) } })); });
      }
    }, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [isMock, ready, scope, params, filterKey, stageKey, boardVersion]);

  /* ---- Per-stage actions ---- */
  const loadMore = useCallback(async (stage: string) => {
    const column = columnsRef.current[stage];
    if (isMock || !scope || !column?.next || column.loadingMore) return;
    setColumns((previous) => ({ ...previous, [stage]: { ...previous[stage]!, loadingMore: true } }));
    try {
      const page = await crmApi.dealsPage<Deal>({ ...params, stage, cursor: column.next, limit: BOARD_PAGE_SIZE }, scope);
      setColumns((previous) => {
        const current = previous[stage] ?? EMPTY;
        const known = new Set(current.rows.map((row) => row.id));
        return { ...previous, [stage]: { ...current, rows: [...current.rows, ...page.items.map(normalizeDeal).filter((row) => !known.has(row.id))], next: page.page.nextCursor, loadingMore: false, error: null } };
      });
    } catch (error) {
      setColumns((previous) => ({ ...previous, [stage]: { ...(previous[stage] ?? EMPTY), loadingMore: false, error: messageOf(error) } }));
    }
  }, [isMock, scope, params]);

  const retryColumn = useCallback((stage: string) => {
    if (isMock || !scope) return;
    setColumns((previous) => ({ ...previous, [stage]: { ...(previous[stage] ?? EMPTY), loading: true, error: null } }));
    crmApi.dealsPage<Deal>({ ...params, stage, limit: BOARD_PAGE_SIZE }, scope)
      .then((page) => setColumns((previous) => ({ ...previous, [stage]: { rows: page.items.map(normalizeDeal), next: page.page.nextCursor, loading: false, loadingMore: false, error: null } })))
      .catch((error) => setColumns((previous) => ({ ...previous, [stage]: { ...(previous[stage] ?? EMPTY), loading: false, error: messageOf(error) } })));
  }, [isMock, scope, params]);

  const refresh = useCallback(() => setBoardVersion((value) => value + 1), []);

  /** Puts a card where it belongs (or removes it when it no longer matches the board) without touching the figures. */
  const placeCard = useCallback((deal: Deal) => {
    setColumns((previous) => {
      const next: Record<string, BoardColumn> = {};
      for (const [stage, column] of Object.entries(previous)) next[stage] = { ...column, rows: column.rows.filter((row) => row.id !== deal.id) };
      const target = next[deal.stage];
      if (target && inPipeline(deal, filtersRef.current.pipelineId) && matchesFilters(deal, filtersRef.current)) {
        next[deal.stage] = { ...target, rows: insertInOrder(target.rows, deal, target.next !== null) };
      }
      return next;
    });
  }, []);

  const shiftFigures = useCallback((from: string, to: string, value: number) => {
    setSummary((previous) => {
      if (!previous || from === to) return previous;
      const stages = previous.stages.map((entry) => ({ ...entry }));
      const entry = (stage: string) => { let found = stages.find((item) => item.stage === stage); if (!found) { found = { stage, total: 0, count: 0, value: 0 }; stages.push(found); } return found; };
      const source = entry(from); const target = entry(to);
      source.total -= 1; source.count -= 1; source.value -= value;
      target.total += 1; target.count += 1; target.value += value;
      return { ...previous, stages };
    });
  }, []);

  /** A saved or edited deal: replace its card, then re-read the figures. */
  const upsert = useCallback((deal: Deal) => {
    if (mock) { mock.setDeals((rows) => (rows.some((row) => row.id === deal.id) ? rows.map((row) => (row.id === deal.id ? deal : row)) : [deal, ...rows])); return; }
    placeCard(deal);
    setSummaryVersion((value) => value + 1);
  }, [mock, placeCard]);

  const remove = useCallback((id: string) => {
    if (mock) { mock.setDeals((rows) => rows.filter((row) => row.id !== id)); return; }
    setColumns((previous) => Object.fromEntries(Object.entries(previous).map(([stage, column]) => [stage, { ...column, rows: column.rows.filter((row) => row.id !== id) }])));
    setSummaryVersion((value) => value + 1);
  }, [mock]);

  /** Moves a card between stages. Throws on failure after rolling the card and the figures back. */
  const move = useCallback(async (deal: Deal, stage: DealStage, options: { lostReason?: string } = {}): Promise<Deal> => {
    const probability = stage === "won" ? 100 : stage === "lost" ? 0 : deal.stage === "won" || deal.stage === "lost" ? 20 : deal.probability;
    const optimistic: Deal = { ...deal, stage, probability, lostReason: stage === "lost" ? (options.lostReason ?? deal.lostReason) : undefined };
    if (mock) { mock.setDeals((rows) => rows.map((row) => (row.id === deal.id ? { ...optimistic, updatedAt: new Date().toISOString() } : row))); return optimistic; }
    placeCard(optimistic);
    shiftFigures(deal.stage, stage, deal.value);
    try {
      const saved = normalizeDeal(await crmApi.moveDeal<Deal>(deal.id, { stage, fromStage: deal.stage, lostReason: stage === "lost" ? options.lostReason : undefined }, scope ?? undefined));
      placeCard(saved);
      setSummaryVersion((value) => value + 1);
      return saved;
    } catch (error) {
      placeCard(deal);
      shiftFigures(stage, deal.stage, deal.value);
      // A conflict means the board was stale: re-read everything instead of guessing.
      const conflict = (error as { status?: number })?.status === 409;
      if (conflict) setBoardVersion((value) => value + 1); else setSummaryVersion((value) => value + 1);
      throw error;
    }
  }, [mock, scope, placeCard, shiftFigures]);

  const findDeal = useCallback((id: string): Deal | undefined => {
    if (mock) return mock.deals.find((row) => row.id === id);
    for (const column of Object.values(columnsRef.current)) { const found = column.rows.find((row) => row.id === id); if (found) return found; }
    return undefined;
  }, [mock]);

  const mockColumns = useMemo(() => {
    if (!mock) return null;
    return Object.fromEntries(displayStages.map((stage) => [stage, { rows: stageCards(mock.deals, stage, filters), next: null, loading: false, loadingMore: false, error: null } as BoardColumn]));
  }, [mock, displayStages, filters]);

  const column = useCallback((stage: string): BoardColumn => (mockColumns ?? columns)[stage] ?? EMPTY, [mockColumns, columns]);

  return {
    summary: liveSummary,
    summaryError,
    loading: !isMock && summary === null && summaryError === null,
    displayStages, column, loadMore, retryColumn, refresh, upsert, remove, move, findDeal,
    retrySummary: () => setSummaryVersion((value) => value + 1),
  };
}
