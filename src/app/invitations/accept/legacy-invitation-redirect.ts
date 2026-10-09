/** Query params of a legacy `/invitations/accept` hit; values arrive string | string[]. */
export type LegacySearchParams = Record<string, string | string[] | undefined>;

/**
 * Where a legacy owner-invite URL must land: the real accept screen, with every
 * scalar parameter preserved. Non-string values are dropped rather than
 * serialised into the URL.
 */
export function acceptInvitationTarget(searchParams: LegacySearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const search = params.toString();
  return search ? `/accept-invitation?${search}` : "/accept-invitation";
}
