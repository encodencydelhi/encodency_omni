"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Check, ChevronDown, Flag, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const RED = "#E11D28";

/** Section card. `letter` renders the A–F badge; `icon` replaces it when given. */
export function Section({
  letter,
  icon: Icon,
  title,
  caption,
  action,
  children,
  className,
}: {
  letter?: string;
  icon?: typeof Flag;
  title: string;
  caption: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#E6E8F0] bg-white p-3.5 shadow-[0_1px_3px_rgb(15_23_42/0.04)]",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#FFEAEC] text-[13px] font-bold text-[#E11D28]">
          {Icon ? <Icon className="size-4" /> : letter}
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[13.5px] font-bold leading-4 text-[#111827]">{title}</b>
          <small className="block text-[10px] text-[#8791A4]">{caption}</small>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Lightweight sub-section heading used inside a step (B, C, D… on step 5). */
export function SubSection({
  letter,
  title,
  caption,
  action,
  children,
  className,
}: {
  letter: string;
  title: string;
  caption: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-[#E6E8F0] bg-white p-3", className)}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#FFEAEC] text-[11px] font-bold text-[#E11D28]">
          {letter}
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[12px] font-bold leading-4 text-[#111827]">{title}</b>
          <small className="block text-[9.5px] text-[#8791A4]">{caption}</small>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  required,
  optional,
  hint,
  className,
  action,
  children,
}: {
  label?: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  className?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="block text-[10.5px] font-semibold text-[#374151]">
            {label}
            {required && <span className="ml-0.5 text-[#E11D28]">*</span>}
            {optional && <span className="ml-1 font-normal text-[#9CA3AF]">(Optional)</span>}
          </label>
          {action}
        </div>
      )}
      {children}
      {hint && <p className="mt-1 text-[9.5px] leading-[13px] text-[#9CA3AF]">{hint}</p>}
    </div>
  );
}

export const control =
  "flex h-[38px] w-full items-center gap-1.5 rounded-lg border border-[#E2E5EE] bg-white px-2.5 text-[11.5px] text-[#111827] transition-colors focus-within:border-[#E11D28] focus-within:ring-2 focus-within:ring-[#E11D28]/12";

export function TextInput({
  value,
  onChange,
  icon: Icon,
  prefix,
  placeholder,
  disabled,
  max,
}: {
  value: string;
  onChange?: (v: string) => void;
  icon?: typeof Flag;
  prefix?: string;
  placeholder?: string;
  disabled?: boolean;
  /** When set, a live character counter sits inside the field. */
  max?: number;
}) {
  return (
    <span className={cn(control, max && "h-[46px] items-start pt-2", disabled && "bg-[#F8FAFC] text-[#8791A4]")}>
      {Icon && <Icon className={cn("size-3.5 shrink-0 text-[#9CA3AF]", max && "mt-0.5")} />}
      {prefix && <span className="shrink-0 text-[#6B7280]">{prefix}</span>}
      <span className="relative flex min-w-0 flex-1 flex-col">
        <input
          value={value}
          onChange={(event) => onChange?.(max ? event.target.value.slice(0, max) : event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#9CA3AF] disabled:cursor-default"
        />
        {max && (
          <small className="mt-0.5 text-right text-[9.5px] leading-3 text-[#9CA3AF]">
            {value.length}/{max}
          </small>
        )}
      </span>
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
  tone?: "danger" | "success";
}) {
  return (
    <span
      className={cn(
        control,
        "relative",
        tone === "danger" && "border-[#F7CDD1] bg-[#FFF5F6]",
        tone === "success" && "border-[#CDECE1] bg-white",
      )}
    >
      {tone === "success" && <i className="size-1.5 shrink-0 rounded-full bg-[#0AA673]" />}
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
  icon: Icon,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  max?: number;
  placeholder?: string;
  icon?: typeof Flag;
}) {
  return (
    <div className="relative rounded-lg border border-[#E2E5EE] bg-white transition-colors focus-within:border-[#E11D28] focus-within:ring-2 focus-within:ring-[#E11D28]/12">
      {Icon && <Icon className="absolute left-2.5 top-2.5 size-3.5 text-[#9CA3AF]" />}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, max))}
        rows={rows}
        placeholder={placeholder}
        className={cn(
          "w-full resize-none rounded-lg bg-transparent px-3 py-2 pb-5 text-[11.5px] leading-[17px] outline-none placeholder:text-[#9CA3AF]",
          Icon && "pl-8",
        )}
      />
      <span className="pointer-events-none absolute bottom-1.5 right-2.5 text-[9.5px] text-[#9CA3AF]">
        {value.length}/{max}
      </span>
    </div>
  );
}

export function TagField({
  tags,
  onChange,
  placeholder,
  icon: Icon,
  chevron = true,
  renderIcon,
  addLabel,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  icon?: typeof Flag;
  chevron?: boolean;
  renderIcon?: (tag: string) => ReactNode;
  /** Renders a "+ Add tag" affordance in place of the plain placeholder. */
  addLabel?: string;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const value = draft.trim();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  };
  return (
    <div
      className={cn(
        "relative flex min-h-[38px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-[#E2E5EE] bg-white px-2.5 py-1.5 transition-colors focus-within:border-[#E11D28] focus-within:ring-2 focus-within:ring-[#E11D28]/12",
        chevron && "pr-7",
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0 text-[#9CA3AF]" />}
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-md border border-[#E6E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-medium text-[#374151]"
        >
          {renderIcon?.(tag)}
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(tags.filter((item) => item !== tag))}
            className="text-[#9CA3AF] transition-colors hover:text-[#E11D28]"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}
      <span className="flex min-w-[92px] flex-1 items-center gap-1">
        {addLabel && <Plus className="size-3 shrink-0 text-[#9CA3AF]" />}
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
          placeholder={addLabel ?? (tags.length ? "" : placeholder)}
          className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#9CA3AF]"
        />
      </span>
      {chevron && (
        <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-[#9CA3AF]" />
      )}
    </div>
  );
}

export function Toggle({ on, onToggle }: { on: boolean; onToggle?: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        on ? "bg-[#E11D28]" : "bg-[#CBD5E1]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 block size-4 rounded-full bg-white shadow-sm transition-all",
          on ? "left-[18px]" : "left-0.5",
        )}
      />
    </button>
  );
}

export function GreenToggle({ on, onToggle }: { on: boolean; onToggle?: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        on ? "bg-[#0AA673]" : "bg-[#CBD5E1]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 block size-4 rounded-full bg-white shadow-sm transition-all",
          on ? "left-[18px]" : "left-0.5",
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
  onToggle?: () => void;
  label: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="flex items-center gap-2 text-left text-[10.5px] text-[#374151]"
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

/** Segmented control — Gender and Device Preference on step 4. */
export function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { id: string; label: string; icon?: typeof Flag }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={cn(
              "flex h-[34px] items-center gap-1.5 rounded-lg border px-3 text-[11px] font-semibold transition-colors",
              active
                ? "border-[#E11D28] bg-[#FFF5F6] text-[#E11D28]"
                : "border-[#E2E5EE] bg-white text-[#374151] hover:border-[#F5B5BA]",
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function OptionCard({
  active,
  onSelect,
  icon: Icon,
  tint: tintClass,
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
      <span className={cn("grid size-8 place-items-center rounded-lg", tintClass)}>
        <Icon className="size-4" />
      </span>
      <b className="mt-1.5 block text-[11.5px] font-bold text-[#111827]">{title}</b>
      <small className="block text-[9.5px] leading-[13px] text-[#8791A4]">{caption}</small>
    </button>
  );
}

/** Read-only allocation bar used by Budget Distribution by Channel. */
export function Slider({ percent }: { percent: number }) {
  return (
    <span className="relative block h-1.5 w-full rounded-full bg-[#EDF1F7]">
      <i className="absolute left-0 top-0 block h-full rounded-full bg-[#E11D28]" style={{ width: `${percent}%` }} />
      <i
        className="absolute top-1/2 block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#E11D28] shadow-sm"
        style={{ left: `${percent}%` }}
      />
    </span>
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
