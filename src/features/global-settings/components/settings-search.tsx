"use client";

import { ArrowUpRightIcon, SearchIcon, SearchXIcon, XIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { searchSettings } from "../data/selectors";
import { useSettingsGuard } from "./settings-guard";

/**
 * Searches every Global Setting - by name, description, category, key and owner -
 * plus the settings that live in other modules. Selecting a result goes to the
 * right section, tab and setting, or to the owning module, never to a duplicate editor.
 */
export function SettingsSearch({ className }: { className?: string }) {
  const listId = useId();
  const guard = useSettingsGuard();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const hits = useMemo(() => searchSettings(query), [query]);
  const showing = open && query.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const choose = (index: number) => {
    const hit = hits[index];
    if (!hit) return;
    setOpen(false);
    setQuery("");
    guard.navigate(hit.href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((current) => Math.min(hits.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
    } else if (event.key === "Enter" && showing) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape") {
      if (query) setQuery("");
      else setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        role="combobox"
        aria-expanded={showing}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showing && hits[active] ? `${listId}-${active}` : undefined}
        aria-label="Search settings"
        value={query}
        placeholder="Search settings, policies or configuration..."
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-8 pl-8 pr-8 text-[0.8125rem]"
      />
      {query ? (
        <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground">
          <XIcon className="size-3.5" />
        </button>
      ) : null}

      {showing ? (
        <div id={listId} role="listbox" aria-label="Search results" className="absolute top-full right-0 left-0 z-40 mt-1 max-h-[26rem] min-w-[20rem] overflow-y-auto rounded-sm border border-border bg-popover shadow-lg sm:left-auto sm:w-[30rem]">
          {hits.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
              <SearchXIcon className="size-5 text-muted-foreground" aria-hidden />
              <p className="text-[0.8125rem] font-medium text-foreground">No settings match &ldquo;{query.trim()}&rdquo;</p>
              <p className="text-2xs text-muted-foreground">Try a setting name, a category such as security, or a key.</p>
            </div>
          ) : (
            hits.map((hit, index) => (
              <div
                key={hit.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={cn("flex cursor-pointer items-start gap-2 border-b border-border px-3 py-2 last:border-b-0", index === active && "bg-accent")}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem] font-medium text-foreground">{hit.name}</p>
                  <p className="truncate text-2xs text-muted-foreground">
                    {hit.external ? hit.sectionLabel : `${hit.sectionLabel}${hit.groupLabel ? ` / ${hit.groupLabel}` : ""}`}
                  </p>
                  <p className="line-clamp-1 text-2xs text-muted-foreground">{hit.description}</p>
                </div>
                {hit.external ? (
                  <Badge tone="neutral" className="shrink-0"><ArrowUpRightIcon />Managed in Another Module</Badge>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
