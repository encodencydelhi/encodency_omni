export interface CrmPage<T> { items: T[]; page: { hasMore: boolean; nextCursor: string | null } }

/** Existing array consumers can traverse bounded pages without silently losing records after number 500. */
export async function collectCrmPages<T>(load: (cursor?: string) => Promise<CrmPage<T>>, maxPages = 50): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  for (let index = 0; index < maxPages; index++) {
    const result = await load(cursor);
    if (!Array.isArray(result.items) || typeof result.page?.hasMore !== 'boolean') throw new Error('The CRM returned an invalid page.');
    items.push(...result.items);
    if (!result.page.hasMore) return items;
    const next = result.page.nextCursor;
    if (!next || seen.has(next)) throw new Error('The CRM returned an invalid or repeated page cursor.');
    seen.add(next);
    cursor = next;
  }
  throw new Error('This CRM list exceeds the safe loading limit. Use paginated CRM access to view all records.');
}
