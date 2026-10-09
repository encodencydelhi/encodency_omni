"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Saved inbox views live in this browser (localStorage): a name and the filter query string of the inbox.
 * They are a personal shortcut, not shared data, and the Queues page lists the same ones.
 */
export interface SavedView {
  id: string;
  name: string;
  search: string;
}

const KEY = "omni.support.desk.views";
const EVENT = "omni:support-views";
const EMPTY: SavedView[] = [];
let cache: { raw: string | null; value: SavedView[] } = { raw: null, value: EMPTY };

function read(): SavedView[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cache.raw) return cache.value;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const value = Array.isArray(parsed) ? parsed.filter((v): v is SavedView => typeof v?.id === "string" && typeof v?.name === "string" && typeof v?.search === "string").slice(0, 20) : EMPTY;
    cache = { raw, value: value.length ? value : EMPTY };
    return cache.value;
  } catch {
    return EMPTY;
  }
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function write(views: SavedView[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(views));
  } catch {
    /* storage can be blocked; the view then lasts until the page is closed */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useSavedViews() {
  const views = useSyncExternalStore(subscribe, read, () => EMPTY);
  const add = useCallback((name: string, search: string) => {
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed) return;
    write([...read().filter((v) => v.name.toLowerCase() !== trimmed.toLowerCase()), { id: crypto.randomUUID(), name: trimmed, search }]);
  }, []);
  const remove = useCallback((id: string) => write(read().filter((v) => v.id !== id)), []);
  return { views, add, remove };
}
