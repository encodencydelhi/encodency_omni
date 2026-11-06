"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type SetStateAction } from 'react';
import { crmApi, type CrmKind, type CrmScope } from '../data/crm-api';
import { CrmCursorController } from '../data/crm-cursor-controller';
import type { CrmPage } from '../data/crm-pagination';

export interface CrmPageFilters { search?: string; filter?: string; priority?: string; type?: string; sort?: string; dir?: "asc" | "desc"; status?: string; source?: string; ownerId?: string; group?: string; tag?: string; limit: number }

export function useCrmCursor<T>({ kind, scope, ready, query, normalize, preview, fetchPage }: { kind: CrmKind; scope: CrmScope | null; ready: boolean; query: CrmPageFilters; normalize: (row: T) => T; preview?: T[]; fetchPage?: (scope: CrmScope, query: CrmPageFilters, cursor: string | undefined) => Promise<CrmPage<T>> }) {
  const [controller] = useState(() => new CrmCursorController<T>());
  // Preview filtering remains local: changing a filter must not reset locally edited sample records.
  const key = JSON.stringify([kind, scope?.companyId, scope?.clientId, preview === undefined ? query : 'preview']);
  const currentKey = useRef(key);
  const inputs = useRef({ kind, scope, ready, query, normalize, preview, fetchPage });
  useLayoutEffect(() => {
    currentKey.current = key;
    inputs.current = { kind, scope, ready, query, normalize, preview, fetchPage };
  }, [key, kind, scope, ready, query, normalize, preview, fetchPage]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => {
    const timer = setTimeout(() => {
      const frozen = inputs.current;
      if (!frozen.ready && frozen.preview === undefined) return;
      void controller.configure(key, async (cursor) => {
        if (frozen.preview) return { items: frozen.preview, page: { hasMore: false, nextCursor: null } };
        if (!frozen.ready || !frozen.scope) throw new Error('Select a Client to view CRM records.');
        const result = frozen.fetchPage ? await frozen.fetchPage({ ...frozen.scope }, frozen.query, cursor) : await crmApi.listPage<T>(frozen.kind, { ...frozen.query, cursor }, { ...frozen.scope });
        return { ...result, items: result.items.map(frozen.normalize) };
      });
    }, 200);
    return () => { clearTimeout(timer); controller.invalidate(); };
  }, [controller, key, ready]);
  const setRows = useCallback((change: SetStateAction<T[]>) => {
    if (currentKey.current !== key) return;
    controller.updateFor(key, change);
    // A mutation may move a record out of the active server filter or change page membership.
    // Re-read that single page rather than inventing its new position or aggregating the dataset.
    if (inputs.current.preview === undefined) void controller.reloadFor(key);
  }, [controller, key]);
  const isCurrent = useCallback(() => currentKey.current === key, [key]);
  const reload = useCallback(() => inputs.current.preview === undefined ? controller.reloadFor(key) : Promise.resolve(), [controller, key]);
  const next = useCallback(() => controller.nextFor(key), [controller, key]);
  const previous = useCallback(() => controller.previousFor(key), [controller, key]);
  const current = state.key === key && (ready || preview !== undefined);
  return { key, isCurrent, rows: current ? state.rows : preview ?? [], setRows, reload, next, previous,
    isLoading: !current || state.loading, error: current ? state.error : null,
    hasMore: current && state.hasMore, hasPrevious: current && state.history.length > 0, pageNumber: current ? state.history.length + 1 : 1 };
}
