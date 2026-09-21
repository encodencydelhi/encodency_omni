/**
 * EnCodency OmniPlatform - Financial Money Utilities
 * Safe integer minor unit arithmetic, ISO currency formatters and multi-currency guards.
 */

export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/**
 * Returns symbol for given ISO currency code.
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency;
}

/**
 * Formats integer minor units (paise/cents) into human-readable currency.
 * e.g., 125000 in INR -> "₹1,250.00"
 */
export function formatMoney(
  amountMinor: number,
  currency = "INR",
  options: { compact?: boolean; hideDecimalsIfZero?: boolean } = {},
): string {
  const isNegative = amountMinor < 0;
  const absMinor = Math.abs(amountMinor);
  const majorValue = absMinor / 100;

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: options.hideDecimalsIfZero && absMinor % 100 === 0 ? 0 : 2,
    minimumFractionDigits: options.compact || (options.hideDecimalsIfZero && absMinor % 100 === 0) ? 0 : 2,
  });

  const formatted = formatter.format(majorValue);
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Converts user input string (e.g. "1,250.50" or "500") to integer minor units (125050 or 50000).
 */
export function parseAmountToMinor(input: string): number {
  if (!input) return 0;
  const clean = input.replace(/[^0-9.-]/g, "");
  const val = parseFloat(clean);
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}

/**
 * Converts integer minor units to user-editable string (e.g. 125050 -> "1250.50").
 */
export function minorToInputValue(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

/**
 * Multi-currency guard: throws if currencies do not match.
 */
export function assertSameCurrency(currencyA: string, currencyB: string, context = "Financial operation"): void {
  if (currencyA.toUpperCase() !== currencyB.toUpperCase()) {
    throw new Error(`${context} cannot mix currencies ${currencyA} and ${currencyB} without conversion.`);
  }
}

/**
 * Safe integer additions / subtractions
 */
export function addMinor(...amounts: number[]): number {
  return amounts.reduce((acc, curr) => Math.round(acc + curr), 0);
}

export function subMinor(base: number, ...deductions: number[]): number {
  return deductions.reduce((acc, curr) => Math.round(acc - curr), base);
}

export function calculateTaxMinor(amountMinor: number, taxRatePercent: number): number {
  return Math.round((amountMinor * taxRatePercent) / 100);
}
