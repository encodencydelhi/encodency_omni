const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** Accepts "example.com" and "https://example.com"; requires a dotted host. */
export function isValidWebsite(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.includes(".") && !url.hostname.endsWith(".");
  } catch {
    return false;
  }
}

export function hostnameOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isValidPhone(value: string): boolean {
  return /^[+()\d\s-]{7,20}$/.test(value.trim());
}
