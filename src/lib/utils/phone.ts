export const PHONE_DIGITS = 10;
export const PHONE_ERROR = "Enter a valid 10-digit phone number (digits only).";
export function sanitizePhone(value: string | null | undefined): string {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length > PHONE_DIGITS && digits.startsWith("91") && digits.length <= 12) digits = digits.slice(2);
  else if (digits.length > PHONE_DIGITS && digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  return digits.slice(0, PHONE_DIGITS);
}
export function parsePhone(value: string | null | undefined): string | null {
  const compact = String(value ?? "").trim().replace(/[\s().-]/g, "");
  const match = /^(?:\+?91|0)?([1-9]\d{9})$/.exec(compact);
  return match ? match[1]! : null;
}

export function isValidPhoneNumber(value: string | null | undefined): boolean {
  return parsePhone(value) !== null;
}

export function isValidOptionalPhone(value: string | null | undefined): boolean {
  return String(value ?? "").trim() === "" || parsePhone(value) !== null;
}

export const phoneInputProps = {
  type: "tel",
  inputMode: "numeric",
  maxLength: 20,
  autoComplete: "tel-national",
} as const;
