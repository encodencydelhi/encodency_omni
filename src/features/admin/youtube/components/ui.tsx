"use client";

/**
 * Design system for the YouTube workspace: light surfaces, navy type, YouTube
 * red as the single accent. Every page composes these so spacing, radii and
 * states stay identical across tabs.
 */

import Image from "next/image";
import Link from "next/link";
import {
  forwardRef,
  useEffect,
  useId,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleDashed,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  Globe2,
  Info,
  Link2,
  Loader2,
  Lock,
  Search,
  ShieldAlert,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { APPROVAL_LABEL, STATUS_LABEL, TYPE_LABEL, VISIBILITY_LABEL } from "../lib/constants";
import { duration as fmtDuration } from "../lib/format";
import type { ApprovalState, Capability, ContentType, PublishStatus, Visibility } from "../types";

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

export const yt = {
  card: "rounded-[10px] border border-[#E4E9F0] bg-white shadow-[0_1px_2px_rgba(15,27,61,0.04)]",
  title: "text-[#0F1B3D]",
  body: "text-[#3C4A66]",
  muted: "text-[#6B7890]",
  faint: "text-[#98A2B3]",
  divider: "border-[#EEF1F5]",
  input:
    "h-9 w-full rounded-lg border border-[#DCE2EA] bg-white px-3 text-[13px] text-[#0F1B3D] placeholder:text-[#98A2B3] outline-none transition focus:border-[#E5202E] focus:ring-[3px] focus:ring-[#E5202E]/12 disabled:cursor-not-allowed disabled:bg-[#F6F8FB] disabled:text-[#98A2B3]",
  textarea:
    "w-full rounded-lg border border-[#DCE2EA] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#0F1B3D] placeholder:text-[#98A2B3] outline-none transition focus:border-[#E5202E] focus:ring-[3px] focus:ring-[#E5202E]/12",
  focus: "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#E5202E]/25",
};

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

const VARIANTS = {
  primary: "bg-[#E5202E] text-white shadow-[0_1px_2px_rgba(229,32,46,0.3)] hover:bg-[#CC1826] disabled:bg-[#F2A3A9]",
  secondary: "border border-[#DCE2EA] bg-white text-[#24324F] shadow-[0_1px_2px_rgba(15,27,61,0.04)] hover:border-[#C9D1DC] hover:bg-[#F7F9FC]",
  ghost: "text-[#3C4A66] hover:bg-[#F1F4F8] hover:text-[#0F1B3D]",
  danger: "border border-[#F5C2C7] bg-white text-[#C81E2B] hover:bg-[#FEF1F2]",
  dangerSolid: "bg-[#C81E2B] text-white hover:bg-[#A91824]",
  link: "px-0 text-[#2563EB] hover:text-[#1D4ED8] hover:underline",
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
  /** Tooltip explaining a disabled state not covered by `gate`. */
  disabledReason?: string;
  href?: string;
  external?: boolean;
  children?: ReactNode;
};

export function buttonClass(variant: ButtonVariant = "secondary", size: keyof typeof SIZES = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    yt.focus,
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
        <span tabIndex={0} className={cn("inline-flex rounded-lg", yt.focus)} aria-label={reason}>
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[260px] text-[12px] leading-snug">{reason}</TooltipContent>
    </Tooltip>
  );
});

