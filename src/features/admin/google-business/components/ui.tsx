"use client";

/**
 * Design system for the Google Business workspace: white surfaces, Google blue
 * as the single primary accent, restrained borders and shadows. Every page
 * composes these, so spacing, radii and states stay identical across tabs.
 */

import Image from "next/image";
import Link from "next/link";
import { forwardRef, useEffect, useId, useState, type ComponentProps, type ComponentType, type ReactNode } from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  Info,
  Loader2,
  Lock,
  Search,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDebounced } from "../hooks/use-now";
import type { Capability } from "../types";

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

export const gb = {
  card: "rounded-lg border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]",
  title: "text-[#202124]",
  body: "text-[#3C4043]",
  muted: "text-[#5F6368]",
  faint: "text-[#80868B]",
  divider: "border-[#E8EAED]",
  input:
    "h-9 w-full rounded-lg border border-[#DADCE0] bg-white px-3 text-[13px] text-[#202124] placeholder:text-[#80868B] outline-none transition focus:border-[#1A73E8] focus:ring-[3px] focus:ring-[#1A73E8]/15 disabled:cursor-not-allowed disabled:bg-[#F1F3F4] disabled:text-[#80868B]",
  textarea:
    "w-full rounded-lg border border-[#DADCE0] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#202124] placeholder:text-[#80868B] outline-none transition focus:border-[#1A73E8] focus:ring-[3px] focus:ring-[#1A73E8]/15",
  focus: "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#1A73E8]/30",
};

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

const VARIANTS = {
  primary: "bg-[#1A73E8] text-white shadow-[0_1px_2px_rgba(26,115,232,0.3)] hover:bg-[#1765CC] disabled:bg-[#A6C8F7]",
  secondary: "border border-[#DADCE0] bg-white text-[#3C4043] hover:border-[#C6C9CD] hover:bg-[#F8F9FA]",
  ghost: "text-[#3C4043] hover:bg-[#F1F3F4] hover:text-[#202124]",
  danger: "border border-[#F3C7C3] bg-white text-[#C5221F] hover:bg-[#FCE8E6]",
  dangerSolid: "bg-[#D93025] text-white hover:bg-[#C5221F]",
  link: "px-0 text-[#1A73E8] hover:text-[#1765CC] hover:underline",
} as const;

const SIZES = {
  xs: "h-7 gap-1 rounded-md px-2 text-[11.5px]",
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-[12px]",
  md: "h-9 gap-1.5 rounded-lg px-3.5 text-[12.5px]",
  icon: "size-8 rounded-lg",
  iconSm: "size-7 rounded-md",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

type ButtonProps = Omit<ComponentProps<"button">, "children"> & {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  icon?: ComponentType<{ className?: string }>;
  iconRight?: ComponentType<{ className?: string }>;
  loading?: boolean;
  /** Capability gate: when not allowed the button is disabled and explains why. */
  gate?: Capability;
  /** Tooltip for a disabled state that is not capability related. */
  disabledReason?: string;
  href?: string;
  external?: boolean;
  children?: ReactNode;
};

export function buttonClass(variant: ButtonVariant = "secondary", size: keyof typeof SIZES = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    gb.focus,
    SIZES[size],
    VARIANTS[variant],
    variant === "link" && "h-auto",
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon: Icon, iconRight: IconRight, loading, gate, disabledReason, href, external, className, children, disabled, type = "button", ...props },
  ref,
) {
  const blocked = gate ? !gate.allowed : false;
  const isDisabled = disabled || loading || blocked;
  const reason = blocked ? gate?.reason : disabled ? disabledReason : undefined;
  const iconSize = size === "xs" || size === "iconSm" ? "size-3.5" : "size-4";
  const content = (
    <>
      {loading ? <Loader2 className={cn(iconSize, "animate-spin")} /> : blocked ? <Lock className={cn(iconSize, "opacity-70")} /> : Icon ? <Icon className={iconSize} /> : null}
      {children}
      {IconRight && <IconRight className={cn(iconSize, "opacity-70")} />}
    </>
  );
  const cls = buttonClass(variant, size, className);

  if (href && !isDisabled) {
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
      </a>
    ) : (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }

  const button = (
    <button ref={ref} type={type} disabled={isDisabled} aria-disabled={isDisabled} className={cls} {...props}>
      {content}
    </button>
  );

  if (!reason) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={cn("inline-flex rounded-lg", gb.focus)} aria-label={reason}>
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] text-[12px] leading-snug">{reason}</TooltipContent>
    </Tooltip>
  );
});

