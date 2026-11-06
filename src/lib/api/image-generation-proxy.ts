interface ProxyOptions {
  backendOrigin: string;
  appBaseUrl?: string;
  production: boolean;
  fetchImpl?: typeof fetch;
}

/** Keep the caller's CSRF provenance; never manufacture a trusted Origin for forwarded cookies. */
export async function proxyImageGeneration(request: Request, options: ProxyOptions): Promise<Response> {
  let expectedOrigin: string;
  try {
    if (options.production && !options.appBaseUrl) throw new Error("APP_BASE_URL required");
    const configured = new URL(options.appBaseUrl || request.url);
    if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password) throw new Error("Invalid APP_BASE_URL");
    expectedOrigin = configured.origin;
  } catch {
    return Response.json({ message: "Image generation proxy is not configured." }, { status: 503 });
  }
  const originHeader = request.headers.get("origin");
  const source = originHeader ?? request.headers.get("referer");
  let sourceOrigin: string;
  try {
    if (!source) throw new Error("Missing source");
    const parsed = new URL(source);
    if (parsed.origin !== expectedOrigin || parsed.username || parsed.password || (originHeader !== null && source !== parsed.origin)) throw new Error("Untrusted source");
    sourceOrigin = parsed.origin;
  } catch {
    return Response.json({ message: "CSRF check failed" }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ message: "Invalid JSON body." }, { status: 400 }); }
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json", Origin: sourceOrigin };
  for (const key of ["cookie", "x-company-id", "x-client-id"]) {
    const value = request.headers.get(key);
    if (value) headers[key] = value;
  }
  try {
    const response = await (options.fetchImpl ?? fetch)(`${options.backendOrigin.replace(/\/$/, "")}/api/v1/ai/generate-image`, {
      method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(90_000), redirect: "error",
    });
    const payload: unknown = await response.json();
    return Response.json(payload, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "The image service could not be reached. Try again later." }, { status: 502 });
  }
}
