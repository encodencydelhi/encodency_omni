/**
 * Where the session token lives on the client.
 *
 * A cookie is used rather than localStorage so that middleware can guard
 * routes before a page renders. When the real backend arrives it will set an
 * httpOnly cookie itself and `persist`/`clear` become no-ops — the rest of the
 * auth layer does not change.
 */

export const SESSION_COOKIE = "enc_session";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export const sessionStore = {
  read(): string | null {
    if (typeof document === "undefined") return null;

    const match = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${SESSION_COOKIE}=`));

    return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null;
  },

  persist(token: string, { remember }: { remember: boolean }): void {
    if (typeof document === "undefined") return;

    const attributes = [
      `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
      "path=/",
      "SameSite=Lax",
      remember ? `max-age=${MAX_AGE_SECONDS}` : "",
      window.location.protocol === "https:" ? "Secure" : "",
    ].filter(Boolean);

    document.cookie = attributes.join("; ");
  },

  clear(): void {
    if (typeof document === "undefined") return;
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  },
};
