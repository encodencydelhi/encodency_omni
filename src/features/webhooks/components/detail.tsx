/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Detail-page scaffolding: header, URL-synced tabs, collapsed technical context.
 */

"use client";

import { ArrowLeftIcon, ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { DefinitionList, type DefinitionItem } from "@/components/shared/definition-list";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils/cn";
import { SectionCard } from "./cells";
import { Mono } from "./kit";

export function DetailHeader({
  backHref,
  backLabel,
  title,
  eyebrow,
  subtitle,
  badges,
  actions,
  meta,
}: {
  backHref: string;
  backLabel: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeftIcon className="size-3.5" />
        {backLabel}
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow}
          <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {subtitle ? <p className="text-[0.8125rem] text-muted-foreground">{subtitle}</p> : null}
          {badges ? <div className="flex flex-wrap items-center gap-1.5">{badges}</div> : null}
          {meta}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Tabs whose active state lives in the URL, so refresh and browser history keep working. */
export function useUrlTab<T extends string>(items: ReadonlyArray<TabItem<T>>, param = "tab"): [T, (next: T) => void] {
  const router = useRouter();
  const search = useSearchParams();
  const requested = search.get(param);
  const value = (items.find((item) => item.value === requested)?.value ?? items[0]!.value) as T;
  const set = (next: T) => {
    const params = new URLSearchParams(window.location.search);
    params.set(param, next);
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };
  return [value, set];
}

export function TabBar<T extends string>({ items, value, onChange, label }: { items: ReadonlyArray<TabItem<T>>; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-0.5 overflow-x-auto border-b border-border scrollbar-thin">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-[0.8125rem] font-medium outline-none transition-colors focus-visible:bg-accent",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {item.count !== undefined ? <span className="rounded-sm bg-muted px-1.5 text-2xs tabular text-muted-foreground">{item.count}</span> : null}
            {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Label/value card. Values are already formatted by the caller. */
export function InfoCard({ title, description, items, columns = 2, action, className }: { title: string; description?: string; items: DefinitionItem[]; columns?: 1 | 2 | 3; action?: ReactNode; className?: string }) {
  return (
    <SectionCard title={title} description={description} action={action} className={className}>
      <DefinitionList items={items} columns={columns} />
    </SectionCard>
  );
}

/** Sanitized technical fields, collapsed by default. */
export function TechnicalContext({ fields, note }: { fields: Record<string, string | number | boolean | null | undefined>; note?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-sm border border-border bg-card shadow-xs">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left outline-none focus-visible:bg-accent">
        <span>
          <span className="block text-sm font-semibold text-foreground">Technical Context (sanitized)</span>
          <span className="block text-2xs text-muted-foreground">{note ?? "Secrets, credentials and private payloads are never shown."}</span>
        </span>
        <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="grid gap-1 border-t border-border p-3 sm:grid-cols-2">
          {Object.entries(fields).map(([key, value]) => (
            <div key={key} className="rounded-sm border border-border bg-surface-sunken px-2.5 py-2">
              <dt className="text-2xs text-muted-foreground">{key}</dt>
              <dd className="mt-0.5 break-all"><Mono>{value === null || value === undefined ? "Not recorded" : String(value)}</Mono></dd>
            </div>
          ))}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}
