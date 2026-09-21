export const REDACTED = "[REDACTED]";

const SECRET_PATTERN = /(password|passwd|secret|token|api[_ -]?key|private[_ -]?key|credential|recovery[_ -]?code|totp|otp[_ -]?seed|signing[_ -]?secret|session[_ -]?id|card[_ -]?(number|details)|cvv|authorization|bearer)/i;

export function isSecretField(name: string): boolean {
  return SECRET_PATTERN.test(name);
}

const SECRET_VALUE = /(sk_(live|test)_[A-Za-z0-9]+|xox[abp]-[A-Za-z0-9-]+|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|Bearer\s+[A-Za-z0-9._-]{12,}|\b\d{15,19}\b)/;

export function looksLikeSecret(value: string): boolean {
  return SECRET_VALUE.test(value);
}

export function safeValue(field: string, value: string | null): { text: string | null; redacted: boolean } {
  if (value === null) return { text: null, redacted: false };
  if (isSecretField(field) || looksLikeSecret(value)) return { text: REDACTED, redacted: true };
  return { text: value, redacted: false };
}

export function scrubText(text: string): string {
  return text.replace(new RegExp(SECRET_VALUE.source, "g"), REDACTED);
}
