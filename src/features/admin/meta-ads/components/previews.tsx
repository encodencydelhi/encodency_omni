"use client";

import Image from "next/image";
import { FaFacebookF, FaInstagram } from "react-icons/fa6";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Sparkles,
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
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition-all duration-300 hover:shadow-xl",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-3.5 py-3">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl shadow-2xs",
            isInstagram
              ? "bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#d6249f] text-white"
              : "bg-[#1877f2] text-white",
          )}
        >
          {isInstagram ? (
            <FaInstagram className="size-4" />
          ) : (
            <FaFacebookF className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-slate-900">{handle}</span>
          <span className="block text-[10px] font-semibold text-slate-500">Sponsored · Meta Feed</span>
        </div>
        <button type="button" aria-label="Ad options" className="text-slate-400 hover:text-slate-600">
          <MoreHorizontal className="size-4.5" />
        </button>
      </div>

      <p className="px-3.5 py-2.5 text-xs font-medium leading-relaxed text-slate-800">
        {ad.primaryText}
      </p>

      <div className="relative aspect-[4/5] w-full bg-slate-100 overflow-hidden">
        {creative ? (
          <Image
            src={creative.src}
            alt={creative.name}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-400">
            <Sparkles className="size-6 text-slate-300" />
            No creative attached
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            {ad.destination.split("—")[0]?.trim()}
          </span>
          <strong className="block truncate text-xs font-semibold text-slate-900">{ad.headline}</strong>
          {ad.description && (
            <span className="block truncate text-[10px] font-medium text-slate-600">
              {ad.description}
            </span>
          )}
        </div>
        <span className="shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs">
          {ad.cta}
        </span>
      </div>

      <div className="flex items-center gap-5 border-t border-slate-100 bg-white px-3.5 py-2.5 text-slate-600">
        {isInstagram ? (
          <>
            <Heart className="size-4.5 cursor-pointer hover:text-rose-500 transition-colors" />
            <MessageCircle className="size-4.5 cursor-pointer hover:text-blue-500 transition-colors" />
            <Send className="size-4.5 cursor-pointer hover:text-blue-500 transition-colors" />
            <Bookmark className="ml-auto size-4.5 cursor-pointer hover:text-slate-900 transition-colors" />
          </>
        ) : (
          <>
            <button type="button" className="flex items-center gap-1.5 text-xs font-semibold hover:text-blue-600 transition-colors">
              <ThumbsUp className="size-4" /> Like
            </button>
            <button type="button" className="flex items-center gap-1.5 text-xs font-semibold hover:text-blue-600 transition-colors">
              <MessageCircle className="size-4" /> Comment
            </button>
            <button type="button" className="flex items-center gap-1.5 text-xs font-semibold hover:text-blue-600 transition-colors">
              <Send className="size-4" /> Share
            </button>
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
        "mx-auto w-full max-w-[320px] overflow-hidden rounded-[28px] border-[8px] border-slate-900 bg-white shadow-2xl",
        className,
      )}
    >
      <div className="bg-slate-900 px-3 pb-2 pt-2 text-center">
        <span className="mx-auto block h-1.5 w-12 rounded-full bg-slate-700" aria-hidden="true" />
      </div>

      <div className="max-h-[440px] overflow-y-auto [scrollbar-width:thin]">
        <div className="bg-gradient-to-b from-slate-50 to-white px-4 py-4 border-b border-slate-100">
          <span className="inline-block rounded-sm border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600 shadow-2xs">
            {form.language} · Instant Form
          </span>
          <h3 className="mt-2 text-sm font-semibold text-slate-900 leading-snug">{form.introHeadline}</h3>
          <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-600">{form.introBody}</p>
        </div>

        <div className="space-y-3 px-4 py-4">
          {form.questions.map((q) => (
            <label key={q.id} className="block">
              <span className="block text-xs font-semibold text-slate-700">
                {q.label}
                {q.required && <span className="text-rose-600 font-black"> *</span>}
              </span>
              <span className="mt-1.5 flex h-8 items-center rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-xs font-medium text-slate-400 shadow-2xs">
                {q.type.startsWith("Prefilled") ? "Prefilled from Meta profile" : "Your answer"}
              </span>
            </label>
          ))}
        </div>

        <div className="border-t border-slate-100 px-4 py-3.5 bg-slate-50/50">
          {form.privacyUrl ? (
            <p className="text-[10px] font-medium leading-relaxed text-slate-500">
              By clicking Submit you agree to our{" "}
              <span className="font-semibold text-blue-600 underline">privacy policy</span>.
            </p>
          ) : (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[10px] font-semibold leading-relaxed text-rose-800">
              No privacy policy URL set. Meta requires a privacy policy.
            </p>
          )}
          <span className="mt-3 block rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-center text-xs font-semibold text-white shadow-md shadow-blue-500/20">
            Submit Application
          </span>
        </div>

        <div className="border-t border-slate-100 bg-slate-100/60 px-4 py-3.5 text-center">
          <p className="text-xs font-semibold text-slate-800">{form.thankYouHeadline}</p>
          <span className="mt-2 inline-block rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs">
            {form.thankYouCta}
          </span>
        </div>
      </div>
    </div>
  );
}
