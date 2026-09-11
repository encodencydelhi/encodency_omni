"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Check, ChevronDown, Flag, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Campaign chrome runs on the module's red accent. */
export const RED = "#E11D28";

export function Section({
  letter,
  title,
  caption,
  action,
  children,
}: {
  letter: string;
  title: string;
  caption: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E6E8F0] bg-white p-3.5 shadow-[0_1px_3px_rgb(15_23_42/0.04)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#FFEAEC] text-[12px] font-bold text-[#E11D28]">
          {letter}
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[13px] font-bold leading-4 text-[#111827]">{title}</b>
          <small className="block text-[10px] text-[#8791A4]">{caption}</small>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label className="mb-1 block text-[10.5px] font-semibold text-[#374151]">
          {label}
          {required && <span className="ml-0.5 text-[#E11D28]">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="mt-0.5 text-[9.5px] text-[#9CA3AF]">{hint}</p>}
    </div>
  );
}

export const control =
  "flex h-[36px] w-full items-center gap-1.5 rounded-lg border border-[#E2E5EE] bg-white px-2.5 text-[11px] text-[#111827] transition-colors focus-within:border-[#E11D28] focus-within:ring-2 focus-within:ring-[#E11D28]/12";

export function TextInput({
  value,
  onChange,
  icon: Icon,
  prefix,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  icon?: typeof Flag;
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <span className={control}>
      {Icon && <Icon className="size-3.5 shrink-0 text-[#9CA3AF]" />}
      {prefix && <span className="shrink-0 text-[#6B7280]">{prefix}</span>}
      <input
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
  iconClass,
  tone,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  icon?: typeof Flag;
  iconClass?: string;
  tone?: "danger";
}) {
  return (
    <span className={cn(control, "relative", tone === "danger" && "border-[#F7CDD1] bg-[#FFF5F6]")}>
      {Icon && <Icon className={cn("size-3.5 shrink-0 text-[#9CA3AF]", iconClass)} />}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-4 outline-none",
          tone === "danger" && "font-semibold text-[#E11D28]",
        )}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-[#9CA3AF]" />
    </span>
  );
}

export function Textarea({
  value,
  onChange,
  rows = 3,
  max = 500,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, max))}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-lg border border-[#E2E5EE] bg-white px-3 py-2 text-[11px] leading-[17px] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#E11D28] focus:ring-2 focus:ring-[#E11D28]/12"
      />
      <p className="mt-0.5 text-right text-[9.5px] text-[#9CA3AF]">
        {value.length}/{max}
      </p>
    </>
  );
}

export function TagField({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const value = draft.trim();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  };
  return (
    <div className="flex min-h-[36px] w-full flex-wrap items-center gap-1 rounded-lg border border-[#E2E5EE] bg-white px-2 py-1.5 transition-colors focus-within:border-[#E11D28] focus-within:ring-2 focus-within:ring-[#E11D28]/12">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-md bg-[#FFEAEC] px-1.5 py-0.5 text-[10px] font-medium text-[#B91C24]"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(tags.filter((item) => item !== tag))}
            className="transition-opacity hover:opacity-60"
          >
            <X className="size-2.5" />
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
          if (event.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1));
        }}
        onBlur={commit}
        placeholder={placeholder}
        className="min-w-[80px] flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#9CA3AF]"
      />
    </div>
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
      aria-pressed={checked}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[10.5px] font-medium transition-colors",
        checked
          ? "border-[#E11D28] bg-[#FFF5F6] text-[#111827]"
          : "border-[#E2E5EE] bg-white text-[#374151] hover:border-[#F5B5BA]",
      )}
    >
      <span
        className={cn(
          "grid size-3.5 shrink-0 place-items-center rounded border transition-colors",
          checked ? "border-[#E11D28] bg-[#E11D28]" : "border-[#CBD5E1] bg-white",
        )}
      >
        {checked && <Check className="size-2.5 text-white" />}
      </span>
      {label}
    </button>
  );
}

/** Selectable tile used for objectives, audience types and publishing modes. */
export function OptionCard({
  active,
  onSelect,
  icon: Icon,
  tint,
  title,
  caption,
}: {
  active: boolean;
  onSelect: () => void;
  icon: typeof Flag;
  tint: string;
  title: string;
  caption: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "relative flex flex-col rounded-xl border p-2.5 text-left transition-colors",
        active ? "border-[#E11D28] bg-[#FFF5F6]" : "border-[#E6E8F0] bg-white hover:border-[#F5B5BA]",
      )}
    >
      {active && (
        <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-[#E11D28]">
          <Check className="size-2.5 text-white" />
        </span>
      )}
      <span className={cn("grid size-7 place-items-center rounded-lg", tint)}>
        <Icon className="size-3.5" />
      </span>
      <b className="mt-1.5 block text-[11px] font-bold text-[#111827]">{title}</b>
      <small className="block text-[9.5px] leading-[13px] text-[#8791A4]">{caption}</small>
    </button>
  );
}

export function RailCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#E6E8F0] bg-white p-3 shadow-[0_1px_3px_rgb(15_23_42/0.04)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export const tint: Record<string, string> = {
  red: "bg-[#FFEAEC] text-[#E11D28]",
  blue: "bg-[#E8F2FF] text-[#1975E7]",
  green: "bg-[#E4F8F0] text-[#0AA673]",
  amber: "bg-[#FFF3DC] text-[#D97706]",
  purple: "bg-[#F2EAFF] text-[#7C3AED]",
  teal: "bg-[#E2F6F5] text-[#0E9C92]",
};
