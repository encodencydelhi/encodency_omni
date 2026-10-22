"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Building2, ExternalLink, Plus, Search } from "lucide-react";
import { ApiError } from "@/types/api";
import { fetchBusinessResearch, type BusinessResearch } from "../data/live-provider";
import { useCompetitorMutations } from "../data/hooks";
import { Card, Chip, WButton } from "./ui/kit";
import { SkeletonBlock } from "./ui/states";

/** Plain words for the setup problems a first run usually hits. */
function setupHint(code: string | undefined): string | null {
  if (code === "service_disabled") return "Enable “Knowledge Graph Search API” in Google Cloud Console → APIs & Services → Library.";
  if (code === "api_key_blocked") return "The API key is restricted. Allow Knowledge Graph Search API on the key under APIs & Services → Credentials.";
  if (code === "not_configured") return "Add GOOGLE_KNOWLEDGE_GRAPH_API_KEY (or PAGESPEED_API_KEY) to backend/.env.";
  return null;
}

/**
 * Competitor research: type any brand or company name and see what Google's Knowledge Graph knows about it
 * (type, description, Wikipedia summary, official website). Public data, read-only. Only well-known brands are in the
 * Knowledge Graph; local businesses are not. A result with a website can be tracked with the existing competitor analysis.
 */
export function BusinessLookup({ clientId }: { clientId: string }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<BusinessResearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const competitors = useCompetitorMutations(clientId);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    const q = input.trim();
    if (q.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await fetchBusinessResearch(clientId, q));
    } catch (err) {
      setResult(null);
      setError(ApiError.isApiError(err) ? err.message : "The lookup could not run.");
    } finally {
      setLoading(false);
    }
  };

  const track = (url: string) => {
    competitors.add.mutate(url, {
      onSuccess: () => toast.success("Added as a competitor and analysed", { description: url }),
      onError: (err) => toast.error(ApiError.isApiError(err) ? err.message : "Could not add the competitor"),
    });
  };

  const brands = result?.brands;
  const hint = brands?.status === "unavailable" ? setupHint(brands.failure?.code) : null;

  return (
    <Card
      title="Brand lookup"
      icon={Search}
      subtitle="Look up any brand or company in Google's Knowledge Graph: what it is, its description, Wikipedia and official website."
      bodyClassName="p-3 space-y-3"
    >
      <form onSubmit={search} className="flex flex-wrap gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={120}
          placeholder="Brand or company name, e.g. “Patanjali” or “Infosys”"
          className="h-9 min-w-[16rem] flex-1 rounded-md border border-[#DAE1EC] px-3 text-[12.5px] outline-none focus:border-[#2563EB]"
        />
        <WButton type="submit" tone="primary" icon={Search} disabled={loading || input.trim().length < 2} disabledReason="Type at least 2 characters">
          {loading ? "Searching…" : "Search"}
        </WButton>
      </form>

      {loading ? <SkeletonBlock lines={4} /> : null}
      {error ? <p className="text-[12px] font-semibold text-[#C0261F]">{error}</p> : null}

      {result && brands && !loading ? (
        <div className="space-y-2">
          {brands.status === "unavailable" ? (
            <div className="rounded-lg border border-[#F5DFB8] bg-[#FDF8EF] p-3 text-[12px] leading-5 text-[#7A4A06]">
              <p className="font-semibold">Brand lookup is not available right now.</p>
              <p>{brands.failure?.message ?? "Google did not answer."}</p>
              {hint ? <p className="mt-1 font-semibold">{hint}</p> : null}
            </div>
          ) : brands.items.length ? (
            brands.items.map((brand) => (
              <article key={brand.id || brand.name} className="flex gap-3 rounded-lg border border-[#E6EBF4] bg-white p-3">
                {brand.imageUrl ? <img src={brand.imageUrl} alt="" className="size-12 shrink-0 rounded-md object-contain" /> : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-[#111C3A]">{brand.name}</p>
                    {brand.types.slice(0, 3).map((type) => <Chip key={type}>{type}</Chip>)}
                  </div>
                  {brand.description ? <p className="mt-0.5 text-[12px] text-[#4B5872]">{brand.description}</p> : null}
                  {brand.summary ? <p className="mt-1 line-clamp-3 text-[11.5px] leading-5 text-[#64748B]">{brand.summary}</p> : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11.5px] font-semibold">
                    {brand.url ? <a href={brand.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1F5FBF] hover:underline">Website <ExternalLink className="size-3" /></a> : null}
                    {brand.wikipediaUrl ? <a href={brand.wikipediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1F5FBF] hover:underline">Wikipedia <ExternalLink className="size-3" /></a> : null}
                    {brand.url ? (
                      <WButton size="sm" icon={Plus} className="ml-auto" disabled={competitors.add.isPending} onClick={() => track(brand.url!)}>
                        Track as competitor
                      </WButton>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-[#E6EBF4] bg-[#F8FAFD] p-3 text-[12px] leading-5 text-[#4B5872]">
              <Building2 className="mt-0.5 size-4 shrink-0 text-[#94A3B8]" />
              <p>
                &ldquo;{result.query}&rdquo; is not a known brand in Google&apos;s Knowledge Graph. That is normal for local and smaller
                businesses. To track a competitor website anyway, add its domain in Competitor Intelligence below.
              </p>
            </div>
          )}
          <p className="text-[11px] text-[#94A3B8]">
            Public Google data · checked {new Date(result.checkedAt).toLocaleString()}{result.cached ? " (saved result, up to 12 hours old)" : ""}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