export function Hint({ text, children, side = "top" }: { text: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-[260px] text-[12px] leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function InfoTip({ text, className }: { text: ReactNode; className?: string }) {
  return (
    <Hint text={text}>
      <button type="button" aria-label="More information" className={cn("inline-grid size-4 place-items-center rounded-full text-[#98A2B3] hover:text-[#3C4A66]", yt.focus, className)}>
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
    <section className={cn(yt.card, "min-w-0", className)} {...props}>
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
          <span className="mt-px grid size-7 shrink-0 place-items-center rounded-lg bg-[#F3F5F9] text-[#3C4A66]">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold leading-5 text-[#0F1B3D]">
            {title}
            {badge}
          </h2>
          {description && <p className="mt-0.5 text-[12px] leading-4 text-[#6B7890]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>}
    </header>
  );
}

export function ViewLink({ href, children = "View all" }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-0.5 rounded text-[12px] font-semibold text-[#2563EB] hover:text-[#1D4ED8]", yt.focus)}>
      {children}
      <ChevronRight className="size-3.5" />
    </Link>
  );
}

export function PageTitle({ title, description, actions, meta }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-[#0F1B3D]">{title}</h2>
        {description && <p className="mt-0.5 text-[12.5px] text-[#6B7890]">{description}</p>}
        {meta}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export type Tone = "neutral" | "red" | "green" | "amber" | "blue" | "violet" | "cyan";

const TONES: Record<Tone, string> = {
  neutral: "bg-[#F1F4F8] text-[#475467] ring-[#E4E9F0]",
  red: "bg-[#FEF1F2] text-[#C81E2B] ring-[#FBD5D9]",
  green: "bg-[#ECFAF3] text-[#067647] ring-[#C6EFD9]",
  amber: "bg-[#FFF7E8] text-[#B54708] ring-[#FBE3B6]",
  blue: "bg-[#EFF4FF] text-[#1D4ED8] ring-[#D5E1FD]",
  violet: "bg-[#F4F0FF] text-[#6D28D9] ring-[#E2D8FD]",
  cyan: "bg-[#ECFAFD] text-[#0E7490] ring-[#C7EEF6]",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-[#98A2B3]",
  red: "bg-[#E5202E]",
  green: "bg-[#12B76A]",
  amber: "bg-[#F79009]",
  blue: "bg-[#2563EB]",
  violet: "bg-[#7C3AED]",
  cyan: "bg-[#06AED4]",
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
    <span className={cn("inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[11px] font-semibold ring-1 ring-inset", TONES[tone], className)}>
      {dot && <span className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />}
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}

const STATUS_META: Record<PublishStatus, { tone: Tone; icon: ComponentType<{ className?: string }> }> = {
  published: { tone: "green", icon: CheckCircle2 },
  scheduled: { tone: "blue", icon: Clock3 },
  draft: { tone: "neutral", icon: CircleDashed },
  processing: { tone: "amber", icon: Loader2 },
  failed: { tone: "red", icon: XCircle },
};

export function StatusBadge({ status }: { status: PublishStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} icon={meta.icon} className={status === "processing" ? "[&_svg]:animate-spin" : undefined}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const VIS_ICON: Record<Visibility, ComponentType<{ className?: string }>> = { public: Globe2, unlisted: Link2, private: Lock };

export function VisibilityLabel({ visibility, className }: { visibility: Visibility; className?: string }) {
  const Icon = VIS_ICON[visibility];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-[#3C4A66]", className)}>
      <Icon className="size-3.5 text-[#6B7890]" />
      {VISIBILITY_LABEL[visibility]}
    </span>
  );
}

const TYPE_TONE: Record<ContentType, Tone> = { video: "red", short: "violet", live: "cyan" };

export function TypeBadge({ type }: { type: ContentType }) {
  return <Badge tone={TYPE_TONE[type]}>{TYPE_LABEL[type]}</Badge>;
}

const APPROVAL_TONE: Record<ApprovalState, Tone> = {
  none: "neutral",
  pending: "amber",
  changes_requested: "amber",
  approved: "green",
  rejected: "red",
};

export function ApprovalBadge({ state }: { state: ApprovalState }) {
  if (state === "none") return null;
  return (
    <Badge tone={APPROVAL_TONE[state]} dot>
      {APPROVAL_LABEL[state]}
    </Badge>
  );
}

/** Marks OmniPlatform-owned data so it's never mistaken for YouTube's own. */
export function InternalBadge({ label = "OmniPlatform", hint }: { label?: string; hint?: string }) {
  const badge = (
    <span className="inline-flex h-5 items-center gap-1 rounded-md bg-[#F4F0FF] px-1.5 text-[10.5px] font-semibold text-[#6D28D9] ring-1 ring-inset ring-[#E2D8FD]">
      <Sparkles className="size-3" />
      {label}
    </span>
  );
  return hint ? <Hint text={hint}>{badge}</Hint> : badge;
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
  href?: string;
  icon?: ComponentType<{ className?: string }>;
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
      onKeyDown={(e) => onArrowKey(e, items, value, onChange)}
      className={cn("scrollbar-thin -mb-px flex gap-1 overflow-x-auto", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        const cls = cn(
          "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 font-semibold transition-colors",
          size === "sm" ? "px-2 pb-2 pt-1 text-[12px]" : "px-2.5 pb-2.5 pt-1.5 text-[12.5px]",
          active ? "border-[#E5202E] text-[#0F1B3D]" : "border-transparent text-[#6B7890] hover:border-[#D0D7E2] hover:text-[#0F1B3D]",
          yt.focus,
        );
        const inner = (
          <>
            {item.icon && <item.icon className={cn("size-3.5", active ? "text-[#E5202E]" : "text-[#98A2B3]")} />}
            {item.label}
            {item.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-[10.5px] font-semibold leading-4", active ? "bg-[#FEF1F2] text-[#C81E2B]" : "bg-[#F1F4F8] text-[#6B7890]")}>
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

/** Arrow-key navigation for tab lists and segmented controls (WAI-ARIA roving focus). */
function onArrowKey<T extends string>(e: React.KeyboardEvent<HTMLElement>, items: { value: T; href?: string }[], value: T, onChange?: (v: T) => void) {
  if (!onChange || items.some((i) => i.href)) return;
  const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
  if (!keys.includes(e.key)) return;
  e.preventDefault();
  const index = items.findIndex((i) => i.value === value);
  const nextIndex = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (index + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
  const next = items[nextIndex];
  if (!next) return;
  onChange(next.value);
  e.currentTarget.querySelector<HTMLElement>(`[data-value="${CSS.escape(next.value)}"]`)?.focus();
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
    <div role="radiogroup" aria-label={label} onKeyDown={(e) => onArrowKey(e, items, value, onChange)} className={cn("inline-flex h-8 items-center rounded-lg bg-[#F1F4F8] p-0.5", className)}>
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
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold transition",
              active ? "bg-white text-[#0F1B3D] shadow-[0_1px_2px_rgba(15,27,61,0.1)]" : "text-[#6B7890] hover:text-[#0F1B3D]",
              yt.focus,
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
/* Select menu (Radix, keyboard accessible, portalled — never clipped) */
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
  /** Rendered before the value, e.g. "Type:" — keeps filters self-describing. */
  prefix?: string;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  align?: "start" | "end";
  size?: "sm" | "md";
  placeholder?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger
        aria-label={label}
        disabled={disabled}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-lg border border-[#DCE2EA] bg-white text-left font-medium text-[#24324F] shadow-[0_1px_2px_rgba(15,27,61,0.04)] transition hover:border-[#C9D1DC] data-[state=open]:border-[#E5202E] data-[state=open]:ring-[3px] data-[state=open]:ring-[#E5202E]/12 disabled:cursor-not-allowed disabled:opacity-60",
          size === "sm" ? "h-8 px-2.5 text-[12px]" : "h-9 px-3 text-[13px]",
          fullWidth && "w-full",
          yt.focus,
          className,
        )}
      >
        {Icon && <Icon className="size-3.5 shrink-0 text-[#6B7890]" />}
        {prefix && <span className="shrink-0 text-[#6B7890]">{prefix}</span>}
        <span className={cn("min-w-0 flex-1 truncate", !current && "text-[#98A2B3]")}>{current?.label ?? placeholder ?? "Select"}</span>
        <ChevronDown className="size-3.5 shrink-0 text-[#98A2B3] transition group-data-[state=open]:rotate-180" />
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-h-[min(360px,var(--radix-dropdown-menu-content-available-height))] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-lg border border-[#E4E9F0] bg-white p-1 shadow-[0_12px_32px_-8px_rgba(15,27,61,0.18)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownPrimitive.RadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
            {options.map((option) => (
              <DropdownPrimitive.RadioItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex cursor-pointer select-none items-start gap-2 rounded-md py-1.5 pl-7 pr-2.5 text-[12.5px] text-[#24324F] outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-[#F3F5F9] data-[state=checked]:font-semibold data-[state=checked]:text-[#0F1B3D]"
              >
                <DropdownPrimitive.ItemIndicator className="absolute left-2 top-2">
                  <Check className="size-3.5 text-[#E5202E]" />
                </DropdownPrimitive.ItemIndicator>
                <span className="min-w-0">
                  <span className="block">{option.label}</span>
                  {option.description && <span className="block text-[11px] font-normal text-[#6B7890]">{option.description}</span>}
                </span>
              </DropdownPrimitive.RadioItem>
            ))}
          </DropdownPrimitive.RadioGroup>
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

/** Generic action menu. Items are links, handlers, or disabled with a reason — never inert. */
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
  width = 208,
}: {
  trigger: ReactNode;
  items: (MenuItem | "separator")[];
  label: string;
  align?: "start" | "end";
  width?: number;
}) {
  const visible = items.filter((i) => i === "separator" || !i.hidden);
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
          className="z-50 rounded-lg border border-[#E4E9F0] bg-white p-1 shadow-[0_12px_32px_-8px_rgba(15,27,61,0.18)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {visible.map((item, index) => {
            if (item === "separator") {
              const prev = visible[index - 1];
              if (index === 0 || prev === "separator" || index === visible.length - 1) return null;
              return <DropdownPrimitive.Separator key={`sep-${index}`} className="-mx-1 my-1 h-px bg-[#EEF1F5]" />;
            }
            const blocked = item.gate && !item.gate.allowed;
            const Icon = blocked ? Lock : item.icon;
            const cls = cn(
              "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] font-medium outline-none data-[highlighted]:bg-[#F3F5F9] data-[disabled]:cursor-not-allowed",
              item.danger ? "text-[#C81E2B] data-[highlighted]:bg-[#FEF1F2]" : "text-[#24324F]",
              blocked && "text-[#98A2B3]",
            );
            const inner = (
              <>
                {Icon && <Icon className={cn("size-3.5 shrink-0", item.danger ? "text-[#C81E2B]" : "text-[#6B7890]", blocked && "text-[#98A2B3]")} />}
                <span className="flex-1 truncate">{item.label}</span>
              </>
            );
            if (blocked) {
              return (
                <DropdownPrimitive.Item key={item.label} disabled className={cn(cls, "flex-col items-start gap-0")}>
                  <span className="flex w-full items-center gap-2">{inner}</span>
                  <span className="pl-5.5 text-[10.5px] leading-tight text-[#98A2B3]">{item.gate?.reason}</span>
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
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#98A2B3]" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(yt.input, "h-8 pl-8 pr-8 text-[12.5px] [&::-webkit-search-cancel-button]:hidden")}
      />
      <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
        {loading ? (
          <Loader2 className="mr-1 size-3.5 animate-spin text-[#98A2B3]" aria-label="Searching" />
        ) : value ? (
          <button type="button" onClick={() => onChange("")} aria-label="Clear search" className={cn("grid size-5 place-items-center rounded text-[#98A2B3] hover:bg-[#F1F4F8] hover:text-[#3C4A66]", yt.focus)}>
            <X className="size-3.5" />
          </button>
        ) : null}
      </span>
    </div>
  );
}

/** Debounces a text value; `pending` is true while the debounced copy lags behind. */
export function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return { value: debounced, pending: debounced !== value };
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
        <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#24324F]">
          {label}
          {required && <span className="text-[#E5202E]" aria-hidden="true">*</span>}
        </label>
        {aside}
        {counter && (
          <span className={cn("text-[11px] tabular-nums", over ? "font-semibold text-[#C81E2B]" : "text-[#98A2B3]")}>
            {counter.value.toLocaleString()}/{counter.max.toLocaleString()}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p role="alert" className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-[#C81E2B]">
          <AlertTriangle className="size-3" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11.5px] leading-4 text-[#6B7890]">{hint}</p>
      ) : null}
    </div>
  );
}

export function TagInput({ value, onChange, placeholder = "Add a tag and press Enter", id }: { value: string[]; onChange: (tags: string[]) => void; placeholder?: string; id?: string }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw.split(",").map((t) => t.trim()).filter(Boolean);
    const next = [...value];
    parts.forEach((p) => {
      if (!next.some((t) => t.toLowerCase() === p.toLowerCase())) next.push(p);
    });
    onChange(next);
    setDraft("");
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-[#DCE2EA] bg-white px-2 py-1.5 focus-within:border-[#E5202E] focus-within:ring-[3px] focus-within:ring-[#E5202E]/12">
      {value.map((tag) => (
        <span key={tag} className="inline-flex h-6 items-center gap-1 rounded-md bg-[#F1F4F8] pl-2 pr-1 text-[12px] font-medium text-[#24324F]">
          {tag}
          <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))} className="grid size-4 place-items-center rounded text-[#6B7890] hover:bg-[#E4E9F0]">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={value.length ? "" : placeholder}
        className="h-6 min-w-[120px] flex-1 bg-transparent text-[12.5px] text-[#0F1B3D] outline-none placeholder:text-[#98A2B3]"
      />
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
        checked ? "border-[#E5202E] bg-[#FFF8F8] ring-[3px] ring-[#E5202E]/10" : "border-[#DCE2EA] bg-white hover:border-[#C9D1DC]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input id={id} type="radio" name={name} checked={checked} disabled={disabled} onChange={onSelect} className="peer sr-only" />
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2 peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#E5202E]/25", checked ? "border-[#E5202E]" : "border-[#C9D1DC]")}>
        {checked && <span className="size-1.5 rounded-full bg-[#E5202E]" />}
      </span>
      {Icon && <Icon className="mt-px size-4 shrink-0 text-[#6B7890]" />}
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-[#0F1B3D]">{title}</span>
        {description && <span className="mt-0.5 block text-[12px] leading-4 text-[#6B7890]">{description}</span>}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Media & people                                                      */
/* ------------------------------------------------------------------ */

export function Thumb({
  src,
  alt = "",
  durationSec,
  className,
  vertical,
  sizes = "160px",
}: {
  src: string;
  alt?: string;
  durationSec?: number;
  className?: string;
  vertical?: boolean;
  sizes?: string;
}) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-md bg-[#E9EDF3]", vertical ? "aspect-[9/16]" : "aspect-video", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} unoptimized={src.startsWith("blob:") || src.startsWith("data:")} className="object-cover" />
      {durationSec !== undefined && durationSec > 0 && (
        <span className="absolute bottom-1 right-1 rounded bg-[#0F1B3D]/80 px-1 text-[10px] font-semibold leading-4 text-white">{fmtDuration(durationSec)}</span>
      )}
    </span>
  );
}

const AVATAR_TINTS = ["bg-[#EFF4FF] text-[#1D4ED8]", "bg-[#FEF1F2] text-[#C81E2B]", "bg-[#FFF7E8] text-[#B54708]", "bg-[#ECFAF3] text-[#067647]", "bg-[#F4F0FF] text-[#6D28D9]", "bg-[#ECFAFD] text-[#0E7490]"];

export function Avatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const tint = AVATAR_TINTS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TINTS.length];
  if (src) {
    return (
      <span className={cn("relative block size-8 shrink-0 overflow-hidden rounded-full bg-[#E9EDF3]", className)}>
        <Image src={src} alt="" fill sizes="40px" className="object-cover" />
      </span>
    );
  }
  return <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold", tint, className)} aria-hidden="true">{initials}</span>;
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block animate-pulse rounded-md bg-[#EDF1F6]", className)} />;
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
      <span className="grid size-11 place-items-center rounded-xl bg-[#F3F5F9] text-[#6B7890] ring-1 ring-[#E4E9F0]">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-3 text-[14px] font-semibold text-[#0F1B3D]">{title}</h3>
      <p className="mt-1 max-w-[360px] text-[12.5px] leading-5 text-[#6B7890]">{description}</p>
      {(action || secondary) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}

const NOTICE_TONES = {
  red: { box: "border-[#FBD5D9] bg-[#FEF6F7]", icon: "text-[#C81E2B]", Icon: ShieldAlert },
  amber: { box: "border-[#FBE3B6] bg-[#FFFAF0]", icon: "text-[#B54708]", Icon: AlertTriangle },
  blue: { box: "border-[#D5E1FD] bg-[#F5F8FF]", icon: "text-[#1D4ED8]", Icon: Info },
  violet: { box: "border-[#E2D8FD] bg-[#F9F7FF]", icon: "text-[#6D28D9]", Icon: Sparkles },
  neutral: { box: "border-[#E4E9F0] bg-[#F8FAFC]", icon: "text-[#475467]", Icon: Info },
};

export function Notice({
  tone = "blue",
  title,
  children,
  actions,
  icon,
  className,
}: {
  tone?: keyof typeof NOTICE_TONES;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) {
  const t = NOTICE_TONES[tone];
  const Icon = icon ?? t.Icon;
  return (
    <div role={tone === "red" ? "alert" : "status"} className={cn("flex flex-wrap items-start gap-3 rounded-[10px] border px-3.5 py-3", t.box, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", t.icon)} />
      <div className="min-w-[200px] flex-1">
        <p className="text-[13px] font-semibold text-[#0F1B3D]">{title}</p>
        {children && <div className="mt-0.5 text-[12.5px] leading-5 text-[#3C4A66]">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Meter({ value, tone = "red", className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <span className={cn("block h-1.5 overflow-hidden rounded-full bg-[#EEF1F5]", className)} role="presentation">
      <span className={cn("block h-full rounded-full transition-[width] duration-500", TONE_DOT[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}

export function DefinitionRow({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] py-2 last:border-0">
      <dt className="shrink-0 text-[12px] text-[#6B7890]">{label}</dt>
      <dd className={cn("min-w-0 break-words text-right text-[12.5px] font-medium text-[#0F1B3D]", mono && "font-mono text-[12px]")}>{children}</dd>
    </div>
  );
}

export function copyText(text: string, label = "Copied to clipboard") {
  void navigator.clipboard
    ?.writeText(text)
    .then(() => toast.success(label))
    .catch(() => toast.error("Couldn't copy", { description: "Select the text and copy it manually." }));
}

export function SecretField({ label, value, masked = true }: { label: string; value: string; masked?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const shown = !masked || revealed ? value : `${value.slice(0, 4)}${"•".repeat(Math.max(8, value.length - 4))}`;
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold text-[#24324F]">{label}</p>
      <div className="flex items-center gap-1.5">
        <code className="flex h-9 min-w-0 flex-1 items-center truncate rounded-lg border border-[#DCE2EA] bg-[#F8FAFC] px-3 font-mono text-[12.5px] text-[#0F1B3D]">{shown}</code>
        {masked && (
          <Button size="icon" variant="secondary" aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`} onClick={() => setRevealed((r) => !r)} className="size-9">
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        )}
        <Button size="icon" variant="secondary" aria-label={`Copy ${label}`} onClick={() => copyText(value, `${label} copied`)} className="size-9">
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
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
  affected?: string[];
  confirmLabel: string;
  onConfirm: () => Promise<boolean | void> | boolean | void;
  destructive?: boolean;
  confirmText?: string;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  return props.open ? <ConfirmDialogBody {...props} /> : null;
}

function ConfirmDialogBody({
  open,
  onOpenChange,
  title,
  description,
  affected,
  confirmLabel,
  onConfirm,
  destructive = true,
  confirmText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** What exactly will change — shown as a list so nothing is a surprise. */
  affected?: string[];
  confirmLabel: string;
  onConfirm: () => Promise<boolean | void> | boolean | void;
  destructive?: boolean;
  /** Type-to-confirm for irreversible, high-impact actions. */
  confirmText?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const blocked = confirmText ? typed.trim() !== confirmText : false;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[440px] gap-0 p-0">
        <DialogHeader className="px-5 pt-5">
          <div className="flex items-start gap-3">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", destructive ? "bg-[#FEF1F2] text-[#C81E2B]" : "bg-[#EFF4FF] text-[#1D4ED8]")}>
              {destructive ? <AlertTriangle className="size-4.5" /> : <Info className="size-4.5" />}
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-[15px] leading-5 text-[#0F1B3D]">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-[12.5px] leading-5 text-[#3C4A66]">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {(affected?.length || confirmText) && (
          <div className="space-y-3 px-5 pt-3">
            {affected && affected.length > 0 && (
              <ul className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-[#EEF1F5] bg-[#F8FAFC] p-2.5 text-[12px] text-[#24324F]">
                {affected.map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#98A2B3]" />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {confirmText && (
              <FormField label={<span>Type <b className="font-mono">{confirmText}</b> to confirm</span>}>
                <input className={yt.input} value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
              </FormField>
            )}
          </div>
        )}
        <DialogFooter className="mt-4 border-t border-[#EEF1F5] px-5 py-3">
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
      <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1 rounded hover:text-[#0F1B3D]", active && "text-[#0F1B3D]", align === "right" && "flex-row-reverse", yt.focus)}>
        {label}
        {active ? <ChevronDown className={cn("size-3", dir === "asc" && "rotate-180")} /> : <ChevronsUpDown className="size-3 opacity-50" />}
      </button>
    </th>
  );
}

export const thClass = "sticky top-0 z-[1] whitespace-nowrap border-b border-[#E4E9F0] bg-[#F8FAFC] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]";
export const tdClass = "whitespace-nowrap border-b border-[#EEF1F5] px-3 py-2 align-middle text-[12.5px] text-[#3C4A66]";

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
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[12px] text-[#6B7890]">
      <span>
        Showing <b className="font-semibold text-[#0F1B3D]">{from}–{to}</b> of <b className="font-semibold text-[#0F1B3D]">{total}</b> {noun}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button size="iconSm" variant="secondary" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft className="size-3.5" />
          </Button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPage(p)}
              className={cn("h-7 min-w-7 rounded-md px-1.5 text-[12px] font-semibold", p === page ? "bg-[#0F1B3D] text-white" : "text-[#3C4A66] hover:bg-[#F1F4F8]", yt.focus)}
            >
              {p}
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

export function TrendDelta({ value, invert, className }: { value: number | null; invert?: boolean; className?: string }) {
  if (value === null || !Number.isFinite(value)) return <span className={cn("text-[11.5px] text-[#98A2B3]", className)}>No comparison</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11.5px] font-semibold tabular-nums", good ? "text-[#067647]" : "text-[#C81E2B]", className)}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      {Math.abs(value).toFixed(1)}%
      <span className="sr-only">{up ? "increase" : "decrease"}</span>
    </span>
  );
}
