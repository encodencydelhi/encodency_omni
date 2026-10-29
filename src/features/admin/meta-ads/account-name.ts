/** Keep Meta's raw name intact; use a readable display title when it is only an ID. */
export function accountDisplayName(account: { id: string; name: string; displayName?: string }): string {
  if (account.displayName?.trim()) return account.displayName;
  const name = account.name?.trim();
  if (name && !/^(?:act_)?\d+$/.test(name)) return name;
  return `Ad Account · ${account.id.replace(/^act_/, "").slice(-4)}`;
}