export function Hint({ text, children, side = "top" }: { text: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-[280px] text-[12px] leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function InfoTip({ text, className }: { text: ReactNode; className?: string }) {
  return (
    <Hint text={text}>
      <button type="button" aria-label="More information" className={cn("inline-grid size-4 place-items-center rounded-full text-[#80868B] hover:text-[#3C4043]", gb.focus, className)}>
        <Info className="size-3.5" />
      </button>
    </Hint>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section className={cn(gb.card, "min-w-0", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  icon: Icon,
  badge,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 pt-3.5 pb-2.5", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && (
          <span className="mt-px grid size-7 shrink-0 place-items-center rounded-lg bg-[#E8F0FE] text-[#1A73E8]">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold leading-5 text-[#202124]">
            {title}
            {badge}
          </h2>
          {description && <p className="mt-0.5 text-[12px] leading-4 text-[#5F6368]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>}
    </header>
  );
}

export function ViewLink({ href, children = "View all" }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-0.5 rounded text-[12px] font-medium text-[#1A73E8] hover:text-[#1765CC]", gb.focus)}>
      {children}
      <ChevronRight className="size-3.5" />
    </Link>
  );
}

export function PageTitle({ title, description, actions, meta }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-[#202124]">{title}</h2>
        {description && <p className="mt-0.5 text-[12.5px] text-[#5F6368]">{description}</p>}
        {meta}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges & status                                                     */
/* ------------------------------------------------------------------ */

export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet" | "cyan";

const TONES: Record<Tone, string> = {
  neutral: "bg-[#F1F3F4] text-[#3C4043] ring-[#E8EAED]",
  blue: "bg-[#E8F0FE] text-[#1967D2] ring-[#D2E3FC]",
  green: "bg-[#E6F4EA] text-[#137333] ring-[#CEEAD6]",
  amber: "bg-[#FEF7E0] text-[#B06000] ring-[#FEEFC3]",
  red: "bg-[#FCE8E6] text-[#C5221F] ring-[#FAD2CF]",
  violet: "bg-[#F3E8FD] text-[#8430CE] ring-[#E9D2FD]",
  cyan: "bg-[#E4F7FB] text-[#007B83] ring-[#CBF0F8]",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-[#80868B]",
  blue: "bg-[#1A73E8]",
  green: "bg-[#188038]",
  amber: "bg-[#F29900]",
  red: "bg-[#D93025]",
  violet: "bg-[#9334E6]",
  cyan: "bg-[#12B5CB]",
};

export function Badge({
  tone = "neutral",
  icon: Icon,
  dot,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ComponentType<{ className?: string }>;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[11px] font-medium ring-1 ring-inset", TONES[tone], className)}>
      {dot && <span className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />}
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}

/** Marks OmniPlatform-owned data so it is never mistaken for a Google metric. */
export function InternalBadge({ label = "OmniPlatform", hint }: { label?: string; hint?: string }) {
  const badge = (
    <span className="inline-flex h-5 items-center gap-1 rounded-md bg-[#F3E8FD] px-1.5 text-[10.5px] font-medium text-[#8430CE] ring-1 ring-inset ring-[#E9D2FD]">
      {label}
    </span>
  );
  return hint ? <Hint text={hint}>{badge}</Hint> : badge;
}

export function Stars({ rating, size = 14, className }: { rating: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          style={{ width: size, height: size }}
          className={star <= Math.round(rating) ? "fill-[#FBBC04] text-[#FBBC04]" : "fill-[#E8EAED] text-[#E8EAED]"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs & segmented                                                    */
/* ------------------------------------------------------------------ */

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
  href?: string;
  icon?: ComponentType<{ className?: string }>;
}

/** Arrow-key navigation for tab lists and segmented controls (roving focus). */
function onArrowKey<T extends string>(
  event: React.KeyboardEvent<HTMLElement>,
  items: { value: T; href?: string }[],
  value: T,
  onChange?: (value: T) => void,
) {
  if (!onChange || items.some((i) => i.href)) return;
  if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const index = items.findIndex((i) => i.value === value);
  const nextIndex =
    event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
  const next = items[nextIndex];
  if (!next) return;
  onChange(next.value);
  event.currentTarget.querySelector<HTMLElement>(`[data-value="${CSS.escape(next.value)}"]`)?.focus();
}

export function UnderlineTabs<T extends string>({
  items,
  value,
  onChange,
  className,
  size = "md",
  label,
}: {
  items: TabItem<T>[];
  value: T;
  onChange?: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
  label: string;
}) {
  return (
    <div
      role={items.some((i) => i.href) ? undefined : "tablist"}
      aria-label={label}
      onKeyDown={(event) => onArrowKey(event, items, value, onChange)}
      className={cn("scrollbar-thin -mb-px flex gap-1 overflow-x-auto", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        const cls = cn(
          "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 font-medium transition-colors",
          size === "sm" ? "px-2 pb-2 pt-1 text-[12px]" : "px-2.5 pb-2.5 pt-1.5 text-[12.5px]",
          active ? "border-[#1A73E8] text-[#1A73E8]" : "border-transparent text-[#5F6368] hover:border-[#DADCE0] hover:text-[#202124]",
          gb.focus,
        );
        const inner = (
          <>
            {item.icon && <item.icon className={cn("size-3.5", active ? "text-[#1A73E8]" : "text-[#80868B]")} />}
            {item.label}
            {item.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-[10.5px] font-medium leading-4", active ? "bg-[#E8F0FE] text-[#1967D2]" : "bg-[#F1F3F4] text-[#5F6368]")}>
                {item.count}
              </span>
            )}
          </>
        );
        return item.href ? (
          <Link key={item.value} href={item.href} aria-current={active ? "page" : undefined} className={cls} scroll={false}>
            {inner}
          </Link>
        ) : (
          <button key={item.value} type="button" role="tab" aria-selected={active} tabIndex={active ? 0 : -1} data-value={item.value} onClick={() => onChange?.(item.value)} className={cls}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: { value: T; label: ReactNode; icon?: ComponentType<{ className?: string }>; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={(event) => onArrowKey(event, items, value, onChange)}
      className={cn("inline-flex h-8 items-center rounded-lg bg-[#F1F3F4] p-0.5", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-value={item.value}
            title={item.title}
            onClick={() => onChange(item.value)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition",
              active ? "bg-white text-[#202124] shadow-[0_1px_2px_rgba(60,64,67,0.15)]" : "text-[#5F6368] hover:text-[#202124]",
              gb.focus,
            )}
          >
            {item.icon && <item.icon className="size-3.5" />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Select & menus (portalled, keyboard accessible)                     */
/* ------------------------------------------------------------------ */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  label,
  prefix,
  icon: Icon,
  className,
  align = "start",
  size = "sm",
  placeholder,
  fullWidth,
  disabled,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
  prefix?: string;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  align?: "start" | "end";
  size?: "sm" | "md";
  placeholder?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}) {
  const current = options.find((option) => option.value === value);
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger
        aria-label={label}
        disabled={disabled}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-white text-left font-medium text-[#3C4043] transition hover:border-[#C6C9CD] data-[state=open]:border-[#1A73E8] data-[state=open]:ring-[3px] data-[state=open]:ring-[#1A73E8]/15 disabled:cursor-not-allowed disabled:opacity-60",
          size === "sm" ? "h-8 px-2.5 text-[12px]" : "h-9 px-3 text-[13px]",
          fullWidth && "w-full",
          gb.focus,
          className,
        )}
      >
        {Icon && <Icon className="size-3.5 shrink-0 text-[#5F6368]" />}
        {prefix && <span className="shrink-0 text-[#5F6368]">{prefix}</span>}
        <span className={cn("min-w-0 flex-1 truncate", !current && "text-[#80868B]")}>{current?.label ?? placeholder ?? "Select"}</span>
        <ChevronDown className="size-3.5 shrink-0 text-[#80868B] transition group-data-[state=open]:rotate-180" />
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-h-[min(380px,var(--radix-dropdown-menu-content-available-height))] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-lg border border-[#E8EAED] bg-white p-1 shadow-[0_8px_24px_rgba(60,64,67,0.22)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownPrimitive.RadioGroup value={value} onValueChange={(next) => onChange(next as T)}>
            {options.map((option) => (
              <DropdownPrimitive.RadioItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex cursor-pointer select-none items-start gap-2 rounded-md py-1.5 pl-7 pr-2.5 text-[12.5px] text-[#3C4043] outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-[#F1F3F4] data-[state=checked]:font-medium data-[state=checked]:text-[#1967D2]"
              >
                <DropdownPrimitive.ItemIndicator className="absolute left-2 top-2">
                  <Check className="size-3.5 text-[#1A73E8]" />
                </DropdownPrimitive.ItemIndicator>
                <span className="min-w-0">
                  <span className="block">{option.label}</span>
                  {option.description && <span className="block text-[11px] font-normal text-[#5F6368]">{option.description}</span>}
                </span>
              </DropdownPrimitive.RadioItem>
            ))}
          </DropdownPrimitive.RadioGroup>
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

/** Menu items are links, handlers, or disabled with a reason - never inert. */
export interface MenuItem {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  href?: string;
  external?: boolean;
  onSelect?: () => void;
  danger?: boolean;
  gate?: Capability;
  hidden?: boolean;
}

export function ActionMenu({
  trigger,
  items,
  label,
  align = "end",
  width = 216,
}: {
  trigger: ReactNode;
  items: (MenuItem | "separator")[];
  label: string;
  align?: "start" | "end";
  width?: number;
}) {
  const visible = items.filter((item) => item === "separator" || !item.hidden);
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild aria-label={label}>
        {trigger}
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          style={{ minWidth: width }}
          className="z-50 rounded-lg border border-[#E8EAED] bg-white p-1 shadow-[0_8px_24px_rgba(60,64,67,0.22)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {visible.map((item, index) => {
            if (item === "separator") {
              const previous = visible[index - 1];
              if (index === 0 || previous === "separator" || index === visible.length - 1) return null;
              return <DropdownPrimitive.Separator key={`sep-${index}`} className="-mx-1 my-1 h-px bg-[#E8EAED]" />;
            }
            const blocked = item.gate && !item.gate.allowed;
            const Icon = blocked ? Lock : item.icon;
            const cls = cn(
              "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] outline-none data-[highlighted]:bg-[#F1F3F4] data-[disabled]:cursor-not-allowed",
              item.danger ? "text-[#C5221F] data-[highlighted]:bg-[#FCE8E6]" : "text-[#3C4043]",
              blocked && "text-[#80868B]",
            );
            const inner = (
              <>
                {Icon && <Icon className={cn("size-3.5 shrink-0", item.danger ? "text-[#C5221F]" : "text-[#5F6368]", blocked && "text-[#80868B]")} />}
                <span className="flex-1 truncate">{item.label}</span>
              </>
            );
            if (blocked) {
              return (
                <DropdownPrimitive.Item key={item.label} disabled className={cn(cls, "flex-col items-start gap-0")}>
                  <span className="flex w-full items-center gap-2">{inner}</span>
                  <span className="pl-5.5 text-[10.5px] leading-tight text-[#80868B]">{item.gate?.reason}</span>
                </DropdownPrimitive.Item>
              );
            }
            if (item.href) {
              return (
                <DropdownPrimitive.Item key={item.label} asChild className={cls}>
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer">
                      {inner}
                    </a>
                  ) : (
                    <Link href={item.href}>{inner}</Link>
                  )}
                </DropdownPrimitive.Item>
              );
            }
            return (
              <DropdownPrimitive.Item key={item.label} onSelect={item.onSelect} className={cls}>
                {inner}
              </DropdownPrimitive.Item>
            );
          })}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
  loading,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  loading?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn("relative min-w-[180px]", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#80868B]" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(gb.input, "h-8 pl-8 pr-8 text-[12.5px] [&::-webkit-search-cancel-button]:hidden")}
      />
      <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
        {loading ? (
          <Loader2 className="mr-1 size-3.5 animate-spin text-[#80868B]" aria-label="Searching" />
        ) : value ? (
          <button type="button" onClick={() => onChange("")} aria-label="Clear search" className={cn("grid size-5 place-items-center rounded text-[#80868B] hover:bg-[#F1F3F4] hover:text-[#3C4043]", gb.focus)}>
            <X className="size-3.5" />
          </button>
        ) : null}
      </span>
    </div>
  );
}

/**
 * Search box state that types instantly and writes to the URL after a pause,
 * so filters stay shareable without a history entry per keystroke.
 */
export function useDebouncedSearch(initial: string, commit: (value: string) => void, delay = 250) {
  const [search, setSearch] = useState(initial);
  const { value, pending } = useDebounced(search, delay);
  useEffect(() => {
    if (value !== initial) commit(value);
    // Only the debounced text should drive the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return { search, setSearch, pending };
}

export function FormField({
  label,
  hint,
  error,
  counter,
  required,
  children,
  className,
  htmlFor,
  aside,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  counter?: { value: number; max: number };
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  aside?: ReactNode;
}) {
  const over = counter && counter.value > counter.max;
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#3C4043]">
          {label}
          {required && (
            <span className="text-[#D93025]" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {aside}
        {counter && (
          <span className={cn("text-[11px] tabular-nums", over ? "font-medium text-[#C5221F]" : "text-[#80868B]")}>
            {counter.value.toLocaleString()}/{counter.max.toLocaleString()}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p role="alert" className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-[#C5221F]">
          <AlertTriangle className="size-3" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11.5px] leading-4 text-[#5F6368]">{hint}</p>
      ) : null}
    </div>
  );
}

export function ChoiceCard({
  checked,
  onSelect,
  title,
  description,
  icon: Icon,
  disabled,
  name,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
  name: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition",
        checked ? "border-[#1A73E8] bg-[#F8FBFF] ring-[3px] ring-[#1A73E8]/10" : "border-[#DADCE0] bg-white hover:border-[#C6C9CD]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input id={id} type="radio" name={name} checked={checked} disabled={disabled} onChange={onSelect} className="peer sr-only" />
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2 peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#1A73E8]/30", checked ? "border-[#1A73E8]" : "border-[#C6C9CD]")}>
        {checked && <span className="size-1.5 rounded-full bg-[#1A73E8]" />}
      </span>
      {Icon && <Icon className="mt-px size-4 shrink-0 text-[#5F6368]" />}
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-[#202124]">{title}</span>
        {description && <span className="mt-0.5 block text-[12px] leading-4 text-[#5F6368]">{description}</span>}
      </span>
    </label>
  );
}

export function TagInput({ value, onChange, placeholder = "Add and press Enter", id }: { value: string[]; onChange: (values: string[]) => void; placeholder?: string; id?: string }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
    const next = [...value];
    parts.forEach((part) => {
      if (!next.some((existing) => existing.toLowerCase() === part.toLowerCase())) next.push(part);
    });
    onChange(next);
    setDraft("");
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-white px-2 py-1.5 focus-within:border-[#1A73E8] focus-within:ring-[3px] focus-within:ring-[#1A73E8]/15">
      {value.map((tag) => (
        <span key={tag} className="inline-flex h-6 items-center gap-1 rounded-md bg-[#F1F3F4] pl-2 pr-1 text-[12px] font-medium text-[#3C4043]">
          {tag}
          <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((item) => item !== tag))} className="grid size-4 place-items-center rounded text-[#5F6368] hover:bg-[#E8EAED]">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === ",") && draft.trim()) {
            event.preventDefault();
            add(draft);
          } else if (event.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={value.length ? "" : placeholder}
        className="h-6 min-w-[120px] flex-1 bg-transparent text-[12.5px] text-[#202124] outline-none placeholder:text-[#80868B]"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Media & people                                                      */
/* ------------------------------------------------------------------ */

export function Thumb({
  src,
  alt = "",
  className,
  sizes = "160px",
  square,
}: {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
  square?: boolean;
}) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-md bg-[#F1F3F4]", square ? "aspect-square" : "aspect-[4/3]", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} unoptimized={src.startsWith("blob:") || src.startsWith("data:")} className="object-cover" />
    </span>
  );
}

const AVATAR_TINTS = [
  "bg-[#E8F0FE] text-[#1967D2]",
  "bg-[#FCE8E6] text-[#C5221F]",
  "bg-[#FEF7E0] text-[#B06000]",
  "bg-[#E6F4EA] text-[#137333]",
  "bg-[#F3E8FD] text-[#8430CE]",
  "bg-[#E4F7FB] text-[#007B83]",
];

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const short = name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const tint = AVATAR_TINTS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TINTS.length];
  if (src) {
    return (
      <span className={cn("relative block size-8 shrink-0 overflow-hidden rounded-full bg-[#F1F3F4]", className)}>
        <Image src={src} alt="" fill sizes="40px" className="object-cover" />
      </span>
    );
  }
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-medium", tint, className)} aria-hidden="true">
      {short}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block animate-pulse rounded-md bg-[#F1F3F4]", className)} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondary,
  className,
  compact,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  secondary?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 text-center", compact ? "py-8" : "py-14", className)}>
      <span className="grid size-11 place-items-center rounded-xl bg-[#F1F3F4] text-[#5F6368] ring-1 ring-[#E8EAED]">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-3 text-[14px] font-medium text-[#202124]">{title}</h3>
      <p className="mt-1 max-w-[380px] text-[12.5px] leading-5 text-[#5F6368]">{description}</p>
      {(action || secondary) && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}{secondary}</div>}
    </div>
  );
}

const NOTICE_TONES = {
  red: { box: "border-[#FAD2CF] bg-[#FCE8E6]", icon: "text-[#C5221F]" },
  violet: { box: "border-[#E9D2FD] bg-[#F3E8FD]", icon: "text-[#8430CE]" },
  amber: { box: "border-[#FEEFC3] bg-[#FEF7E0]", icon: "text-[#B06000]" },
  blue: { box: "border-[#D2E3FC] bg-[#E8F0FE]", icon: "text-[#1967D2]" },
  green: { box: "border-[#CEEAD6] bg-[#E6F4EA]", icon: "text-[#137333]" },
  neutral: { box: "border-[#E8EAED] bg-[#F8F9FA]", icon: "text-[#5F6368]" },
};

export function Notice({
  tone = "blue",
  title,
  children,
  actions,
  icon: Icon = Info,
  className,
}: {
  tone?: keyof typeof NOTICE_TONES;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) {
  const palette = NOTICE_TONES[tone];
  return (
    <div role={tone === "red" ? "alert" : "status"} className={cn("flex flex-wrap items-start gap-3 rounded-lg border px-3.5 py-3", palette.box, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", palette.icon)} />
      <div className="min-w-[200px] flex-1">
        <p className="text-[13px] font-medium text-[#202124]">{title}</p>
        {children && <div className="mt-0.5 text-[12.5px] leading-5 text-[#3C4043]">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Meter({ value, tone = "blue", className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <span className={cn("block h-1.5 overflow-hidden rounded-full bg-[#F1F3F4]", className)} role="presentation">
      <span className={cn("block h-full rounded-full transition-[width] duration-500", TONE_DOT[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}

export function DefinitionRow({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#F1F3F4] py-2 last:border-0">
      <dt className="shrink-0 text-[12px] text-[#5F6368]">{label}</dt>
      <dd className={cn("min-w-0 break-words text-right text-[12.5px] font-medium text-[#202124]", mono && "font-mono text-[12px]")}>{children}</dd>
    </div>
  );
}

export function TrendDelta({ value, invert, className }: { value: number | null; invert?: boolean; className?: string }) {
  if (value === null || !Number.isFinite(value)) return <span className={cn("text-[11.5px] text-[#80868B]", className)}>No comparison</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11.5px] font-medium tabular-nums", good ? "text-[#137333]" : "text-[#C5221F]", className)}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      {Math.abs(value).toFixed(1)}%<span className="sr-only">{up ? "increase" : "decrease"}</span>
    </span>
  );
}

export function copyText(text: string, label = "Copied to clipboard") {
  void navigator.clipboard
    ?.writeText(text)
    .then(() => toast.success(label))
    .catch(() => toast.error("Could not copy", { description: "Select the text and copy it manually." }));
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button type="button" onClick={() => copyText(value, `${label} copied`)} aria-label={`Copy ${label}`} className={cn("inline-flex items-center gap-1 rounded text-[12px] text-[#5F6368] hover:text-[#202124]", gb.focus)}>
      <span className="font-mono text-[11.5px]">{value}</span>
      <Copy className="size-3" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Confirmation                                                        */
/* ------------------------------------------------------------------ */

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** Exactly what changes - shown as a list so nothing is a surprise. */
  affected?: string[];
  confirmLabel: string;
  onConfirm: () => Promise<boolean | void> | boolean | void;
  destructive?: boolean;
  /** Type-to-confirm for irreversible, high-impact actions. */
  confirmText?: string;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  return props.open ? <ConfirmDialogBody {...props} /> : null;
}

function ConfirmDialogBody({ open, onOpenChange, title, description, affected, confirmLabel, onConfirm, destructive = true, confirmText }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const blocked = confirmText ? typed.trim() !== confirmText : false;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[460px] gap-0 p-0">
        <DialogHeader className="px-5 pt-5">
          <div className="flex items-start gap-3">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", destructive ? "bg-[#FCE8E6] text-[#C5221F]" : "bg-[#E8F0FE] text-[#1967D2]")}>
              {destructive ? <AlertTriangle className="size-4.5" /> : <Info className="size-4.5" />}
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-[15px] leading-5 text-[#202124]">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-[12.5px] leading-5 text-[#3C4043]">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {(affected?.length || confirmText) && (
          <div className="space-y-3 px-5 pt-3">
            {affected && affected.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[#E8EAED] bg-[#F8F9FA] p-2.5 text-[12px] text-[#3C4043]">
                {affected.map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#80868B]" />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {confirmText && (
              <FormField
                label={
                  <span>
                    Type <b className="font-mono">{confirmText}</b> to confirm
                  </span>
                }
              >
                <input className={gb.input} value={typed} onChange={(event) => setTyped(event.target.value)} autoFocus />
              </FormField>
            )}
          </div>
        )}
        <DialogFooter className="mt-4 border-t border-[#E8EAED] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "dangerSolid" : "primary"}
            loading={busy}
            disabled={blocked}
            onClick={async () => {
              setBusy(true);
              const result = await onConfirm();
              setBusy(false);
              if (result !== false) onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export type SortDir = "asc" | "desc";

export const thClass =
  "sticky top-0 z-[1] whitespace-nowrap border-b border-[#E8EAED] bg-[#F8F9FA] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.04em] text-[#5F6368]";
export const tdClass = "whitespace-nowrap border-b border-[#F1F3F4] px-3 py-2 align-middle text-[12.5px] text-[#3C4043]";

export function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"} className={cn(thClass, align === "right" && "text-right", className)}>
      <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1 rounded hover:text-[#202124]", active && "text-[#202124]", align === "right" && "flex-row-reverse", gb.focus)}>
        {label}
        {active ? <ChevronDown className={cn("size-3", dir === "asc" && "rotate-180")} /> : <ChevronsUpDown className="size-3 opacity-50" />}
      </button>
    </th>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
  noun,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  noun: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[12px] text-[#5F6368]">
      <span>
        Showing{" "}
        <b className="font-medium text-[#202124]">
          {from}-{to}
        </b>{" "}
        of <b className="font-medium text-[#202124]">{total}</b> {noun}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button size="iconSm" variant="secondary" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft className="size-3.5" />
          </Button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => (
            <button
              key={value}
              type="button"
              aria-current={value === page ? "page" : undefined}
              onClick={() => onPage(value)}
              className={cn("h-7 min-w-7 rounded-md px-1.5 text-[12px] font-medium", value === page ? "bg-[#1A73E8] text-white" : "text-[#3C4043] hover:bg-[#F1F3F4]", gb.focus)}
            >
              {value}
            </button>
          ))}
          <Button size="iconSm" variant="secondary" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
