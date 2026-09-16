"use client";

import { useMemo, useState } from "react";
import { Filter, ImageIcon, MoreHorizontal, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { MediaPreviewDialog, UploadMediaDialog } from "../components/dialogs";
import { CapabilityState } from "../components/states";
import {
  ActionMenu,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PageTitle,
  SelectMenu,
  Thumb,
  UnderlineTabs,
  buttonClass,
  gb,
  type MenuItem,
} from "../components/ui";
import { useLocationScope, useQueryState } from "../data/hooks";
import { ALL_LOCATIONS, filterMedia } from "../data/selectors";
import { MEDIA_CATEGORIES, MEDIA_CATEGORY_LABEL, gbRoutes } from "../lib/constants";
import { date as fmtDate, fileSize, relative } from "../lib/format";
import { useGbp } from "../store/gbp-store";
import type { MediaCategory, MediaItem } from "../types";

const DEFAULTS = { category: "all", location: ALL_LOCATIONS, date: "all" };

export function MediaPage() {
  const { can } = useGbp();
  const [uploadOpen, setUploadOpen] = useState(false);
  return (
    <div className="space-y-1">
      <PageTitle
        title="Media"
        description="Photos and video on your Google Business Profile, by location and category."
        actions={
          <Button variant="primary" icon={Upload} gate={can.canManageMedia} onClick={() => setUploadOpen(true)}>
            Upload media
          </Button>
        }
      />
      <MediaWorkspace />
      <UploadMediaDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}

export function MediaWorkspace({ lockedLocationId }: { lockedLocationId?: string }) {
  const { media, locations, can, deleteMedia } = useGbp();
  const { selected: scopeLocation } = useLocationScope();
  const { values, set, reset } = useQueryState(DEFAULTS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const locationFilter = lockedLocationId ?? (values.location !== ALL_LOCATIONS ? values.location : scopeLocation);
  const scoped = useMemo(
    () => (locationFilter === ALL_LOCATIONS ? media : media.filter((item) => item.locationId === locationFilter)),
    [media, locationFilter],
  );
  const rows = useMemo(() => filterMedia(scoped, { category: values.category, date: values.date }), [scoped, values]);
  const validSelected = selectedIds.filter((id) => rows.some((row) => row.mediaId === id));
  const filtersActive = (["category", "date"] as const).filter((key) => values[key] !== DEFAULTS[key]).length + (!lockedLocationId && values.location !== ALL_LOCATIONS ? 1 : 0);

  const counts = useMemo(() => {
    const byCategory = Object.fromEntries(MEDIA_CATEGORIES.map((category) => [category, scoped.filter((item) => item.category === category).length])) as Record<MediaCategory, number>;
    return { all: scoped.length, ...byCategory };
  }, [scoped]);

  const itemMenu = (item: MediaItem): (MenuItem | "separator")[] => [
    { label: "Preview", icon: ImageIcon, onSelect: () => setPreview(item) },
    { label: "Replace", icon: Upload, onSelect: () => setUploadOpen(true), gate: can.canManageMedia },
    { label: "Open location", icon: ImageIcon, href: gbRoutes.location(item.locationId), hidden: Boolean(lockedLocationId) },
    "separator",
    { label: "Delete", icon: Trash2, danger: true, onSelect: () => setConfirmDelete([item.mediaId]), gate: can.canDeleteMedia },
  ];

  if (!can.canReadLocations.allowed) {
    return (
      <Card>
        <CapabilityState capability={can.canReadLocations} title="Media unavailable" />
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      <Card>
        <div className="border-b border-[#F1F3F4] px-3 pt-1">
          <UnderlineTabs
            label="Media category"
            value={values.category}
            onChange={(value) => set({ category: value })}
            items={[
              { value: "all", label: "All", count: counts.all },
              ...MEDIA_CATEGORIES.filter((category) => counts[category] > 0 || category === "LOGO" || category === "COVER").map((category) => ({
                value: category,
                label: MEDIA_CATEGORY_LABEL[category],
                count: counts[category],
              })),
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          {!lockedLocationId && (
            <SelectMenu
              label="Location"
              prefix="Location:"
              className="max-w-[240px]"
              value={values.location}
              onChange={(value) => set({ location: value })}
              options={[{ value: ALL_LOCATIONS, label: "All locations" }, ...locations.map((item) => ({ value: item.locationId, label: item.profile.title }))]}
            />
          )}
          <SelectMenu
            label="Date"
            prefix="Uploaded:"
            value={values.date}
            onChange={(value) => set({ date: value })}
            options={[
              { value: "all", label: "Any time" },
              { value: "30d", label: "Last 30 days" },
              { value: "90d", label: "Last 90 days" },
              { value: "365d", label: "Last year" },
            ]}
          />
          <Button size="sm" variant="secondary" icon={Upload} gate={can.canManageMedia} onClick={() => setUploadOpen(true)}>
            Upload
          </Button>
          {filtersActive > 0 && (
            <Button size="sm" variant="ghost" icon={X} className="ml-auto" onClick={() => reset(["location"])}>
              Clear {filtersActive} filter{filtersActive > 1 ? "s" : ""}
            </Button>
          )}
        </div>
        {validSelected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[#F1F3F4] bg-[#E8F0FE] px-3 py-2">
            <span className="text-[12.5px] font-medium text-[#1967D2]">Selected {validSelected.length} item{validSelected.length > 1 ? "s" : ""}</span>
            <Button size="xs" variant="ghost" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
            <Button size="sm" variant="danger" icon={Trash2} gate={can.canDeleteMedia} onClick={() => setConfirmDelete(validSelected)}>
              Delete selected
            </Button>
          </div>
        )}
      </Card>

      {scoped.length === 0 ? (
        <Card>
          <EmptyState
            icon={ImageIcon}
            title="No media yet"
            description="Profiles with photos get more direction requests and website clicks. Upload exterior, interior and team photos to start."
            action={
              <Button variant="primary" icon={Upload} gate={can.canManageMedia} onClick={() => setUploadOpen(true)}>
                Upload your first photo
              </Button>
            }
          />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Filter}
            title="No media matches"
            description="Try another category, location or date range."
            action={
              <Button variant="secondary" icon={X} onClick={() => reset(["location"])}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-1 md:grid-cols-4 xl:grid-cols-6">
          {rows.map((item) => {
            const location = locations.find((entry) => entry.locationId === item.locationId);
            const isSelected = validSelected.includes(item.mediaId);
            return (
              <Card key={item.mediaId} className={cn("group relative overflow-hidden transition", isSelected ? "border-[#1A73E8] ring-[3px] ring-[#1A73E8]/10" : "hover:border-[#C6C9CD]")}>
                <button type="button" onClick={() => setPreview(item)} className={cn("block w-full", gb.focus)} aria-label={`Preview ${MEDIA_CATEGORY_LABEL[item.category]} photo`}>
                  <Thumb src={item.thumbnailUrl} className="w-full rounded-none" sizes="(min-width: 1280px) 220px, 45vw" />
                </button>
                <span className="absolute left-2 top-2 rounded bg-white/90 p-0.5 shadow-sm">
                  <Checkbox
                    aria-label={`Select ${MEDIA_CATEGORY_LABEL[item.category]} photo`}
                    checked={isSelected}
                    onCheckedChange={(checked) => setSelectedIds((prev) => (checked ? [...prev, item.mediaId] : prev.filter((id) => id !== item.mediaId)))}
                  />
                </span>
                {item.state !== "live" && (
                  <span className="absolute right-2 top-2">
                    <Badge tone={item.state === "processing" ? "amber" : "red"}>{item.state === "processing" ? "Processing" : "Rejected"}</Badge>
                  </span>
                )}
                <div className="flex items-start gap-1 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-[#202124]">{MEDIA_CATEGORY_LABEL[item.category]}</p>
                    <p className="truncate text-[11px] text-[#5F6368]">{location?.profile.title}</p>
                    <p className="mt-0.5 text-[11px] text-[#80868B]">
                      {fmtDate(item.createTime)} · {fileSize(item.sizeBytes)}
                    </p>
                  </div>
                  <ActionMenu
                    label="Media actions"
                    items={itemMenu(item)}
                    trigger={
                      <button type="button" className={buttonClass("ghost", "iconSm", "-mr-1")}>
                        <MoreHorizontal className="size-4" />
                      </button>
                    }
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <MediaPreviewDialog item={preview} onClose={() => setPreview(null)} onDelete={(id) => setConfirmDelete([id])} />
      <UploadMediaDialog open={uploadOpen} onOpenChange={setUploadOpen} defaultLocationId={lockedLocationId} />
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={confirmDelete?.length === 1 ? "Delete this media item?" : `Delete ${confirmDelete?.length ?? 0} media items?`}
        description="Deleted photos are removed from your Google Business Profile for everyone. This cannot be undone."
        affected={media
          .filter((item) => confirmDelete?.includes(item.mediaId))
          .slice(0, 5)
          .map((item) => `${MEDIA_CATEGORY_LABEL[item.category]} · ${locations.find((location) => location.locationId === item.locationId)?.profile.title ?? ""} · uploaded ${relative(item.createTime)}`)}
        confirmText={(confirmDelete?.length ?? 0) > 1 ? "DELETE" : undefined}
        confirmLabel="Delete"
        onConfirm={async () => {
          const ids = confirmDelete ?? [];
          const ok = await deleteMedia(ids);
          if (ok) {
            setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
            if (preview && ids.includes(preview.mediaId)) setPreview(null);
          }
          return ok;
        }}
      />
    </div>
  );
}
