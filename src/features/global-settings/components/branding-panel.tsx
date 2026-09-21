"use client";

import { ImageIcon, RotateCcwIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandGlyph } from "@/components/layout/brand-mark";
import { Panel } from "@/features/companies/components/primitives";
import { cn } from "@/lib/utils/cn";
import { ASSET_KEYS, ASSET_SPECS, makeDefaultAsset } from "../data/registry";
import { describeAsset } from "../data/formatting";
import type { AssetKind, AssetValue, SettingValues } from "../data/types";
import { validateSetting } from "../data/validators";
import { getDefinition } from "../data/registry";
import type { SectionEditor } from "./use-section-editor";

const KINDS = Object.keys(ASSET_KEYS) as AssetKind[];
/** The primary logo and favicon are required, so they can be replaced or restored but not removed. */
const REMOVABLE: Record<AssetKind, boolean> = { primary_logo: false, compact_logo: true, app_icon: true, favicon: false };

export function assetSrc(kind: AssetKind, value: AssetValue | undefined): string | null {
  if (!value || value.source === "removed") return null;
  if (value.source === "uploaded") return value.dataUrl;
  return ASSET_SPECS[kind].defaultSrc;
}

/** A logo or icon at a fixed height. Uploaded images are local data URLs, so the optimiser cannot be used. */
export function AssetImage({ kind, value, height, className, fallback }: { kind: AssetKind; value: AssetValue | undefined; height: number; className?: string; fallback?: "glyph" | "none" }) {
  const src = assetSrc(kind, value);
  if (!src) {
    return fallback === "none" ? null : <BrandGlyph size={height >= 32 ? "lg" : height >= 28 ? "md" : "sm"} className={className} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{ height }} className={cn("w-auto max-w-full select-none object-contain", className)} />
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function measure(dataUrl: string): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || null, height: image.naturalHeight || null });
    image.onerror = () => resolve({ width: null, height: null });
    image.src = dataUrl;
  });
}

