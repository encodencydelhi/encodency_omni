"use client";

/**
 * Design system for the X workspace.
 *
 * Deliberately the same surface language as the rest of OmniPlatform — light
 * greys, navy type, restrained shadows — with blue as the single interactive
 * accent. X's black is used only for the brand mark and "open on X" links, so
 * the module reads as part of the product rather than a skin of X.
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
  BadgeCheck,
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
  Info,
  Loader2,
  Lock,
  Search,
  ShieldAlert,
  Sparkles,
  X as XIcon,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  APPROVAL_LABEL,
  MENTION_STATUS_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
} from "../lib/constants";
import { tokenize } from "../lib/format";
import type {
  ApprovalState,
  Capability,
  MentionStatus,
  PostStatus,
  PostType,
  Priority,
  VerifiedKind,
} from "../x-data/types";

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

export const x = {
  card: "rounded-[10px] border border-[#E4E9F0] bg-white shadow-[0_1px_2px_rgba(15,27,61,0.04)]",
  title: "text-[#0F1B3D]",
  body: "text-[#3C4A66]",
  muted: "text-[#6B7890]",
  faint: "text-[#98A2B3]",
  divider: "border-[#EEF1F5]",
  input:
    "h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] text-[#0F1B3D] placeholder:text-[#98A2B3] outline-none transition focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/12 disabled:cursor-not-allowed disabled:bg-[#F6F8FB] disabled:text-[#98A2B3]",
  textarea:
    "w-full rounded-sm border border-[#DCE2EA] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#0F1B3D] placeholder:text-[#98A2B3] outline-none transition focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/12",
  focus: "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2563EB]/25",
};

/** The X brand mark. Used for the module icon and "open on X" affordances only. */
export function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-full", className)}>
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

const VARIANTS = {
  primary: "bg-[#2563EB] text-white shadow-[0_1px_2px_rgba(37,99,235,0.3)] hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:bg-[#9DBAF5]",
  secondary:
    "border border-[#DCE2EA] bg-white text-[#24324F] shadow-[0_1px_2px_rgba(15,27,61,0.04)] hover:border-[#C9D1DC] hover:bg-[#F7F9FC] active:bg-[#F1F4F8]",
  ghost: "text-[#3C4A66] hover:bg-[#F1F4F8] hover:text-[#0F1B3D] active:bg-[#E9EDF3]",
  danger: "border border-[#F5C2C7] bg-white text-[#C81E2B] hover:bg-[#FEF1F2]",
  dangerSolid: "bg-[#C81E2B] text-white hover:bg-[#A91824]",
  /** Reserved for actions that leave OmniPlatform for X itself. */
  dark: "bg-[#0F1419] text-white hover:bg-[#272C30]",
  link: "px-0 text-[#2563EB] hover:text-[#1D4ED8] hover:underline",
} as const;

