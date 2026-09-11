"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
export const ACCENT = {
  solid: "#4F46E5",
  hover: "#4338CA",
  text: "text-[#4F46E5]",
  bg: "bg-[#4F46E5]",
  subtle: "bg-[#EEF2FF]",
  ring: "border-[#C7D2FE]",
} as const;

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[#E6E8F0] bg-white shadow-[0_1px_3px_rgb(15_23_42/0.04)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function StepHeader({
  icon: Icon,
  step,
  title,
  description,
  tip,
}: {
  icon: typeof Lightbulb;
  step: number;
  title: string;
  description: string;
  tip: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-[52px] shrink-0 place-items-center rounded-2xl bg-[#EEF2FF]">
          <Icon className="size-6 text-[#4F46E5]" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[#6B7280]">Step {step} of 7</p>
          <h2 className="text-[22px] font-bold leading-7 tracking-[-0.02em] text-[#111827]">
            {title}
          </h2>
          <p className="mt-0.5 text-[12px] leading-4 text-[#6B7280]">{description}</p>
        </div>
      </div>
      <div className="flex max-w-[330px] shrink-0 items-start gap-2 rounded-xl bg-[#F5F3FF] px-3 py-2.5">
        <Lightbulb className="mt-px size-3.5 shrink-0 text-[#7C3AED]" />
        <p className="min-w-0">
          <b className="block text-[11px] font-bold text-[#4C1D95]">Quick Tip</b>
          <span className="block text-[10.5px] leading-[15px] text-[#6D5A9C]">{tip}</span>
        </p>
      </div>
    </div>
  );
}

export function Field({
  label,
  required,
  optional,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label className="mb-1.5 block text-[12px] font-semibold text-[#374151]">
        {label}
        {required && <span className="ml-0.5 text-[#EF4444]">*</span>}
        {optional && <span className="ml-1 font-normal text-[#9CA3AF]">(Optional)</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10.5px] leading-4 text-[#9CA3AF]">{hint}</p>}
    </div>
  );
}

const controlBase =
  "flex h-[42px] w-full items-center gap-2 rounded-lg border border-[#E2E5EE] bg-white px-3 text-[12.5px] text-[#111827] transition-colors focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/12";

export function TextInput({
  value,
  onChange,
  placeholder,
  icon: Icon,
  prefix,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: typeof Lightbulb;
  prefix?: ReactNode;
  type?: string;
}) {
  return (
    <span className={controlBase}>
      {prefix}
      {Icon && <Icon className="size-4 shrink-0 text-[#9CA3AF]" />}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#9CA3AF]"
      />
    </span>
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  icon: Icon,
  prefix,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  icon?: typeof Lightbulb;
  prefix?: ReactNode;
}) {
  return (
    <span className={cn(controlBase, "relative")}>
      {prefix}
      {Icon && <Icon className="size-4 shrink-0 text-[#9CA3AF]" />}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-5 outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-[#9CA3AF]" />
    </span>
  );
}

export function TextareaField({
  value,
  onChange,
  placeholder,
  max = 500,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
  rows?: number;
}) {
  return (
    <>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, max))}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-lg border border-[#E2E5EE] bg-white px-3 py-2.5 text-[12.5px] leading-[18px] text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/12"
      />
      <p className="mt-0.5 text-right text-[10.5px] text-[#9CA3AF]">
        {value.length}/{max}
      </p>
    </>
  );
}

/** Chip list with an inline "add" input — used for services, audiences, goals, keywords. */
export function TagField({
  tags,
  onChange,
  placeholder,
  tone = "indigo",
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  tone?: "indigo" | "slate";
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const value = draft.trim();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  };
  return (
    <div className="relative flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-[#E2E5EE] bg-white px-2.5 py-2 pr-8 transition-colors focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/12">
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium",
            tone === "indigo" ? "bg-[#EEF2FF] text-[#4338CA]" : "bg-[#F1F5F9] text-[#475569]",
          )}
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(tags.filter((item) => item !== tag))}
            className="text-current/60 transition-opacity hover:opacity-60"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Backspace" && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        className="min-w-[90px] flex-1 bg-transparent py-0.5 text-[12px] outline-none placeholder:text-[#9CA3AF]"
      />
      <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-[#9CA3AF]" />
    </div>
  );
}

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-[#4F46E5]" : "bg-[#CBD5E1]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 block size-5 rounded-full bg-white shadow-sm transition-all",
          on ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

export function Checkbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 rounded-lg border border-[#E2E5EE] bg-white px-2.5 py-2 text-left text-[11.5px] font-medium text-[#374151] transition-colors hover:border-[#C7D2FE]"
    >
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded border transition-colors",
          checked ? "border-[#4F46E5] bg-[#4F46E5]" : "border-[#CBD5E1] bg-white",
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="size-2.5 text-white" fill="none">
            <path d="M2 6.2 4.6 8.8 10 3.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

/* ---------------------------------------------------------------- right rail */

export function RailCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[#E6E8F0] bg-white p-4 shadow-[0_1px_3px_rgb(15_23_42/0.04)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function RailBullets({
  items,
}: {
  items: readonly { icon: typeof Lightbulb; label: string }[];
}) {
  return (
    <ul className="space-y-2.5">
      {items.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-start gap-2.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#EEF2FF]">
            <Icon className="size-3.5 text-[#4F46E5]" />
          </span>
          <span className="text-[11.5px] leading-[17px] text-[#374151]">{label}</span>
        </li>
      ))}
    </ul>
  );
}

export function NeedHelpCard() {
  return (
    <RailCard className="bg-gradient-to-b from-[#F5F3FF] to-white text-center">
      <div className="mb-2 flex justify-center -space-x-2">
        {["#C7D2FE", "#DDD6FE", "#FBCFE8"].map((color, index) => (
          <span
            key={color}
            className="grid size-8 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-[#4338CA]"
            style={{ background: color }}
          >
            {["A", "R", "S"][index]}
          </span>
        ))}
      </div>
      <b className="block text-[14px] font-bold text-[#111827]">Need Help?</b>
      <p className="mx-auto mt-1 max-w-[200px] text-[11px] leading-4 text-[#6B7280]">
        Our team is here to help you set up your client.
      </p>
      <button className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-[#4F46E5] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#4338CA]">
        Contact Support
      </button>
    </RailCard>
  );
}
