const LOCALE = "en-US";

const compactNumber = new Intl.NumberFormat(LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const plainNumber = new Intl.NumberFormat(LOCALE);

export function formatNumber(value: number): string {
  return plainNumber.format(value);
}

export function formatCompactNumber(value: number): string {
  return value < 1000 ? plainNumber.format(value) : compactNumber.format(value);
}

export function formatCurrency(
  amountInMinorUnits: number,
  currency = "INR",
  options: { compact?: boolean } = {},
): string {
  const amount = amountInMinorUnits / 100;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: options.compact ? 1 : 2,
    minimumFractionDigits: options.compact ? 0 : 2,
  }).format(amount);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatDelta(value: number, fractionDigits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const unit = BYTE_UNITS[exponent] ?? "B";
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${unit}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const RELATIVE_UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

const relativeTime = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const absolute = Math.abs(diff);

  if (absolute < 45_000) return "just now";

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (absolute >= ms) {
      return relativeTime.format(Math.round(diff / ms), unit);
    }
  }
  return relativeTime.format(Math.round(diff / 60_000), "minute");
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
