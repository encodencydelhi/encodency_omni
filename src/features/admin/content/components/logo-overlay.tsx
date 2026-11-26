"use client";

import { useState } from "react";
import { ImagePlus, Loader2, Stamp } from "lucide-react";
import { toast } from "sonner";
import { bannerLayout, logoPlacement, type LogoPosition, type LogoSize } from "./logo-placement";

export { logoPlacement };

type Style = "banner" | "corner";
const STORAGE = (clientId: string) => `m360.content.logo.${clientId}`;
const BRAND = (clientId: string) => `m360.content.brand.${clientId}`;
const read = (key: string | null) => {
  if (!key) return "";
  try { return window.localStorage.getItem(key) ?? ""; } catch { return ""; }
};
const save = (key: string | null, value: string) => {
  try { if (key) window.localStorage.setItem(key, value); } catch { /* too large or blocked: kept for this session */ }
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The image could not be read."));
    image.src = src;
  });
}

/** Black or white text, whichever reads better on the band colour. */
function textOn(hex: string) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#111827" : "#FFFFFF";
}

/** Fits the headline in one or two lines inside the width (the font shrinks first, then wraps). */
function fitHeadline(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxSize: number) {
  const font = (size: number) => `700 ${size}px Inter, "Segoe UI", Arial, sans-serif`;
  for (let size = maxSize; size >= Math.round(maxSize * 0.55); size -= 2) {
    context.font = font(size);
    if (context.measureText(text).width <= maxWidth) return { size, lines: [text] };
  }
  const words = text.split(/\s+/);
  for (let size = Math.round(maxSize * 0.8); size >= Math.round(maxSize * 0.45); size -= 2) {
    context.font = font(size);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
    if (lines.length <= 2 && lines.every((item) => context.measureText(item).width <= maxWidth)) return { size, lines };
  }
  return null;
}

