"use client";

import { useEffect, useState } from "react";
import { Images, Loader2, X } from "lucide-react";
import { mediaApi, type MediaAssetRecord } from "../live/media-api";

/** Picks a saved image of this Client's media library (for example a saved AI visual) to keep working on it. */
export function LibraryImagePicker({ companyId, clientId, disabled, onPick, className }: { companyId: string; clientId: string; disabled: boolean; onPick: (asset: MediaAssetRecord) => void; className: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaAssetRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || items !== null) return;
    const controller = new AbortController();
    mediaApi.list(companyId, clientId, { kind: "IMAGE", limit: 40 }, controller.signal)
      .then((result) => setItems(result.items))
      .catch((cause: unknown) => { if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : "The library could not be loaded."); setItems([]); } });
    return () => controller.abort();
  }, [open, items, companyId, clientId]);

  return <>
    <button type="button" className={className} disabled={disabled || !clientId} onClick={() => { setItems(null); setError(null); setOpen(true); }}>
      <Images size={13} />From library
    </button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Choose an image from the library" onClick={() => setOpen(false)}>
      <div className="max-h-[80dvh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">Choose an image from the library</p><button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-7 place-items-center rounded-full hover:bg-slate-100"><X size={16} /></button></div>
        {items === null ? <Loader2 className="mx-auto my-8 animate-spin text-violet-600" />
          : error ? <p className="text-xs text-red-600">{error}</p>
          : items.length === 0 ? <p className="text-xs text-slate-500">No images in this client&apos;s library yet.</p>
          : <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{items.map((item) => (
            <button key={item.id} type="button" onClick={() => { onPick(item); setOpen(false); }} className="overflow-hidden rounded-md border border-slate-200 hover:ring-2 hover:ring-violet-500" title={new Date(item.uploadedAt).toLocaleString("en-IN")}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the Client's own library thumbnails */}
              <img src={item.url} alt="Library image" className="aspect-square w-full object-cover" />
            </button>
          ))}</div>}
      </div>
    </div>}
  </>;
}
