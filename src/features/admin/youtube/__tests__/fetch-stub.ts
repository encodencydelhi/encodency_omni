/**
 * `fetch` stub shared by the YouTube tests: records every request and answers with queued responses.
 * Nothing leaves the process; no Google or backend call is ever made.
 */
export interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export function installFetchStub() {
  const calls: Call[] = [];
  const responses: Array<{ status: number; body: unknown }> = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit & { headers: Record<string, string> }) => {
    calls.push({
      url,
      method: init.method ?? "GET",
      headers: init.headers,
      body: typeof init.body === "string" ? JSON.parse(init.body) : init.body ?? null,
    });
    const next = responses.shift() ?? { status: 200, body: {} };
    return new Response(next.status === 204 ? null : JSON.stringify(next.body), { status: next.status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return {
    calls,
    respond: (status: number, body: unknown) => void responses.push({ status, body }),
    reset: () => {
      calls.length = 0;
      responses.length = 0;
    },
    restore: () => {
      globalThis.fetch = real;
    },
  };
}

export const SCOPE = { companyId: "11111111-1111-4111-8111-111111111111", clientId: "22222222-2222-4222-8222-222222222222" };
