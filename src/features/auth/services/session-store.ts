/**
 * Where the session token lives on the client.
 *
 * A cookie is used rather than localStorage so that middleware can guard
 * routes before a page renders. When the real backend arrives it will set an
 * httpOnly cookie itself and `persist`/`clear` become no-ops — the rest of the
 * auth layer does not change.
 */

export const SESSION_COOKIE = "omni_session";

export const sessionStore = {
  read(): string | null {
    // The backend uses an HttpOnly cookie (omni_session) which is inaccessible via JS.
    // Auth state is verified by calling the backend API (e.g., /auth/me).
    return null;
  },

  persist(token: string, { remember }: { remember: boolean }): void {
    // No-op: The backend handles setting the HttpOnly cookie.
  },

  clear(): void {
    // No-op: The backend's /auth/logout endpoint clears the cookie.
  },
};
