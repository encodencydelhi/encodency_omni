"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck, ExternalLink, RefreshCw, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/types/api";
import { fetchBrandPresence, type BrandEntity, type BrandPresence } from "../data/live-provider";
import { Card, Chip, WButton } from "./ui/kit";
import { QueryErrorState, SkeletonBlock } from "./ui/states";

const brandKey = (clientId: string) => ["website", "brand-presence", clientId] as const;

/** What a business can do to become a known entity. Shown when Google does not know it yet. */
const NOT_FOUND_TIPS = [
  "Make sure the Google Business Profile has the website set, with the same name and address used everywhere else.",
  "Add Organization schema (name, logo, url, sameAs links to social profiles) to the website home page.",
  "Keep the business name identical on the website, social profiles and directories.",
  "Get mentioned on independent, trusted sites (news, associations, Wikidata where it is notable).",
];

function EntityBlock({ entity }: { entity: BrandEntity }) {
  return (
    <div className="flex gap-3 rounded-lg border border-[#E6EBF4] bg-[#FAFCFF] p-3">
      {entity.imageUrl ? <img src={entity.imageUrl} alt="" className="size-14 shrink-0 rounded-md object-contain" /> : null}
      <div className="min-w-0 space-y-1">
        <p className="text-[13px] font-semibold text-[#172044]">{entity.name}</p>
        {entity.description ? <p className="text-[11.5px] text-[#55637A]">{entity.description}</p> : null}
        {entity.types.length ? (
          <div className="flex flex-wrap gap-1">
            {entity.types.map((type) => <Chip key={type}>{type}</Chip>)}
          </div>
        ) : null}
        {entity.summary ? <p className="line-clamp-3 text-[11.5px] leading-5 text-[#55637A]">{entity.summary}</p> : null}
        <div className="flex flex-wrap gap-3 pt-0.5 text-[11px] font-semibold">
          {entity.url ? (
            <a href={entity.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1F5FBF] hover:underline">
              Website <ExternalLink className="size-3" />
            </a>
          ) : null}
          {entity.wikipediaUrl ? (
            <a href={entity.wikipediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1F5FBF] hover:underline">
              Wikipedia <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Body({ data }: { data: BrandPresence }) {
  if (data.status === "unavailable") {
    return (
      <p className="text-[12px] leading-5 text-[#9A5B08]">
        The check could not run: {data.failure?.message ?? "Google did not answer."}
      </p>
    );
  }
  if (data.status === "matched" && data.entity) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0B7A55]">
          <BadgeCheck className="size-4" /> Google knows this business as an entity, linked to {data.websiteHost}.
        </p>
        <EntityBlock entity={data.entity} />
        <p className="text-[11px] text-[#64748B]">This is what Google can use for a Knowledge Panel. Whether a panel shows for a given search is Google&apos;s choice.</p>
      </div>
    );
  }
  if (data.status === "possible" && data.entity) {
    return (
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-[#9A5B08]">
          Google knows an entity with this name, but it is not linked to {data.websiteHost ?? "the client's website"}. Check whether it is this business.
        </p>
        <EntityBlock entity={data.entity} />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[12px] font-semibold text-[#55637A]">
        &ldquo;{data.query}&rdquo; is not in Google&apos;s brand Knowledge Graph yet.
      </p>
      <p className="text-[11.5px] leading-5 text-[#55637A]">
        This is the brand panel big organisations get (with a Wikipedia summary, founders, logo). It is separate from the local
        Google Business panel with address, hours and reviews: a business can have that local panel and still not be here. Local
        business listings are not part of this check.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-[11.5px] leading-5 text-[#55637A]">
        {NOT_FOUND_TIPS.map((tip) => <li key={tip}>{tip}</li>)}
      </ul>
      {data.others.length ? (
        <p className="text-[11px] text-[#64748B]">Similar names Google does know: {data.others.slice(0, 3).map((e) => e.name).join(", ")}.</p>
      ) : null}
    </div>
  );
}

/** "Does Google know this business?", from the Knowledge Graph Search API. Read-only; nothing is changed on Google. */
export function BrandPresenceCard({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const query = useQuery({
    queryKey: brandKey(clientId),
    queryFn: () => fetchBrandPresence(clientId),
    enabled: Boolean(clientId),
    staleTime: 10 * 60_000,
  });

  const refresh = async () => {
    setRefreshing(true);
    try {
      queryClient.setQueryData(brandKey(clientId), await fetchBrandPresence(clientId, true));
    } catch (error) {
      toast.error(ApiError.isApiError(error) ? error.message : "The check could not run.");
    } finally {
      setRefreshing(false);
    }
  };

  const checked = query.data?.checkedAt ? new Date(query.data.checkedAt).toLocaleString() : null;

  return (
    <Card
      title="Brand in Google's Knowledge Graph"
      icon={ScanSearch}
      subtitle={checked ? `Checked ${checked} · name: ${query.data?.query ?? ""}` : "Is this business a known brand entity at Google (not the local Business panel)?"}
      action={
        <WButton size="sm" icon={RefreshCw} onClick={() => void refresh()} disabled={refreshing || query.isLoading} disabledReason="Checking…">
          {refreshing ? "Checking…" : "Check again"}
        </WButton>
      }
      bodyClassName="p-3"
    >
      {query.isLoading ? (
        <SkeletonBlock lines={3} />
      ) : query.error ? (
        <QueryErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : query.data ? (
        <Body data={query.data} />
      ) : null}
    </Card>
  );
}
