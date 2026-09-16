"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  Filter,
  ListChecks,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Store,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BulkAttributesDialog,
  BulkHoursDialog,
  BulkSpecialHoursDialog,
  ConnectLocationDialog,
  downloadCsv,
} from "../components/dialogs";
import {
  ActionMenu,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Meter,
  PageTitle,
  SearchField,
  SelectMenu,
  SortHeader,
  buttonClass,
  tdClass,
  thClass,
  useDebouncedSearch,
  type MenuItem,
  type SortDir,
} from "../components/ui";
import { useLocationScope, useQueryState, useWithContext } from "../data/hooks";
import { filterLocations, hoursAreComplete, profileCompletion } from "../data/selectors";
import { VERIFICATION_LABEL, gbRoutes } from "../lib/constants";
import { formatAddress, relative } from "../lib/format";
import { useGbp } from "../store/gbp-store";
import type { Location } from "../types";

const DEFAULTS = { q: "", verification: "all", status: "all", sync: "all", rating: "all", completion: "all", sort: "name", dir: "asc" };

export function LocationsPage() {
  const { locations, attributeDefinitions, can, syncLocations } = useGbp();
  const { values, set, reset, activeCount } = useQueryState(DEFAULTS);
  const withContext = useWithContext();
  const { setLocation } = useLocationScope();
  const { search, setSearch, pending } = useDebouncedSearch(values.q, (next) => set({ q: next }));

  const [selected, setSelected] = useState<string[]>([]);
  const [connectOpen, setConnectOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [specialOpen, setSpecialOpen] = useState(false);
  const [attributesOpen, setAttributesOpen] = useState(false);
  const [confirmSync, setConfirmSync] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const rows = useMemo(() => filterLocations(locations, values, attributeDefinitions), [locations, values, attributeDefinitions]);
  const validSelected = selected.filter((id) => rows.some((row) => row.locationId === id));
  const selectedLocations = locations.filter((location) => validSelected.includes(location.locationId));
  const allOnPage = rows.length > 0 && rows.every((row) => validSelected.includes(row.locationId));
  const someOnPage = rows.some((row) => validSelected.includes(row.locationId));
  const filtersActive = activeCount - (values.sort !== "name" ? 1 : 0) - (values.dir !== "asc" ? 1 : 0);

  const exportRows = (list: Location[]) => {
    downloadCsv(
      [
        ["Location", "Store code", "Address", "Verification", "Status", "Rating", "Reviews", "Profile completion", "Last sync", "Maps URL"],
        ...list.map((location) => [
          location.profile.title,
          location.storeCode,
          formatAddress(location.profile.address),
          VERIFICATION_LABEL[location.verification],
          location.openState,
          location.rating ?? "",
          location.reviewCount,
          `${profileCompletion(location, attributeDefinitions)}%`,
          location.sync.lastSyncedAt ?? "",
          location.mapsUri,
        ]),
      ],
      "google-business-locations.csv",
    );
  };

  const rowActions = (location: Location): (MenuItem | "separator")[] => [
    { label: "View location", icon: Eye, href: withContext(gbRoutes.location(location.locationId)) },
    { label: "Manage profile", icon: Pencil, href: `${gbRoutes.profile}?location=${location.locationId}`, gate: can.canEditProfile },
    { label: "View reviews", icon: Star, href: `${gbRoutes.reviews}?location=${location.locationId}` },
    { label: "View performance", icon: CalendarClock, href: `${gbRoutes.performance}?location=${location.locationId}`, gate: can.canViewPerformance },
    "separator",
    {
      label: "Sync now",
      icon: RefreshCw,
      gate: can.canSyncLocations,
      onSelect: async () => {
        setSyncingId(location.locationId);
        await syncLocations([location.locationId]);
        setSyncingId(null);
      },
    },
    { label: "Set as current location", icon: MapPin, onSelect: () => setLocation(location.locationId) },
    { label: "Open on Google", icon: ExternalLink, href: gbRoutes.mapsSearch(location.placeId), external: true },
  ];

  const toggleSort = (key: string) => {
    if (values.sort === key) set({ dir: values.dir === "asc" ? "desc" : "asc" });
    else set({ sort: key, dir: "asc" });
  };

  return (
    <div className="space-y-1">
      <PageTitle
        title="Locations"
        description="Every Google Business location connected to this client, with verification, rating and sync state."
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={() => exportRows(rows)} disabled={!rows.length} disabledReason="No locations to export">
              Export
            </Button>
            <Button variant="primary" icon={Plus} gate={can.canManageLocations} onClick={() => setConnectOpen(true)}>
              Add location
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-[#F1F3F4] px-3 py-2.5">
          <SearchField value={search} onChange={setSearch} loading={pending} placeholder="Search name, city or store code" className="w-full sm:w-[240px]" />
          <SelectMenu
            label="Verification"
            prefix="Verification:"
            value={values.verification}
            onChange={(value) => set({ verification: value })}
            options={[
              { value: "all", label: "All" },
              { value: "verified", label: "Verified" },
              { value: "pending", label: "Pending" },
              { value: "unverified", label: "Not verified" },
              { value: "duplicate", label: "Duplicate" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
          <SelectMenu
            label="Status"
            prefix="Status:"
            value={values.status}
            onChange={(value) => set({ status: value })}
            options={[
              { value: "all", label: "All" },
              { value: "open", label: "Open" },
              { value: "closed_temporarily", label: "Temporarily closed" },
              { value: "closed_permanently", label: "Permanently closed" },
            ]}
          />
          <SelectMenu
            label="Sync"
            prefix="Sync:"
            value={values.sync}
            onChange={(value) => set({ sync: value })}
            options={[
              { value: "all", label: "All" },
              { value: "synced", label: "Synced" },
              { value: "failed", label: "Failed" },
              { value: "never", label: "Never synced" },
            ]}
          />
          <SelectMenu
            label="Rating"
            prefix="Rating:"
            value={values.rating}
            onChange={(value) => set({ rating: value })}
            options={[
              { value: "all", label: "Any" },
              { value: "4.5", label: "4.5 and above" },
              { value: "4", label: "4.0 and above" },
              { value: "3", label: "3.0 and above" },
            ]}
          />
          <SelectMenu
            label="Profile completion"
            prefix="Profile:"
            value={values.completion}
            onChange={(value) => set({ completion: value })}
            options={[
              { value: "all", label: "Any" },
              { value: "complete", label: "80% and above" },
              { value: "incomplete", label: "Below 80%" },
            ]}
          />
          {filtersActive > 0 && (
            <Button
              size="sm"
              variant="ghost"
              icon={X}
              className="ml-auto"
              onClick={() => {
                setSearch("");
                reset(["sort", "dir", "location"]);
              }}
            >
              Clear {filtersActive} filter{filtersActive > 1 ? "s" : ""}
            </Button>
          )}
        </div>

        {validSelected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#F1F3F4] bg-[#E8F0FE] px-3 py-2" role="region" aria-label="Bulk actions">
            <span className="text-[12.5px] font-medium text-[#1967D2]">Selected {validSelected.length} location{validSelected.length > 1 ? "s" : ""}</span>
            <Button size="xs" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
            <span className="mx-1 h-4 w-px bg-[#D2E3FC]" />
            <Button size="sm" variant="secondary" icon={RefreshCw} gate={can.canSyncLocations} onClick={() => setConfirmSync(true)}>
              Sync selected
            </Button>
            <Button size="sm" variant="secondary" icon={Clock3} gate={can.canEditProfile} onClick={() => setHoursOpen(true)}>
              Update hours
            </Button>
            <Button size="sm" variant="secondary" icon={CalendarClock} gate={can.canEditProfile} onClick={() => setSpecialOpen(true)}>
              Special hours
            </Button>
            <Button size="sm" variant="secondary" icon={ListChecks} gate={can.canEditProfile} onClick={() => setAttributesOpen(true)}>
              Add attributes
            </Button>
            <Button size="sm" variant="secondary" icon={Download} onClick={() => exportRows(selectedLocations)}>
              Export
            </Button>
          </div>
        )}

        {locations.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No locations connected"
            description="Connect a Google Business account, or create the location in Google Business Profile and sync it here."
            action={
              <Button variant="primary" icon={Plus} gate={can.canManageLocations} onClick={() => setConnectOpen(true)}>
                Add location
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No locations match these filters"
            description="Try a different search term or clear the filters."
            action={
              <Button
                variant="secondary"
                icon={X}
                onClick={() => {
                  setSearch("");
                  reset(["sort", "dir", "location"]);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="scrollbar-thin hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className={cn(thClass, "w-10 pl-3.5")}>
                      <Checkbox
                        aria-label="Select all locations"
                        checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
                        onCheckedChange={(checked) => setSelected(checked ? rows.map((row) => row.locationId) : [])}
                      />
                    </th>
                    <SortHeader label="Location" active={values.sort === "name"} dir={values.dir as SortDir} onClick={() => toggleSort("name")} />
                    <th className={thClass}>Verification</th>
                    <SortHeader label="Rating" align="right" active={values.sort === "rating"} dir={values.dir as SortDir} onClick={() => toggleSort("rating")} />
                    <SortHeader label="Reviews" align="right" active={values.sort === "reviews"} dir={values.dir as SortDir} onClick={() => toggleSort("reviews")} />
                    <SortHeader label="Profile" active={values.sort === "completion"} dir={values.dir as SortDir} onClick={() => toggleSort("completion")} />
                    <SortHeader label="Last sync" active={values.sort === "sync"} dir={values.dir as SortDir} onClick={() => toggleSort("sync")} />
                    <th className={thClass}>Status</th>
                    <th className={cn(thClass, "pr-3.5 text-right")}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((location) => {
                    const completion = profileCompletion(location, attributeDefinitions);
                    const isSelected = validSelected.includes(location.locationId);
                    return (
                      <tr key={location.locationId} className={cn("group", isSelected ? "bg-[#F8FBFF]" : "hover:bg-[#F8F9FA]")}>
                        <td className={cn(tdClass, "pl-3.5")}>
                          <Checkbox
                            aria-label={`Select ${location.profile.title}`}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              setSelected((prev) => (checked ? [...prev, location.locationId] : prev.filter((id) => id !== location.locationId)))
                            }
                          />
                        </td>
                        <td className={cn(tdClass, "max-w-[300px]")}>
                          <Link href={withContext(gbRoutes.location(location.locationId))} className="block">
                            <span className="block truncate text-[12.5px] font-medium text-[#202124] group-hover:text-[#1A73E8]">{location.profile.title}</span>
                            <span className="block truncate text-[11.5px] text-[#5F6368]">
                              {formatAddress(location.profile.address, { short: true })} · {location.storeCode}
                            </span>
                          </Link>
                        </td>
                        <td className={tdClass}>
                          <Badge tone={location.verification === "verified" ? "green" : location.verification === "pending" ? "amber" : "red"}>
                            {VERIFICATION_LABEL[location.verification]}
                          </Badge>
                        </td>
                        <td className={cn(tdClass, "text-right")}>
                          {location.rating === null ? (
                            <span className="text-[#80868B]">-</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium tabular-nums text-[#202124]">
                              {location.rating.toFixed(1)}
                              <Star className="size-3 fill-[#FBBC04] text-[#FBBC04]" />
                            </span>
                          )}
                        </td>
                        <td className={cn(tdClass, "text-right tabular-nums")}>
                          <Link href={`${gbRoutes.reviews}?location=${location.locationId}`} className="hover:text-[#1A73E8] hover:underline">
                            {location.reviewCount}
                          </Link>
                        </td>
                        <td className={tdClass}>
                          <span className="flex items-center gap-2">
                            <Meter value={completion} tone={completion >= 80 ? "green" : completion >= 60 ? "amber" : "red"} className="w-16" />
                            <span className="tabular-nums">{completion}%</span>
                            {!hoursAreComplete(location) && (
                              <Badge tone="amber" icon={TriangleAlert}>
                                Hours
                              </Badge>
                            )}
                          </span>
                        </td>
                        <td className={cn(tdClass, "text-[12px]")}>
                          {location.sync.state === "failed" ? (
                            <Badge tone="amber" icon={TriangleAlert}>Sync failed</Badge>
                          ) : syncingId === location.locationId || location.sync.state === "syncing" ? (
                            <Badge tone="blue">Syncing</Badge>
                          ) : (
                            <span className="text-[#5F6368]">{relative(location.sync.lastSyncedAt)}</span>
                          )}
                        </td>
                        <td className={tdClass}>
                          <Badge tone={location.openState === "open" ? "green" : location.openState === "closed_temporarily" ? "amber" : "neutral"}>
                            {location.openState === "open" ? "Open" : location.openState === "closed_temporarily" ? "Temporarily closed" : "Permanently closed"}
                          </Badge>
                        </td>
                        <td className={cn(tdClass, "pr-3.5 text-right")}>
                          <ActionMenu
                            label={`Actions for ${location.profile.title}`}
                            items={rowActions(location)}
                            trigger={
                              <button type="button" className={buttonClass("ghost", "icon")}>
                                <MoreHorizontal className="size-4" />
                              </button>
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-[#F1F3F4] md:hidden">
              {rows.map((location) => {
                const completion = profileCompletion(location, attributeDefinitions);
                return (
                  <li key={location.locationId} className="flex gap-1 px-3 py-3">
                    <Checkbox
                      className="mt-1"
                      aria-label={`Select ${location.profile.title}`}
                      checked={validSelected.includes(location.locationId)}
                      onCheckedChange={(checked) =>
                        setSelected((prev) => (checked ? [...prev, location.locationId] : prev.filter((id) => id !== location.locationId)))
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1">
                        <Link href={withContext(gbRoutes.location(location.locationId))} className="line-clamp-2 flex-1 text-[12.5px] font-medium text-[#202124]">
                          {location.profile.title}
                        </Link>
                        <ActionMenu
                          label={`Actions for ${location.profile.title}`}
                          items={rowActions(location)}
                          trigger={
                            <button type="button" className={buttonClass("ghost", "iconSm", "-mt-1")}>
                              <MoreHorizontal className="size-4" />
                            </button>
                          }
                        />
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-[#5F6368]">{formatAddress(location.profile.address, { short: true })}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge tone={location.verification === "verified" ? "green" : location.verification === "pending" ? "amber" : "red"}>
                          {VERIFICATION_LABEL[location.verification]}
                        </Badge>
                        {location.rating !== null && (
                          <Badge tone="neutral" icon={Star}>
                            {location.rating.toFixed(1)} ({location.reviewCount})
                          </Badge>
                        )}
                        <Badge tone={completion >= 80 ? "green" : "amber"}>{completion}% complete</Badge>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-[#F1F3F4] px-4 py-2.5 text-[12px] text-[#5F6368]">
              Showing <b className="font-medium text-[#202124]">{rows.length}</b> of <b className="font-medium text-[#202124]">{locations.length}</b> locations
            </div>
          </>
        )}
      </Card>

      <ConnectLocationDialog open={connectOpen} onOpenChange={setConnectOpen} />
      <BulkHoursDialog open={hoursOpen} onOpenChange={setHoursOpen} locationIds={validSelected} />
      <BulkSpecialHoursDialog open={specialOpen} onOpenChange={setSpecialOpen} locationIds={validSelected} />
      <BulkAttributesDialog open={attributesOpen} onOpenChange={setAttributesOpen} locationIds={validSelected} />
      <ConfirmDialog
        open={confirmSync}
        onOpenChange={setConfirmSync}
        destructive={false}
        title={`Sync ${validSelected.length} location${validSelected.length > 1 ? "s" : ""} with Google?`}
        description="OmniPlatform pulls the latest profile, reviews and media for the selected locations. Local edits that have not been saved to Google may be overwritten."
        affected={selectedLocations.map((location) => location.profile.title)}
        confirmLabel="Sync now"
        onConfirm={() => syncLocations(validSelected)}
      />
    </div>
  );
}
