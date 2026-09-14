"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  Plus,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { audiences, getAdSet } from "@/features/admin/meta-ads/data";
import { compactNum, num, pct, relative } from "@/features/admin/meta-ads/format";
import { useFilters } from "@/features/admin/meta-ads/use-filters";
import {
  btn,
  btnPrimary,
  card,
  EmptyState,
  FilterBar,
  FilterSelect,
  KpiCard,
  LinkTabs,
  RowMenu,
  SearchInput,
  SkeletonTable,
  TableShell,
  Tag,
  Td,
  Th,
  ToneChip,
  Tr,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";
import type { Audience } from "@/features/admin/meta-ads/types";

const DEFAULTS = {
  q: "",
  tab: "saved",
  source: "All Sources",
  status: "All Statuses",
};

const TABS = [
  { id: "saved", label: "Saved Audiences" },
  { id: "custom", label: "Custom Audiences" },
  { id: "lookalike", label: "Lookalike Audiences" },
];

const STATUS_TONE = {
  Ready: "green",
  Updating: "blue",
  "Sync failed": "red",
  "Too small": "amber",
} as const;

function AudiencesView() {
  const { values, setFilter, reset, isFiltered } = useFilters(DEFAULTS);

  const rows = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    return audiences.filter((a) => {
      if (a.kind !== values.tab) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      if (values.source !== DEFAULTS.source && a.source !== values.source) return false;
      if (values.status !== DEFAULTS.status && a.status !== values.status) return false;
      return true;
    });
  }, [values]);

  const kpis = useMemo(
    () => ({
      total: audiences.length,
      used: audiences.filter((a) => a.usedIn.length > 0).length,
      active: audiences.filter((a) => a.status === "Ready").length,
      issues: audiences.filter((a) => a.status === "Sync failed" || a.status === "Too small")
        .length,
    }),
    [],
  );

  const sourceOptions = useMemo(
    () => [
      DEFAULTS.source,
      ...Array.from(
        new Set(audiences.filter((a) => a.kind === values.tab).map((a) => a.source)),
      ).sort(),
    ],
    [values.tab],
  );

  return (
    <AdsWorkspace
      showDateRange={false}
      actions={
        <button
          type="button"
          onClick={() => toast.success("Opening the audience builder…")}
          className={cn(btnPrimary, "h-10")}
        >
          <Plus className="size-3.5" />
          Create Audience
        </button>
      }
    >
      <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard label="Total Audiences" value={kpis.total} icon={UsersRound} />
        <KpiCard label="Used in Campaigns" value={kpis.used} icon={Layers} />
        <KpiCard label="Ready" value={kpis.active} icon={CheckCircle2} tone="green" />
        <KpiCard
          label="Sync Issues"
          value={kpis.issues}
          icon={AlertTriangle}
          tone={kpis.issues > 0 ? "red" : "green"}
        />
      </section>

      <section className={cn(card, "overflow-hidden")}>
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-white px-4 py-1">
          <LinkTabs
            tabs={TABS.map((t) => ({
              ...t,
              href:
                t.id === "saved"
                  ? `${ADS_ROOT}/audiences`
                  : `${ADS_ROOT}/audiences?tab=${t.id}`,
              count: audiences.filter((a) => a.kind === t.id).length,
            }))}
            current={values.tab}
            className="border-b-0"
          />
        </div>

        <FilterBar>
          <FilterSelect
            label="Source"
            value={values.source}
            onChange={(v) => setFilter("source", v)}
            options={sourceOptions}
            minWidth={190}
          />
          <FilterSelect
            label="Status"
            value={values.status}
            onChange={(v) => setFilter("status", v)}
            options={["All Statuses", "Ready", "Updating", "Sync failed", "Too small"]}
            minWidth={160}
          />
          <SearchInput
            placeholder="Search audiences…"
            value={values.q}
            onChange={(v) => setFilter("q", v)}
          />
          {isFiltered && (
            <button type="button" onClick={reset} className={btn}>
              Clear
            </button>
          )}
        </FilterBar>

        {rows.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={isFiltered ? "No audiences match these filters" : "Create an audience"}
            description={
              isFiltered
                ? "Try another source or status, or clear the filters."
                : values.tab === "lookalike"
                  ? "Lookalike audiences find people who resemble your best leads or donors."
                  : values.tab === "custom"
                    ? "Custom audiences are built from your own data: customer lists, website visitors, or people who engaged on Facebook and Instagram."
                    : "Saved audiences store a reusable combination of location, age, gender and interests."
            }
            action={
              isFiltered
                ? undefined
                : {
                    label: "Create Audience",
                    onClick: () => toast.success("Opening the audience builder…"),
                  }
            }
            secondary={{ label: "Audience guide", href: `${ADS_ROOT}/help?category=audiences` }}
            compact={isFiltered}
          />
        ) : values.tab === "saved" ? (
          <SavedTable rows={rows} />
        ) : values.tab === "custom" ? (
          <CustomTable rows={rows} />
        ) : (
          <LookalikeTable rows={rows} />
        )}
      </section>
    </AdsWorkspace>
  );
}

function UsedIn({ audience }: { audience: Audience }) {
  if (audience.usedIn.length === 0)
    return <span className="text-[#94a3b8]">Not in use</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {audience.usedIn.map((id) => {
        const set = getAdSet(id);
        return (
          <Link key={id} href={`${ADS_ROOT}/adsets/${id}`}>
            <Tag>{set?.name ?? id}</Tag>
          </Link>
        );
      })}
    </span>
  );
}

