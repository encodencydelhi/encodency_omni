"use client";

import Image from "next/image";
import { FaFacebookF, FaInstagram } from "react-icons/fa6";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Ad, Creative, InstantForm } from "../types";

/** Facebook / Instagram feed rendering of an ad, used on ad and creative pages. */
export function AdPreview({
  ad,
  creative,
  surface = "facebook",
  className,
}: {
  ad: Pick<Ad, "primaryText" | "headline" | "description" | "cta" | "page" | "instagramAccount" | "destination">;
  creative?: Creative;
  surface?: "facebook" | "instagram";
  className?: string;
}) {
  const isInstagram = surface === "instagram";
  const handle = isInstagram ? ad.instagramAccount : ad.page;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[#dde5ee] bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            isInstagram ? "bg-[#fdf0ff]" : "bg-[#e8f1ff]",
          )}
        >
          {isInstagram ? (
            <FaInstagram className="size-3.5 text-[#d946ef]" />
          ) : (
            <FaFacebookF className="size-3.5 text-[#1877f2]" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-bold">{handle}</span>
          <span className="block text-[9px] text-[#64748b]">Sponsored</span>
        </span>
        <MoreHorizontal className="size-4 text-[#94a3b8]" aria-hidden="true" />
      </div>

      <p className="px-3 pb-2 text-[11px] leading-relaxed text-[#14213d]">
        {ad.primaryText}
      </p>

      <div className="relative aspect-[4/5] w-full bg-[#f1f5f9]">
        {creative ? (
          <Image
            src={creative.src}
            alt={creative.name}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-[10px] text-[#94a3b8]">
            No creative attached
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#eef2f7] bg-[#f7f9fc] px-3 py-2">
        <span className="min-w-0">
          <span className="block text-[8px] uppercase tracking-wide text-[#94a3b8]">
            {ad.destination.split("—")[0]?.trim()}
          </span>
          <strong className="block truncate text-[11px]">{ad.headline}</strong>
          {ad.description && (
            <span className="block truncate text-[9px] text-[#64748b]">
              {ad.description}
            </span>
          )}
        </span>
        <span className="shrink-0 rounded-md bg-[#e4e6eb] px-2.5 py-1.5 text-[10px] font-bold text-[#14213d]">
          {ad.cta}
        </span>
      </div>

      <div className="flex items-center gap-4 border-t border-[#eef2f7] px-3 py-2 text-[#64748b]">
        {isInstagram ? (
          <>
            <Heart className="size-4" aria-hidden="true" />
            <MessageCircle className="size-4" aria-hidden="true" />
            <Send className="size-4" aria-hidden="true" />
            <Bookmark className="ml-auto size-4" aria-hidden="true" />
          </>
        ) : (
          <>
            <span className="flex items-center gap-1 text-[10px]">
              <ThumbsUp className="size-3.5" aria-hidden="true" /> Like
            </span>
            <span className="flex items-center gap-1 text-[10px]">
              <MessageCircle className="size-3.5" aria-hidden="true" /> Comment
            </span>
            <span className="flex items-center gap-1 text-[10px]">
              <Send className="size-3.5" aria-hidden="true" /> Share
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** Mobile rendering of an instant form, used on the form detail page. */
export function InstantFormPreview({
  form,
  className,
}: {
  form: InstantForm;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[300px] overflow-hidden rounded-[20px] border-[6px] border-[#14213d] bg-white shadow-lg",
        className,
      )}
    >
      <div className="bg-[#14213d] px-3 pb-2 pt-1 text-center">
        <span className="mx-auto block h-1 w-10 rounded-full bg-white/40" aria-hidden="true" />
      </div>

      <div className="max-h-[420px] overflow-y-auto [scrollbar-width:thin]">
        <div className="bg-[#f7f9fc] px-3 py-3">
          <p className="text-[8px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            {form.language}
          </p>
          <h3 className="mt-1 text-[12px] font-bold leading-snug">{form.introHeadline}</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-[#64748b]">{form.introBody}</p>
        </div>

        <div className="space-y-2.5 px-3 py-3">
          {form.questions.map((q) => (
            <label key={q.id} className="block">
              <span className="block text-[9px] font-semibold text-[#475569]">
                {q.label}
                {q.required && <span className="text-[#b42318]"> *</span>}
              </span>
              <span className="mt-1 flex h-7 items-center rounded-md border border-[#dde5ee] bg-[#fbfcfe] px-2 text-[9px] text-[#94a3b8]">
                {q.type.startsWith("Prefilled") ? "Prefilled from Meta profile" : "Your answer"}
              </span>
            </label>
          ))}
        </div>

        <div className="border-t border-[#eef2f7] px-3 py-3">
          {form.privacyUrl ? (
            <p className="text-[8px] leading-relaxed text-[#64748b]">
              By clicking Submit you agree to our{" "}
              <span className="font-semibold text-[#0671e9] underline">privacy policy</span>.
            </p>
          ) : (
            <p className="rounded-md border border-[#fbcfcb] bg-[#fef3f2] p-2 text-[8px] font-semibold leading-relaxed text-[#b42318]">
              No privacy policy URL set. Meta will not let this form go live.
            </p>
          )}
          <span className="mt-2 block rounded-md bg-[#1671f8] py-2 text-center text-[10px] font-bold text-white">
            Submit
          </span>
        </div>

        <div className="border-t border-[#eef2f7] bg-[#f7f9fc] px-3 py-3 text-center">
          <p className="text-[10px] font-bold">{form.thankYouHeadline}</p>
          <span className="mt-1.5 inline-block rounded-md border border-[#dde5ee] bg-white px-2.5 py-1 text-[9px] font-semibold">
            {form.thankYouCta}
          </span>
        </div>
      </div>
    </div>
  );
}