function AssetCard({ kind, editor }: { kind: AssetKind; editor: SectionEditor }) {
  const spec = ASSET_SPECS[kind];
  const key = ASSET_KEYS[kind];
  const input = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const value = editor.values[key] as AssetValue;
  const saved = editor.saved[key] as AssetValue;
  const changed = JSON.stringify(value) !== JSON.stringify(saved);
  const error = localError ?? editor.errors[key];
  const disabled = !editor.canEdit;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setLocalError(null);
    const dataUrl = await readFile(file);
    const size = await measure(dataUrl);
    const next: AssetValue = { source: "uploaded", fileName: file.name, mimeType: file.type, sizeBytes: file.size, width: size.width, height: size.height, dataUrl };
    const definition = getDefinition(key);
    const message = definition ? validateSetting(definition, next) : null;
    if (message) {
      setLocalError(message);
      return;
    }
    editor.set(key, next);
  };

  const wide = kind === "primary_logo";
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-sm border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-foreground">{spec.label}</p>
          <p className="text-2xs text-muted-foreground">{spec.guidance}</p>
        </div>
        {changed ? <Badge tone="warning">Edited</Badge> : null}
      </div>
      <div
        className={cn("flex items-center justify-center rounded-sm border border-dashed border-border-strong bg-[repeating-conic-gradient(var(--color-muted)_0%_25%,transparent_0%_50%)] bg-[length:12px_12px]", wide ? "h-20" : "h-20")}
        aria-label={`${spec.label} preview`}
      >
        {assetSrc(kind, value) ? (
          <AssetImage kind={kind} value={value} height={wide ? 44 : 48} />
        ) : (
          <span className="flex items-center gap-1.5 text-2xs text-muted-foreground"><ImageIcon className="size-4" aria-hidden />{value.source === "removed" ? "Removed" : "Platform Mark"}</span>
        )}
      </div>
      <p className="truncate text-2xs text-muted-foreground" title={describeAsset(value)}>
        {value.source === "uploaded" ? `${describeAsset(value)}${value.width ? ` - ${value.width}x${value.height}` : ""} - local preview only` : describeAsset(value)}
      </p>
      {error ? <p role="alert" className="text-2xs text-danger">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          ref={input}
          type="file"
          accept={spec.types.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label={`Choose a file for ${spec.label}`}
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
          <UploadIcon />
          {value.source === "uploaded" ? "Replace" : "Upload"}
        </Button>
        {REMOVABLE[kind] && value.source !== "removed" ? (
          <Button variant="ghost" size="sm" disabled={disabled} onClick={() => editor.set(key, { ...makeDefaultAsset(kind), source: "removed", fileName: "" })}>
            <Trash2Icon />
            Remove
          </Button>
        ) : null}
        {value.source !== "default" ? (
          <Button variant="ghost" size="sm" disabled={disabled} onClick={() => { setLocalError(null); editor.set(key, makeDefaultAsset(kind)); }}>
            <RotateCcwIcon />
            Restore existing
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Platform-owned branding only. Company and client logos are never touched. */
export function BrandingPanel({ editor }: { editor: SectionEditor }) {
  return (
    <Panel title="Branding" description="The platform's own logos and icons. Company and client branding is never changed here.">
      <p className="mb-2 rounded-sm bg-muted/60 px-2.5 py-1.5 text-2xs text-muted-foreground">
        Files are read in your browser for a local preview. Nothing is uploaded or stored on a server in this frontend demo.
      </p>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {KINDS.map((kind) => <AssetCard key={kind} kind={kind} editor={editor} />)}
      </div>
    </Panel>
  );
}

function PreviewColumn({ title, values, name, shortName, description }: { title: string; values: SettingValues; name: string; shortName: string; description: string }) {
  const asset = (kind: AssetKind) => values[ASSET_KEYS[kind]] as AssetValue | undefined;
  const favicon = asset("favicon");
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>

      <div className="rounded-sm border border-border">
        <p className="border-b border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Topbar Identity</p>
        <div className="flex h-11 items-center gap-2 px-3">
          <AssetImage kind="primary_logo" value={asset("primary_logo")} height={26} fallback="none" />
          <span className="truncate text-[0.8125rem] font-semibold text-foreground">{shortName}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1">
        <div className="rounded-sm border border-border">
          <p className="border-b border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Collapsed Sidebar</p>
          <div className="flex h-14 items-center justify-center bg-[#0F172A]">
            <AssetImage kind="compact_logo" value={asset("compact_logo")} height={32} />
          </div>
        </div>
        <div className="rounded-sm border border-border">
          <p className="border-b border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Browser Tab</p>
          <div className="flex h-14 items-center px-2">
            <div className="flex min-w-0 items-center gap-1.5 rounded-t-sm border border-border bg-muted/60 px-2 py-1">
              {assetSrc("favicon", favicon) ? <AssetImage kind="favicon" value={favicon} height={14} fallback="none" /> : <ImageIcon className="size-3.5 text-muted-foreground" aria-hidden />}
              <span className="truncate text-[11px] text-foreground">{shortName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border">
        <p className="border-b border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sign-in branding</p>
        <div className="space-y-1 px-3 py-2.5">
          <AssetImage kind="primary_logo" value={asset("primary_logo")} height={30} fallback="none" />
          <p className="text-[0.8125rem] font-semibold text-foreground">{name}</p>
          <p className="line-clamp-2 text-2xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

/** A compact look at how platform-owned surfaces will read, updating as the draft changes. */
export function PublicIdentityPreview({ editor }: { editor: SectionEditor }) {
  const text = (values: SettingValues, key: string) => String(values[key] ?? "");
  const differs = editor.dirtyKeys.some((key) => key.startsWith("identity."));
  const column = (title: string, values: SettingValues) => (
    <PreviewColumn title={title} values={values} name={text(values, "identity.platform_name")} shortName={text(values, "identity.platform_short_name")} description={text(values, "identity.description")} />
  );
  return (
    <Panel title="Public Identity Preview" description={differs ? "Current against your unsaved changes. An example, not a live view." : "How platform-owned surfaces read now. An example, not a live view."}>
      <div className={cn("grid grid-cols-1 gap-3", differs && "lg:grid-cols-2")}>
        {column(differs ? "Current" : "Current", editor.saved)}
        {differs ? column("Proposed", editor.values) : null}
      </div>
    </Panel>
  );
}