function AudienceMenu({ audience }: { audience: Audience }) {
  return (
    <RowMenu
      label={`Actions for ${audience.name}`}
      groups={[
        [
          {
            label: "Edit",
            onSelect: () => toast.success(`Editing “${audience.name}”`),
          },
          {
            label: "Duplicate",
            onSelect: () => toast.success(`Duplicating “${audience.name}”…`),
          },
          { label: "Use in Ad Set", href: `${ADS_ROOT}/create?audience=${audience.id}&step=adset` },
        ],
        [
          ...(audience.status === "Sync failed"
            ? [
                {
                  label: "Retry sync",
                  onSelect: () => toast.success(`Re-syncing “${audience.name}”…`),
                },
              ]
            : []),
          {
            label: "Archive",
            danger: true,
            onSelect: () => toast.success(`Archived “${audience.name}”`),
          },
        ],
      ]}
    />
  );
}

function SavedTable({ rows }: { rows: Audience[] }) {
  return (
    <TableShell minWidth={1180}>
      <thead>
        <tr>
          {["Name", "Location", "Age", "Gender", "Interests"].map((h) => (
            <Th key={h}>{h}</Th>
          ))}
          <Th numeric>Estimated Size</Th>
          <Th>Used In</Th>
          <Th>Status</Th>
          <Th>Last Updated</Th>
          <Th>Actions</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <Tr key={a.id}>
            <Td>
              <span className="block max-w-[200px] truncate font-semibold" title={a.name}>
                {a.name}
              </span>
              <span className="block text-[9px] text-[#64748b]">{a.source}</span>
            </Td>
            <Td>
              <span className="block max-w-[200px] truncate" title={a.locations}>
                {a.locations}
              </span>
            </Td>
            <Td>{a.ageRange}</Td>
            <Td>{a.gender}</Td>
            <Td>
              <span className="flex flex-wrap gap-1">
                {a.interests.slice(0, 2).map((i) => (
                  <Tag key={i}>{i}</Tag>
                ))}
                {a.interests.length > 2 && (
                  <span className="text-[9px] text-[#64748b]">+{a.interests.length - 2}</span>
                )}
              </span>
            </Td>
            <Td numeric>{compactNum(a.size)}</Td>
            <Td>
              <UsedIn audience={a} />
            </Td>
            <Td>
              <ToneChip tone={STATUS_TONE[a.status]}>{a.status}</ToneChip>
            </Td>
            <Td>{relative(a.lastSync)}</Td>
            <Td>
              <AudienceMenu audience={a} />
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableShell>
  );
}

function CustomTable({ rows }: { rows: Audience[] }) {
  return (
    <TableShell minWidth={1000}>
      <thead>
        <tr>
          <Th>Audience Name</Th>
          <Th>Source</Th>
          <Th numeric>Size</Th>
          <Th numeric>Match Rate</Th>
          <Th>Used In</Th>
          <Th>Status</Th>
          <Th>Last Sync</Th>
          <Th>Actions</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <Tr key={a.id}>
            <Td>
              <span className="block max-w-[220px] truncate font-semibold" title={a.name}>
                {a.name}
              </span>
            </Td>
            <Td>{a.source}</Td>
            <Td numeric>{num(a.size)}</Td>
            <Td numeric>{a.matchRate !== null ? pct(a.matchRate, 0) : "—"}</Td>
            <Td>
              <UsedIn audience={a} />
            </Td>
            <Td>
              <span className="flex items-center gap-1.5">
                <ToneChip tone={STATUS_TONE[a.status]}>{a.status}</ToneChip>
                {a.status === "Sync failed" && (
                  <button
                    type="button"
                    onClick={() => toast.success(`Re-syncing “${a.name}”…`)}
                    className="flex items-center gap-1 text-[9px] font-semibold text-[#0671e9] hover:underline"
                  >
                    <RefreshCw className="size-3" aria-hidden="true" />
                    Retry
                  </button>
                )}
              </span>
            </Td>
            <Td>{relative(a.lastSync)}</Td>
            <Td>
              <AudienceMenu audience={a} />
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableShell>
  );
}

function LookalikeTable({ rows }: { rows: Audience[] }) {
  return (
    <TableShell minWidth={1000}>
      <thead>
        <tr>
          <Th>Audience Name</Th>
          <Th>Source Audience</Th>
          <Th>Country</Th>
          <Th numeric>Similarity</Th>
          <Th numeric>Estimated Size</Th>
          <Th>Used In</Th>
          <Th>Status</Th>
          <Th>Actions</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <Tr key={a.id}>
            <Td>
              <span className="block max-w-[220px] truncate font-semibold" title={a.name}>
                {a.name}
              </span>
            </Td>
            <Td>
              <Link href={`${ADS_ROOT}/audiences?tab=custom`} className="text-[#0671e9] hover:underline">
                {a.sourceAudience ?? "—"}
              </Link>
            </Td>
            <Td>{a.country ?? "—"}</Td>
            <Td numeric>{a.similarity !== null ? `${a.similarity}%` : "—"}</Td>
            <Td numeric>{compactNum(a.size)}</Td>
            <Td>
              <UsedIn audience={a} />
            </Td>
            <Td>
              <ToneChip tone={STATUS_TONE[a.status]}>{a.status}</ToneChip>
            </Td>
            <Td>
              <AudienceMenu audience={a} />
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableShell>
  );
}

export default function AudiencesPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={6} columns={8} />}>
      <AudiencesView />
    </Suspense>
  );
}
