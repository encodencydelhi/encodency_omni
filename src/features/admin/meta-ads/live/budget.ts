/** View models and write payloads use minor units; input fields use account currency. */
export function budgetInput(minor: number | null | undefined): string {
  return minor == null ? "" : (minor / 100).toFixed(2);
}

export function budgetMinor(input: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(input.trim())) return null;
  const value = Math.round(Number(input) * 100);
  return Number.isSafeInteger(value) && value > 0 && value <= 2_147_483_647 ? value : null;
}
