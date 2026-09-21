"use client";

import { useState } from "react";
import { Panel } from "@/features/companies/components/primitives";
import { TableSkeleton } from "@/features/companies/components/states";
import { CHANGE_TYPE } from "../../data/config";
import { useChanges } from "../../data/hooks";
import type { FlagDetail } from "../../data/repository";
import type { Environment, FlagChange } from "../../data/types";
import { ago } from "../../lib/format";
import { ResultBadge } from "../badges";
import { ChangeDrawer, ChangesTable, VersionsPanel } from "../change-views";
import { FlagsError } from "../states";

/** Everything that happened to this flag: its changes in this environment, the log, and its versions. */
export function ActivityTab({ detail, environment }: { detail: FlagDetail; environment: Environment }) {
  const { flag } = detail;
  const changes = useChanges({ flagKey: flag.key, environment, pageSize: 50 });
  const [open, setOpen] = useState<FlagChange | null>(null);

  return (
    <div className="space-y-1">
      <Panel title="Changes In This Environment" description="Applied, pending, scheduled, draft and cancelled changes. Select one for its detail." flush>
        {changes.error && !changes.data ? (
          <FlagsError subject="Changes" error={changes.error} onRetry={() => void changes.refetch()} />
        ) : !changes.data ? (
          <TableSkeleton rows={4} columns={5} />
        ) : (
          <ChangesTable rows={changes.data.rows} showFlag={false} onOpen={setOpen} empty={{ title: "No Changes Yet", description: "Changes to this flag in this environment will be listed here." }} />
        )}
      </Panel>

      <Panel title="Activity Log" description="Every recorded event for this flag across environments." flush>
        {detail.activity.length === 0 ? (
          <p className="px-3 pb-3 text-[0.8125rem] text-muted-foreground">No activity recorded.</p>
        ) : (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto scrollbar-thin">
            {detail.activity.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] font-medium text-foreground">{CHANGE_TYPE[item.type]}{item.environment ? <span className="font-normal capitalize text-muted-foreground"> - {item.environment}</span> : null}</p>
                  <p className="text-2xs text-muted-foreground">{item.summary}</p>
                </div>
                <div className="shrink-0 text-right"><ResultBadge result={item.result} /><p className="mt-0.5 text-2xs text-muted-foreground">{item.actor} - {ago(item.at)}</p></div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <VersionsPanel flagKey={flag.key} environment={environment} />
      <ChangeDrawer change={open} onClose={() => setOpen(null)} />
    </div>
  );
}
