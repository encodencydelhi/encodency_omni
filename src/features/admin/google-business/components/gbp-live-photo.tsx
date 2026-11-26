"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { mediaApi, describeMediaError, type MediaAssetRecord } from "@/features/admin/content/live/media-api";
import { LibraryImagePicker } from "@/features/admin/content/components/library-picker";

/** Google Business post photo rules: JPG or PNG, 10 KB to 5 MB, at least 400 x 300 pixels. */
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_BYTES = 10 * 1024;
const MIN_W = 400, MIN_H = 300;

function checkAsset(asset: MediaAssetRecord): string | null {
  if (!/^https:\/\//i.test(asset.url)) return "This picture has no public link Google can open.";
  if (asset.mimeType && !/^image\/(jpeg|png)$/i.test(asset.mimeType)) return "Google accepts JPG or PNG photos for posts.";
  if (asset.bytes && (asset.bytes > MAX_BYTES || asset.bytes < MIN_BYTES)) return "Google needs a photo between 10 KB and 5 MB.";
  if (asset.width && asset.height && (asset.width < MIN_W || asset.height < MIN_H)) return `Google needs at least ${MIN_W} x ${MIN_H} pixels (this one is ${asset.width} x ${asset.height}).`;
  return null;
}

/**
 * The one photo of a live Google post: upload from the computer or pick from the Client's media library. Both give a
 * public https link (Cloudinary), which is what Google downloads; a local file preview could never reach Google.
 */
export function GbpLivePhotoPicker({ value, onPick, onRemove }: { value: string | null; onPick: (asset: MediaAssetRecord) => void; onRemove: () => void }) {
  const { companyId, clientId } = useTenancyContext();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const accept = (asset: MediaAssetRecord) => {
    const problem = checkAsset(asset);
    if (problem) { toast.error("This photo cannot go to Google", { description: problem }); return; }
    onPick(asset);
  };
  const upload = async (file: File) => {
    if (!companyId || !clientId) return;
    if (!/^image\/(jpeg|png)$/i.test(file.type)) { toast.error("Use a JPG or PNG photo (Google's rule for posts)."); return; }
    if (file.size > MAX_BYTES || file.size < MIN_BYTES) { toast.error("Google needs a photo between 10 KB and 5 MB."); return; }
    setUploading(true);
    try { accept(await mediaApi.upload(companyId, clientId, file)); toast.success("Photo uploaded to your media library."); }
    catch (cause) { toast.error("Upload failed", { description: describeMediaError(cause) }); }
    finally { setUploading(false); }
  };
  return <div className="space-y-2">
    <div className="flex flex-wrap items-start gap-3">
      {value ? <div className="relative w-48 overflow-hidden rounded-md border border-[#DADCE0]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Post photo" className="aspect-[4/3] w-full object-cover" />
        <button type="button" onClick={onRemove} aria-label="Remove photo" className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"><X className="size-3.5" /></button>
      </div> : <button type="button" disabled={uploading} onClick={() => input.current?.click()} className="flex aspect-[4/3] w-48 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#DADCE0] bg-[#F8F9FA] text-[12px] font-medium text-[#3C4043] hover:border-[#9AA0A6] disabled:opacity-60">
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{uploading ? "Uploading…" : "Upload from computer"}
      </button>}
      {companyId && clientId && <LibraryImagePicker companyId={companyId} clientId={clientId} disabled={uploading} onPick={accept} className="h-9 rounded-md border border-[#DADCE0] bg-white px-3 text-[12px] font-medium text-[#3C4043] hover:bg-[#F8F9FA]" />}
    </div>
    <input ref={input} type="file" accept="image/jpeg,image/png" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
    <p className="text-[12px] text-[#5F6368]">Google shows one photo per post: JPG or PNG, 10 KB–5 MB, at least 400 × 300 (landscape 1200 × 900 looks best). Uploads are saved to your media library.</p>
  </div>;
}
