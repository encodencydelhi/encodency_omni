"use client";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SpellCheckedInput, SpellCheckedTextarea } from "@/components/ui/spellchecked-input";

export function StepTitle({ step, title, hint }: { step: string; title: string; hint?: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#F0F4FF] text-[10px] font-semibold text-[#1769DF]">{step}</span>
      <div className="min-w-0">
        <h4 className="text-[13px] font-semibold leading-4 text-[#172044]">{title}</h4>
        {hint && <p className="text-[11px] text-[#7A87A0]">{hint}</p>}
      </div>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#7A87A0]">{children}</p>;
}

export function SelectField({ label, value, options, placeholder, required, onChange }: { label: string; value?: string; options?: string[]; placeholder?: string; required?: boolean; onChange?: (v: string) => void }) {
  return (
    <label className="min-w-0 flex-1">
      <span className="mb-1 block text-[11.5px] font-semibold text-[#4B5B76]">{label} {required && <span className="text-red-500">*</span>}</span>
      {options ? (
        <select value={value} onChange={e => onChange?.(e.target.value)} className="h-9 w-full appearance-none rounded-lg border border-[#D9E1EC] bg-white px-2.5 pr-8 text-[12.5px] font-medium text-[#24365A] outline-none transition hover:border-[#1769DF] focus:border-[#1769DF]">
          {placeholder && !value && <option value="">{placeholder}</option>}
          {options.map((o) => o && <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <span className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-[#D9E1EC] bg-white px-2.5 text-[12.5px] font-medium text-[#24365A] transition hover:border-[#1769DF]">
          <span className="truncate">{value}</span>
          <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
        </span>
      )}
    </label>
  );
}

export function TextField({ label, value = "", placeholder, name, id, onChange, spellCheck = true }: { label: string; value?: string; placeholder?: string; name?: string; id?: string; onChange?: (v: string) => void; spellCheck?: boolean }) {
  return (
    <label className="min-w-0 flex-1 block">
      <span className="mb-1 block text-[11.5px] font-semibold text-[#4B5B76]">{label}</span>
      <div className="h-9 w-full rounded-lg border border-[#D9E1EC] bg-white px-2.5 text-[12.5px] text-[#24365A] transition hover:border-[#1769DF] focus-within:border-[#1769DF] flex items-center">
        <SpellCheckedInput
          name={name}
          id={id}
          value={value}
          onChangeValue={onChange}
          placeholder={placeholder}
          spellCheckEnabled={spellCheck}
          className="w-full bg-transparent outline-none"
        />
      </div>
    </label>
  );
}

export function TextareaField({ label, value = "", rows = 3, placeholder, name, id, onChange, spellCheck = true }: { label: string; value?: string; rows?: number; placeholder?: string; name?: string; id?: string; onChange?: (v: string) => void; spellCheck?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-[#4B5B76]">{label}</span>
      <div className="w-full rounded-lg border border-[#D9E1EC] bg-white p-2.5 text-[12.5px] leading-5 text-[#24365A] transition hover:border-[#1769DF] focus-within:border-[#1769DF]">
        <SpellCheckedTextarea
          name={name}
          id={id}
          value={value}
          onChangeValue={onChange}
          rows={rows}
          placeholder={placeholder}
          spellCheckEnabled={spellCheck}
          className="w-full bg-transparent outline-none"
        />
      </div>
    </label>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange} className={cn("relative shrink-0 rounded-full transition", on ? "bg-[#1769DF]" : "bg-[#D5DDE8]")} style={{ height: 20, width: 36 }}>
      <span className="absolute top-[2px] size-4 rounded-full bg-white shadow-sm transition-all" style={{ [on ? "right" : "left"]: 2 } as React.CSSProperties} />
    </button>
  );
}
