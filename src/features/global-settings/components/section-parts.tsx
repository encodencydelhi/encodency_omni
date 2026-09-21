"use client";

import { EyeIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/features/companies/components/primitives";
import { PanelSkeleton } from "@/features/companies/components/states";
import { cn } from "@/lib/utils/cn";
import { SECTION_ACCESS, SECTION_LAYOUT } from "../data/config";
import { useConfiguration, usePendingChanges } from "../data/hooks";
import { definitionsFor } from "../data/registry";
import type { ConfigurationChange, ConfigurationSnapshot, EditableSectionKey } from "../data/types";
import { SettingRow } from "./setting-field";
import { SettingsError } from "./states";
import type { SectionEditor } from "./use-section-editor";

/** Loads the configuration once for a section and hands it, with pending changes, to the render function. */
export function SectionData({ children, skeletonRows = 4 }: { children: (data: { config: ConfigurationSnapshot; pending: ConfigurationChange[] }) => ReactNode; skeletonRows?: number }) {
  const config = useConfiguration();
  const pending = usePendingChanges();
  if (config.error && !config.data) return <SettingsError subject="Configuration" error={config.error} onRetry={() => void config.refetch()} />;
  if (!config.data) {
    return (
      <div className="space-y-1" aria-busy="true" aria-label="Loading settings">
        <PanelSkeleton rows={skeletonRows} />
        <PanelSkeleton rows={skeletonRows} />
      </div>
    );
  }
  return <>{children({ config: config.data, pending: pending.data ?? [] })}</>;
}

/** Small tabs inside a section, kept in the URL so refresh and Back land on the same one. */
export function SubTabs<T extends string>({ tabs, current, label }: { tabs: ReadonlyArray<{ key: T; label: string }>; current: T; label: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const href = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", key);
    next.delete("focus");
    return `${pathname}?${next.toString()}`;
  };
  return (
    <nav aria-label={label} className="overflow-x-auto border-b border-border scrollbar-thin">
      <ul className="flex min-w-max gap-0.5">
        {tabs.map((tab) => {
          const active = tab.key === current;
          return (
            <li key={tab.key}>
              <Link
                href={href(tab.key)}
                replace
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn("relative inline-flex items-center px-3 py-2 text-[0.8125rem] font-medium transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {tab.label}
                {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-sm bg-primary" aria-hidden /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function useTab<T extends string>(tabs: ReadonlyArray<{ key: T }>): T {
  const value = useSearchParams().get("tab");
  return tabs.find((tab) => tab.key === value)?.key ?? (tabs[0]?.key as T);
}

export function useFocusKey(): string | null {
  return useSearchParams().get("focus");
}

/** Shown to people who can see a section but not change it. */
export function ViewOnlyNotice({ section }: { section: EditableSectionKey }) {
  return (
    <AlertBanner tone="info" title="View Only">
      You can review these settings but not change them. Editing needs {SECTION_ACCESS[section].editPermissions.join(" and ")}.
    </AlertBanner>
  );
}

/** A group of settings as one panel of compact, divided rows. */
export function SettingGroup({
  editor,
  group,
  title,
  description,
  action,
  compact,
  className,
}: {
  editor: SectionEditor;
  group: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const focus = useFocusKey();
  const layout = SECTION_LAYOUT[editor.section].find((item) => item.id === group);
  const definitions = definitionsFor(editor.section, group);
  return (
    <Panel title={title ?? layout?.title} description={description ?? layout?.description} action={action} flush className={className}>
      <div className="divide-y divide-border border-t border-border">
        {definitions.map((definition) => (
          <SettingRow
            key={definition.key}
            definition={definition}
            values={editor.values}
            saved={editor.saved}
            onChange={editor.set}
            error={editor.errors[definition.key]}
            readOnly={!editor.canEdit}
            pending={editor.pendingByKey[definition.key]}
            focused={focus === definition.key}
            compact={compact}
          />
        ))}
      </div>
    </Panel>
  );
}

/** A read-only table wrapper that stays inside the panel width and scrolls sideways when needed. */
export function TablePanel({ title, description, action, children, className }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Panel title={title} description={description} action={action} flush className={className}>
      <div className="border-t border-border">{children}</div>
    </Panel>
  );
}

export function ViewLink({ href, children = "View" }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-2xs font-medium text-primary hover:underline">
      <EyeIcon className="size-3" aria-hidden />
      {children}
    </Link>
  );
}

export function StateBadge({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return <Badge tone={ok ? "success" : "neutral"}>{ok ? yes : no}</Badge>;
}
