import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { websiteKeys } from "./repository";

test("switching clients keeps website targets and analysis caches separate", async () => {
  const cache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  try {
    const clients = [
      { id: "a", domain: "mokshasewa.org" },
      { id: "b", domain: "other.example" },
    ];
    const keyFactories = [websiteKeys.target, websiteKeys.seo, websiteKeys.scans,
      (id: string) => websiteKeys.analytics(id, "28d"),
      (id: string) => websiteKeys.pageAudit(id, "home")];
    for (const key of keyFactories) {
      for (const client of clients) {
        await cache.fetchQuery({ queryKey: key(client.id), queryFn: async () => ({ domain: client.domain }) });
      }
      for (const id of ["a", "b", "a"]) {
        assert.deepEqual(cache.getQueryData(key(id)), { domain: clients.find(c => c.id === id)!.domain });
      }
      await cache.invalidateQueries({ queryKey: websiteKeys.client("a"), refetchType: "none" });
      assert.equal(cache.getQueryState(key("b"))?.isInvalidated, false);
    }
  } finally {
    cache.clear();
  }
});
