export type DataSource = "mock" | "api";

/** Public values must be explicit at build time; production may only preview by deliberate opt-in. */
export function resolveDataSource(raw: string | undefined, production: boolean, preview: boolean): DataSource {
  if (raw === "api") return "api";
  if (raw === "mock" && (!production || preview)) return "mock";
  if (!production && raw === undefined) return "mock";
  throw new Error("NEXT_PUBLIC_DATA_SOURCE must be api for production, or mock with NEXT_PUBLIC_ALLOW_MOCK_PREVIEW=true for an explicit preview build.");
}

export function resolveXMockMode(raw: string | undefined, production: boolean, preview: boolean): boolean {
  if (raw !== undefined && raw !== "true" && raw !== "false") throw new Error("NEXT_PUBLIC_X_MOCK_MODE must be true or false.");
  if (production) return preview && raw === "true";
  return raw !== "false";
}