async function compose(imageUrl: string, logoUrl: string, options: { style: Style; position: LogoPosition; size: LogoSize; backing: boolean; headline: string; color: string }): Promise<string> {
  const [image, logo] = await Promise.all([loadImage(imageUrl), logoUrl ? loadImage(logoUrl) : Promise.resolve(null)]);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot edit images.");
  context.drawImage(image, 0, 0);
  const logoSize = logo ? { width: logo.naturalWidth, height: logo.naturalHeight } : null;

  if (options.style === "banner") {
    const layout = bannerLayout({ width: canvas.width, height: canvas.height }, logoSize);
    context.fillStyle = options.color;
    context.fillRect(layout.band.x, layout.band.y, layout.band.width, layout.band.height);
    if (logo && layout.logo) {
      // A logo with dark artwork stays visible on a dark band: give it a light rounded backing.
      if (textOn(options.color) === "#FFFFFF") {
        const pad = Math.round(layout.logo.height * 0.12);
        context.fillStyle = "#FFFFFF";
        context.beginPath();
        context.roundRect(layout.logo.x - pad, layout.logo.y - pad, layout.logo.width + pad * 2, layout.logo.height + pad * 2, pad);
        context.fill();
      }
      context.drawImage(logo, layout.logo.x, layout.logo.y, layout.logo.width, layout.logo.height);
    }
    const headline = options.headline.trim();
    if (headline) {
      const fit = fitHeadline(context, headline, layout.text.maxWidth, layout.text.maxFontSize);
      if (!fit) throw new Error("The headline is too long for the banner. Shorten it.");
      context.fillStyle = textOn(options.color);
      context.textBaseline = "middle";
      const lineHeight = fit.size * 1.15;
      fit.lines.forEach((line, index) => context.fillText(line, layout.text.x, layout.text.y + (index - (fit.lines.length - 1) / 2) * lineHeight));
    }
  } else if (logo && logoSize) {
    const place = logoPlacement({ width: canvas.width, height: canvas.height }, logoSize, options.position, options.size);
    if (options.backing) {
      const pad = Math.round(place.width * 0.08);
      context.fillStyle = "rgba(255,255,255,0.92)";
      context.beginPath();
      context.roundRect(place.x - pad, place.y - pad, place.width + pad * 2, place.height + pad * 2, pad);
      context.fill();
    }
    context.drawImage(logo, place.x, place.y, place.width, place.height);
  }
  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Branding for an AI or uploaded visual. "Brand banner": a strip along the bottom with an exact headline (typed, so the
 * spelling is always right) and the logo; "Corner logo": the logo alone in a corner. Logo and colour are remembered per Client.
 */
export function LogoOverlay({ imageUrl, clientId, disabled, onApply }: { imageUrl: string; clientId: string | null | undefined; disabled: boolean; onApply: (url: string) => void }) {
  const logoKey = clientId ? STORAGE(clientId) : null;
  const brandKey = clientId ? BRAND(clientId) : null;
  const [logo, setLogo] = useState(() => read(logoKey));
  const [style, setStyle] = useState<Style>("banner");
  const [headline, setHeadline] = useState("");
  const [color, setColor] = useState(() => read(brandKey) || "#FFFFFF");
  const [position, setPosition] = useState<LogoPosition>("top-right");
  const [size, setSize] = useState<LogoSize>("medium");
  const [backing, setBacking] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type) || file.size > 2 * 1024 * 1024) { toast.error("Use a PNG (best, with a transparent background), JPEG, WebP or SVG logo up to 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { const value = String(reader.result); setLogo(value); save(logoKey, value); };
    reader.readAsDataURL(file);
  };
  const apply = async () => {
    if (style === "corner" && !logo) { toast.error("Choose your logo first."); return; }
    if (style === "banner" && !logo && !headline.trim()) { toast.error("Add a headline or choose your logo."); return; }
    setBusy(true);
    try {
      onApply(await compose(imageUrl, logo, { style, position, size, backing, headline, color }));
      save(brandKey, color);
      toast.success("Branding added. The version without it stays in the history.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "The branding could not be added."); }
    finally { setBusy(false); }
  };
  const field = "h-8 rounded-md border border-slate-200 bg-white px-1.5";

  return <div className="space-y-2 rounded-lg border border-slate-200 p-3">
    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"><Stamp size={13} />Add your branding</p>
    <p className="text-[11px] text-slate-500">AI cannot draw real logos and often misspells text. Generate a clean image WITHOUT text, then add an exact headline and your real logo here.</p>
    <div className="flex flex-wrap items-center gap-2">
      <label className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
        <ImagePlus size={13} />{logo ? "Change logo" : "Choose logo"}
        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" disabled={disabled} onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ""; }} />
      </label>
      {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen logo */}
      {logo && <img src={logo} alt="Your logo" className="h-8 max-w-24 rounded border border-slate-200 bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:8px_8px] object-contain p-0.5" />}
      <div className="ml-auto inline-flex overflow-hidden rounded-md border border-slate-200 text-xs" role="radiogroup" aria-label="Branding style">
        {(["banner", "corner"] as const).map((value) => <button key={value} type="button" role="radio" aria-checked={style === value} onClick={() => setStyle(value)} className={`h-8 px-2.5 font-semibold ${style === value ? "bg-violet-600 text-white" : "bg-white text-slate-700"}`}>{value === "banner" ? "Brand banner" : "Corner logo"}</button>)}
      </div>
    </div>
    {style === "banner" ? <div className="space-y-2 text-xs">
      <label className="block">Headline (exact text, max 2 lines)
        <input value={headline} maxLength={60} onChange={(event) => setHeadline(event.target.value)} placeholder="e.g. Safe • On Time • Fair Price" className={`${field} mt-1 w-full`} />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5">Banner colour <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-10 cursor-pointer rounded border border-slate-200" /></label>
        {["#FFFFFF", "#111827", "#C8102E", "#4F46E5"].map((preset) => <button key={preset} type="button" onClick={() => setColor(preset)} aria-label={`Use colour ${preset}`} className={`size-6 rounded-full border ${color.toUpperCase() === preset ? "ring-2 ring-violet-500 ring-offset-1" : "border-slate-300"}`} style={{ background: preset }} />)}
        <button type="button" disabled={disabled || busy} onClick={() => void apply()} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Stamp size={13} />}Add banner</button>
      </div>
    </div> : logo && <div className="flex flex-wrap items-center gap-2 text-xs">
      <label className="flex items-center gap-1">Corner
        <select value={position} onChange={(event) => setPosition(event.target.value as LogoPosition)} className={field}>
          <option value="top-left">Top left</option><option value="top-right">Top right</option><option value="bottom-left">Bottom left</option><option value="bottom-right">Bottom right</option>
        </select>
      </label>
      <label className="flex items-center gap-1">Size
        <select value={size} onChange={(event) => setSize(event.target.value as LogoSize)} className={field}>
          <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
        </select>
      </label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={backing} onChange={(event) => setBacking(event.target.checked)} />White background</label>
      <button type="button" disabled={disabled || busy} onClick={() => void apply()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Stamp size={13} />}Add logo</button>
    </div>}
  </div>;
}
