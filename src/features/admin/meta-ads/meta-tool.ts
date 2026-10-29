/** Operations not implemented here open Meta's real editor; they never pretend to save. */
export function openMetaTool(section: "campaigns" | "adsets" | "ads" | "audiences" | "adcreatives" | "leadgen", accountId?: string | null): void {
  const url = new URL(`https://adsmanager.facebook.com/adsmanager/manage/${section}`);
  if (accountId && /^act_\d+$/.test(accountId)) url.searchParams.set("act", accountId.slice(4));
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}
