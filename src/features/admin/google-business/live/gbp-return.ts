/**
 * Google sends the browser back to `/admin/integrations` (one fixed callback page for every provider). When the connection was started from the Google Business
 * page, a flag set just before leaving lets the callback page send the user straight back here instead of leaving them on Integrations.
 */
const KEY = "omni.gbp.return";

export function markGbpReturn(): void {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    /* storage blocked: the user simply stays on Integrations */
  }
}

/** True once, and only if this browser tab started the connection from the Google Business page. */
export function consumeGbpReturn(): boolean {
  try {
    const flagged = window.sessionStorage.getItem(KEY) === "1";
    if (flagged) window.sessionStorage.removeItem(KEY);
    return flagged;
  } catch {
    return false;
  }
}