const SIZES = {
  xs: "h-7 gap-1 rounded-sm px-2 text-[11.5px]",
  sm: "h-8 gap-1.5 rounded-sm px-2.5 text-[12px]",
  md: "h-9 gap-1.5 rounded-sm px-3.5 text-[12.5px]",
  lg: "h-10 gap-2 rounded-sm px-4 text-[13px]",
  icon: "size-8 rounded-sm",
  iconSm: "size-7 rounded-sm",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

type ButtonProps = Omit<ComponentProps<"button">, "children"> & {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  icon?: ComponentType<{ className?: string }>;
  iconRight?: ComponentType<{ className?: string }>;
  loading?: boolean;
  /** When the capability is denied the button disables itself and explains why. */
  gate?: Capability;
  /** Tooltip for a disabled state that no capability covers. */
  disabledReason?: string;
  href?: string;
  external?: boolean;
  children?: ReactNode;
};

export function buttonClass(variant: ButtonVariant = "secondary", size: keyof typeof SIZES = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    x.focus,
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
      {loading ? (
        <Loader2 className={cn(iconSize, "animate-spin")} />
      ) : blocked ? (
        <Lock className={cn(iconSize, "opacity-70")} />
      ) : Icon ? (
        <Icon className={iconSize} />
      ) : null}
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
        {/* The wrapper keeps the reason reachable by keyboard even though the button is disabled. */}
        <span tabIndex={0} className={cn("inline-flex rounded-sm", x.focus)} aria-label={reason}>
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
      <TooltipContent side={side} className="max-w-[280px] text-[12px] leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function InfoTip({ text, className, label = "More information" }: { text: ReactNode; className?: string; label?: string }) {
  return (
    <Hint text={text}>
      <button type="button" aria-label={label} className={cn("inline-grid size-4 place-items-center rounded-sm text-[#98A2B3] hover:text-[#3C4A66]", x.focus, className)}>
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
    <section className={cn(x.card, "min-w-0", className)} {...props}>
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
    <header className={cn("flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 pb-2.5 pt-3.5", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && (
          <span className="mt-px grid size-7 shrink-0 place-items-center rounded-sm bg-[#F3F5F9] text-[#3C4A66]">
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
    <Link href={href} className={cn("inline-flex items-center gap-0.5 rounded text-[12px] font-semibold text-[#2563EB] hover:text-[#1D4ED8]", x.focus)}>
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
        {description && <p className="mt-0.5 text-[12.5px] leading-5 text-[#6B7890]">{description}</p>}
        {meta}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export type Tone = "neutral" | "red" | "green" | "amber" | "blue" | "violet" | "cyan" | "pink";

const TONES: Record<Tone, string> = {
  neutral: "bg-[#F1F4F8] text-[#475467] ring-[#E4E9F0]",
  red: "bg-[#FEF1F2] text-[#C81E2B] ring-[#FBD5D9]",
  green: "bg-[#ECFAF3] text-[#067647] ring-[#C6EFD9]",
  amber: "bg-[#FFF7E8] text-[#B54708] ring-[#FBE3B6]",
  blue: "bg-[#EFF4FF] text-[#1D4ED8] ring-[#D5E1FD]",
  violet: "bg-[#F4F0FF] text-[#6D28D9] ring-[#E2D8FD]",
  cyan: "bg-[#ECFAFD] text-[#0E7490] ring-[#C7EEF6]",
  pink: "bg-[#FDF2F8] text-[#BE185D] ring-[#FBCFE8]",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-[#98A2B3]",
  red: "bg-[#E11D48]",
  green: "bg-[#12B76A]",
  amber: "bg-[#F79009]",
  blue: "bg-[#2563EB]",
  violet: "bg-[#7C3AED]",
  cyan: "bg-[#06AED4]",
  pink: "bg-[#DB2777]",
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
    <span className={cn("inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-sm px-1.5 text-[11px] font-semibold ring-1 ring-inset", TONES[tone], className)}>
      {dot && <span className={cn("size-1.5 rounded-sm", TONE_DOT[tone])} />}
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}

const STATUS_META: Record<PostStatus, { tone: Tone; icon: ComponentType<{ className?: string }> }> = {
  published: { tone: "green", icon: CheckCircle2 },
  scheduled: { tone: "blue", icon: Clock3 },
  draft: { tone: "neutral", icon: CircleDashed },
  publishing: { tone: "amber", icon: Loader2 },
  failed: { tone: "red", icon: XCircle },
  archived: { tone: "neutral", icon: CircleDashed },
};

export function StatusBadge({ status }: { status: PostStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} icon={meta.icon} className={status === "publishing" ? "[&_svg]:animate-spin" : undefined}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const TYPE_TONE: Record<PostType, Tone> = {
  text: "neutral",
  image: "blue",
  video: "violet",
  thread: "cyan",
  poll: "pink",
  link: "amber",
};

export function TypeBadge({ type }: { type: PostType }) {
  return <Badge tone={TYPE_TONE[type]}>{TYPE_LABEL[type]}</Badge>;
}

const APPROVAL_TONE: Record<ApprovalState, Tone> = {
  none: "neutral",
  pending: "amber",
  approved: "green",
  changes_requested: "amber",
  rejected: "red",
};

export function ApprovalBadge({ state, hideNone = true }: { state: ApprovalState; hideNone?: boolean }) {
  if (state === "none" && hideNone) return null;
  return (
    <Badge tone={APPROVAL_TONE[state]} dot>
      {APPROVAL_LABEL[state]}
    </Badge>
  );
}

const PRIORITY_TONE: Record<Priority, Tone> = { urgent: "red", high: "amber", normal: "neutral", low: "neutral" };

export function PriorityBadge({ priority }: { priority: Priority }) {
  // Urgent and high get a dot as well as colour, so the signal survives for
  // anyone who cannot distinguish the hues.
  return (
    <Badge tone={PRIORITY_TONE[priority]} dot={priority === "urgent" || priority === "high"}>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

const MENTION_TONE: Record<MentionStatus, Tone> = {
  unanswered: "amber",
  replied: "blue",
  resolved: "green",
  ignored: "neutral",
};

export function MentionStatusBadge({ status }: { status: MentionStatus }) {
  return <Badge tone={MENTION_TONE[status]}>{MENTION_STATUS_LABEL[status]}</Badge>;
}

const VERIFIED_LABEL: Record<Exclude<VerifiedKind, "none">, string> = {
  blue: "Verified account",
  business: "Verified business account",
  government: "Verified government account",
};

const VERIFIED_COLOR: Record<Exclude<VerifiedKind, "none">, string> = {
  blue: "text-[#1D9BF0]",
  business: "text-[#E2B719]",
  government: "text-[#829AAB]",
};

export function VerifiedMark({ kind, className }: { kind: VerifiedKind; className?: string }) {
  if (kind === "none") return null;
  return (
    <Hint text={VERIFIED_LABEL[kind]}>
      <span className={cn("inline-flex shrink-0", className)}>
        <BadgeCheck className={cn("size-4", VERIFIED_COLOR[kind])} aria-label={VERIFIED_LABEL[kind]} />
      </span>
    </Hint>
  );
}

/**
 * Marks data and features OmniPlatform owns, so an internal workflow is never
 * mistaken for something X provides.
 */
export function InternalBadge({ label = "OmniPlatform", hint }: { label?: string; hint?: string }) {
  const badge = (
    <span className="inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-sm bg-[#F4F0FF] px-1.5 text-[10.5px] font-semibold text-[#6D28D9] ring-1 ring-inset ring-[#E2D8FD]">
      <Sparkles className="size-3" />
      {label}
    </span>
  );
  return hint ? <Hint text={hint}>{badge}</Hint> : badge;
}

/** The counterpart: data that comes straight from X. */
export function SourceBadge({ hint = "Reported by X. Values update on each sync." }: { hint?: string }) {
  return (
    <Hint text={hint}>
      <span className="inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-sm bg-[#F1F4F8] px-1.5 text-[10.5px] font-semibold text-[#475467] ring-1 ring-inset ring-[#E4E9F0]">
        <XLogo className="size-2.5" />
        From X
      </span>
    </Hint>
  );
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
  /** Draws the count in red — used for failures and overdue work. */
  alert?: boolean;
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
          "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 font-semibold transition-colors",
          size === "sm" ? "px-2 pb-2 pt-1 text-[12px]" : "px-2.5 pb-2.5 pt-1.5 text-[12.5px]",
          active ? "border-[#2563EB] text-[#0F1B3D]" : "border-transparent text-[#6B7890] hover:border-[#D0D7E2] hover:text-[#0F1B3D]",
          x.focus,
        );
        const inner = (
          <>
            {item.icon && <item.icon className={cn("size-3.5", active ? "text-[#2563EB]" : "text-[#98A2B3]")} />}
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "rounded-sm px-1.5 text-[10.5px] font-semibold leading-4 tabular-nums",
                  item.alert && item.count > 0
                    ? "bg-[#FEF1F2] text-[#C81E2B]"
                    : active
                      ? "bg-[#EFF4FF] text-[#1D4ED8]"
                      : "bg-[#F1F4F8] text-[#6B7890]",
                )}
              >
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

/** Roving-focus arrow-key navigation for tab lists and segmented controls. */
function onArrowKey<T extends string>(
  event: React.KeyboardEvent<HTMLElement>,
  items: { value: T; href?: string }[],
  value: T,
  onChange?: (value: T) => void,
) {
  if (!onChange || items.some((i) => i.href)) return;
  if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const index = items.findIndex((item) => item.value === value);
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
  const next = items[nextIndex];
  if (!next) return;
  onChange(next.value);
  event.currentTarget.querySelector<HTMLElement>(`[data-value="${CSS.escape(next.value)}"]`)?.focus();
}

export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
  size = "md",
}: {
  items: { value: T; label: ReactNode; icon?: ComponentType<{ className?: string }>; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={(event) => onArrowKey(event, items, value, onChange)}
      className={cn("inline-flex items-center rounded-sm bg-[#F1F4F8] p-0.5", size === "sm" ? "h-7" : "h-8", className)}
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
              "flex items-center gap-1.5 rounded-sm font-semibold transition",
              size === "sm" ? "h-6 px-2 text-[11.5px]" : "h-7 px-2.5 text-[12px]",
              active ? "bg-white text-[#0F1B3D] shadow-[0_1px_2px_rgba(15,27,61,0.1)]" : "text-[#6B7890] hover:text-[#0F1B3D]",
              x.focus,
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
/* Menus                                                               */
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
  /** Rendered before the value, e.g. "Status:" — keeps filter bars self-describing. */
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
          "group inline-flex items-center gap-1.5 rounded-sm border border-[#DCE2EA] bg-white text-left font-medium text-[#24324F] shadow-[0_1px_2px_rgba(15,27,61,0.04)] transition hover:border-[#C9D1DC] data-[state=open]:border-[#2563EB] data-[state=open]:ring-[3px] data-[state=open]:ring-[#2563EB]/12 disabled:cursor-not-allowed disabled:opacity-60",
          size === "sm" ? "h-8 px-2.5 text-[12px]" : "h-9 px-3 text-[13px]",
          fullWidth && "w-full",
          x.focus,
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
          className="z-50 max-h-[min(360px,var(--radix-dropdown-menu-content-available-height))] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-sm border border-[#E4E9F0] bg-white p-1 shadow-[0_12px_32px_-8px_rgba(15,27,61,0.18)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownPrimitive.RadioGroup value={value} onValueChange={(next) => onChange(next as T)}>
            {options.map((option) => (
              <DropdownPrimitive.RadioItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex cursor-pointer select-none items-start gap-2 rounded-sm py-1.5 pl-7 pr-2.5 text-[12.5px] text-[#24324F] outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-[#F3F5F9] data-[state=checked]:font-semibold data-[state=checked]:text-[#0F1B3D]"
              >
                <DropdownPrimitive.ItemIndicator className="absolute left-2 top-2">
                  <Check className="size-3.5 text-[#2563EB]" />
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

/** Every item is a link, a handler, or disabled with a stated reason — never inert. */
export interface MenuItem {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  href?: string;
  external?: boolean;
  onSelect?: () => void;
  danger?: boolean;
  gate?: Capability;
  hidden?: boolean;
  disabledReason?: string;
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
          className="z-50 rounded-sm border border-[#E4E9F0] bg-white p-1 shadow-[0_12px_32px_-8px_rgba(15,27,61,0.18)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {visible.map((item, index) => {
            if (item === "separator") {
              const previous = visible[index - 1];
              // Never render a leading, trailing or doubled separator.
              if (index === 0 || previous === "separator" || index === visible.length - 1) return null;
              return <DropdownPrimitive.Separator key={`sep-${index}`} className="-mx-1 my-1 h-px bg-[#EEF1F5]" />;
            }
            const blocked = (item.gate && !item.gate.allowed) || Boolean(item.disabledReason);
            const reason = item.gate && !item.gate.allowed ? item.gate.reason : item.disabledReason;
            const Icon = blocked ? Lock : item.icon;
            const cls = cn(
              "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-[12.5px] font-medium outline-none data-[highlighted]:bg-[#F3F5F9] data-[disabled]:cursor-not-allowed",
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
                  <span className="pl-[22px] text-[10.5px] leading-tight text-[#98A2B3]">{reason}</span>
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(x.input, "h-8 pl-8 pr-8 text-[12.5px] [&::-webkit-search-cancel-button]:hidden")}
      />
      <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
        {loading ? (
          <Loader2 className="mr-1 size-3.5 animate-spin text-[#98A2B3]" aria-label="Searching" />
        ) : value ? (
          <button type="button" onClick={() => onChange("")} aria-label="Clear search" className={cn("grid size-5 place-items-center rounded text-[#98A2B3] hover:bg-[#F1F4F8] hover:text-[#3C4A66]", x.focus)}>
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </span>
    </div>
  );
}

/** Debounces a value; `pending` is true while the debounced copy lags behind. */
export function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
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
          {required && (
            <span className="text-[#C81E2B]" aria-hidden="true">
              *
            </span>
          )}
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
        <p role="alert" className="mt-1 flex items-start gap-1 text-[11.5px] font-medium text-[#C81E2B]">
          <AlertTriangle className="mt-px size-3 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11.5px] leading-4 text-[#6B7890]">{hint}</p>
      ) : null}
    </div>
  );
}

export function TagInput({
  value,
  onChange,
  placeholder = "Add a tag and press Enter",
  id,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
    const next = [...value];
    parts.forEach((part) => {
      if (!next.some((tag) => tag.toLowerCase() === part.toLowerCase())) next.push(part);
    });
    onChange(next);
    setDraft("");
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-sm border border-[#DCE2EA] bg-white px-2 py-1.5 focus-within:border-[#2563EB] focus-within:ring-[3px] focus-within:ring-[#2563EB]/12">
      {value.map((tag) => (
        <span key={tag} className="inline-flex h-6 items-center gap-1 rounded-sm bg-[#F1F4F8] pl-2 pr-1 text-[12px] font-medium text-[#24324F]">
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(value.filter((item) => item !== tag))}
            className="grid size-4 place-items-center rounded text-[#6B7890] hover:bg-[#E4E9F0]"
          >
            <XIcon className="size-3" />
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
        "flex cursor-pointer items-start gap-3 rounded-sm border p-3 transition",
        checked ? "border-[#2563EB] bg-[#F5F8FF] ring-[3px] ring-[#2563EB]/10" : "border-[#DCE2EA] bg-white hover:border-[#C9D1DC]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input id={id} type="radio" name={name} checked={checked} disabled={disabled} onChange={onSelect} className="peer sr-only" />
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm border-2 peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#2563EB]/25", checked ? "border-[#2563EB]" : "border-[#C9D1DC]")}>
        {checked && <span className="size-1.5 rounded-sm bg-[#2563EB]" />}
      </span>
      {Icon && <Icon className="mt-px size-4 shrink-0 text-[#6B7890]" />}
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-[#0F1B3D]">{title}</span>
        {description && <span className="mt-0.5 block text-[12px] leading-4 text-[#6B7890]">{description}</span>}
      </span>
    </label>
  );
}

/** Label + description + control, the row shape used throughout Settings. */
export function SettingRow({
  title,
  description,
  control,
  badge,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  control: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-[#EEF1F5] py-3 last:border-0", className)}>
      <div className="min-w-[220px] flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-[#24324F]">
          {title}
          {badge}
        </p>
        {description && <p className="mt-0.5 text-[11.5px] leading-4 text-[#6B7890]">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{control}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* People & media                                                      */
/* ------------------------------------------------------------------ */

const AVATAR_TINTS = [
  "bg-[#EFF4FF] text-[#1D4ED8]",
  "bg-[#FDF2F8] text-[#BE185D]",
  "bg-[#FFF7E8] text-[#B54708]",
  "bg-[#ECFAF3] text-[#067647]",
  "bg-[#F4F0FF] text-[#6D28D9]",
  "bg-[#ECFAFD] text-[#0E7490]",
];

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const initials = name
    .replace("@", "")
    .split(/[\s_]/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  // Deterministic tint from the name, so the same person is the same colour everywhere.
  const tint = AVATAR_TINTS[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TINTS.length];

  if (src) {
    return (
      <span className={cn("relative block size-8 shrink-0 overflow-hidden rounded-full bg-[#E9EDF3]", className)}>
        <Image src={src} alt="" fill sizes="48px" className="object-cover" />
      </span>
    );
  }
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold", tint, className)} aria-hidden="true">
      {initials}
    </span>
  );
}

export function MediaThumb({
  src,
  alt = "",
  className,
  sizes = "120px",
  badge,
}: {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
  badge?: ReactNode;
}) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-sm bg-[#E9EDF3] ring-1 ring-inset ring-[#E4E9F0]", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} unoptimized={src.startsWith("blob:") || src.startsWith("data:")} className="object-cover" />
      {badge && <span className="absolute bottom-1 right-1">{badge}</span>}
    </span>
  );
}

/** Post text with hashtags, handles and links picked out — read-only, never a link out. */
export function PostText({ text, className, clamp }: { text: string; className?: string; clamp?: number }) {
  if (!text.trim()) return <span className={cn("text-[12.5px] italic text-[#98A2B3]", className)}>No text yet</span>;
  return (
    <span
      className={cn("whitespace-pre-wrap break-words text-[13px] leading-[1.55] text-[#24324F]", className)}
      style={clamp ? { display: "-webkit-box", WebkitLineClamp: clamp, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
    >
      {tokenize(text).map((token, index) =>
        token.kind === "text" ? (
          token.value
        ) : (
          <span key={index} className="text-[#2563EB]">
            {token.value}
          </span>
        ),
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block animate-pulse rounded-sm bg-[#EDF1F6]", className)} />;
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
      <span className="grid size-11 place-items-center rounded-sm bg-[#F3F5F9] text-[#6B7890] ring-1 ring-[#E4E9F0]">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-3 text-[14px] font-semibold text-[#0F1B3D]">{title}</h3>
      <p className="mt-1 max-w-[380px] text-[12.5px] leading-5 text-[#6B7890]">{description}</p>
      {(action || secondary) && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}{secondary}</div>}
    </div>
  );
}

const NOTICE_TONES = {
  red: { box: "border-[#FBD5D9] bg-[#FEF6F7]", icon: "text-[#C81E2B]", Icon: ShieldAlert },
  amber: { box: "border-[#FBE3B6] bg-[#FFFAF0]", icon: "text-[#B54708]", Icon: AlertTriangle },
  blue: { box: "border-[#D5E1FD] bg-[#F5F8FF]", icon: "text-[#1D4ED8]", Icon: Info },
  violet: { box: "border-[#E2D8FD] bg-[#F9F7FF]", icon: "text-[#6D28D9]", Icon: Sparkles },
  green: { box: "border-[#C6EFD9] bg-[#F4FCF8]", icon: "text-[#067647]", Icon: CheckCircle2 },
  neutral: { box: "border-[#E4E9F0] bg-[#F8FAFC]", icon: "text-[#475467]", Icon: Info },
};

export function Notice({
  tone = "blue",
  title,
  children,
  actions,
  icon,
  className,
  badge,
}: {
  tone?: keyof typeof NOTICE_TONES;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  badge?: ReactNode;
}) {
  const meta = NOTICE_TONES[tone];
  const Icon = icon ?? meta.Icon;
  return (
    <div role={tone === "red" ? "alert" : "status"} className={cn("flex flex-wrap items-start gap-3 rounded-[10px] border px-3.5 py-3", meta.box, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", meta.icon)} />
      <div className="min-w-[200px] flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#0F1B3D]">
          {title}
          {badge}
        </p>
        {children && <div className="mt-0.5 text-[12.5px] leading-5 text-[#3C4A66]">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Meter({ value, tone = "blue", className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <span className={cn("block h-1.5 overflow-hidden rounded-sm bg-[#EEF1F5]", className)} role="presentation">
      <span className={cn("block h-full rounded-sm transition-[width] duration-500", TONE_DOT[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
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
        <code className="flex h-9 min-w-0 flex-1 items-center truncate rounded-sm border border-[#DCE2EA] bg-[#F8FAFC] px-3 font-mono text-[12.5px] text-[#0F1B3D]">{shown}</code>
        {masked && (
          <Button size="icon" variant="secondary" aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`} onClick={() => setRevealed((value) => !value)} className="size-9">
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

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** Exactly what will change, listed so nothing is a surprise. */
  affected?: string[];
  confirmLabel: string;
  onConfirm: () => Promise<boolean | void> | boolean | void;
  destructive?: boolean;
  /** Type-to-confirm, for the irreversible ones. */
  confirmText?: string;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  // Mounting only while open keeps the typed-confirmation state fresh per use.
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
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const blocked = confirmText ? typed.trim() !== confirmText : false;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[450px] gap-0 p-0">
        <DialogHeader className="px-5 pt-5">
          <div className="flex items-start gap-3">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-sm", destructive ? "bg-[#FEF1F2] text-[#C81E2B]" : "bg-[#EFF4FF] text-[#1D4ED8]")}>
              {destructive ? <AlertTriangle className="size-[18px]" /> : <Info className="size-[18px]" />}
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
              <ul className="max-h-36 space-y-1 overflow-y-auto rounded-sm border border-[#EEF1F5] bg-[#F8FAFC] p-2.5 text-[12px] text-[#24324F]">
                {affected.map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="mt-1.5 size-1 shrink-0 rounded-sm bg-[#98A2B3]" />
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
                <input className={x.input} value={typed} onChange={(event) => setTyped(event.target.value)} autoFocus />
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
              // `false` means the action failed and the dialog should stay put.
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
  "sticky top-0 z-[1] whitespace-nowrap border-b border-[#E4E9F0] bg-[#F8FAFC] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]";
export const tdClass = "border-b border-[#EEF1F5] px-3 py-2.5 align-middle text-[12.5px] text-[#3C4A66]";
/** Numbers are right-aligned and tabular so columns compare at a glance. */
export const numClass = "text-right tabular-nums";

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
      <button
        type="button"
        onClick={onClick}
        className={cn("inline-flex items-center gap-1 rounded hover:text-[#0F1B3D]", active && "text-[#0F1B3D]", align === "right" && "flex-row-reverse", x.focus)}
      >
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
  // Long lists collapse to a window around the current page.
  const pages =
    pageCount <= 7
      ? Array.from({ length: pageCount }, (_, i) => i + 1)
      : [...new Set([1, page - 1, page, page + 1, pageCount].filter((p) => p >= 1 && p <= pageCount))].sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[12px] text-[#6B7890]">
      <span>
        Showing{" "}
        <b className="font-semibold text-[#0F1B3D]">
          {from}–{to}
        </b>{" "}
        of <b className="font-semibold text-[#0F1B3D]">{total}</b> {noun}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button size="iconSm" variant="secondary" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft className="size-3.5" />
          </Button>
          {pages.map((p, index) => (
            <span key={p} className="flex items-center gap-1">
              {index > 0 && p - (pages[index - 1] ?? 0) > 1 && <span className="px-0.5 text-[#C9D1DC]">…</span>}
              <button
                type="button"
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
                onClick={() => onPage(p)}
                className={cn("h-7 min-w-7 rounded-sm px-1.5 text-[12px] font-semibold tabular-nums", p === page ? "bg-[#0F1B3D] text-white" : "text-[#3C4A66] hover:bg-[#F1F4F8]", x.focus)}
              >
                {p}
              </button>
            </span>
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
