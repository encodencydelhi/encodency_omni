"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLinkCandidatesQuery } from "../data/hooks";
import { describeYouTubeError } from "../live/youtube-errors";
import { useYouTube } from "../store/youtube-store";
import { Button, ChoiceCard, EmptyState, Notice, Skeleton } from "./ui";

/* ------------------------------------------------------------------ */
/* Link a channel to this client                                       */
/* ------------------------------------------------------------------ */

type LinkChannelProps = { open: boolean; onOpenChange: (open: boolean) => void };

/**
 * Maps one of the Company connection's YouTube channels to this Client
 * (`POST /integrations/:id/map`). Until that mapping exists the whole module is
 * read-only, which is the `CONNECTED_NOT_MAPPED` state.
 */
export function LinkChannelDialog(props: LinkChannelProps) {
  return props.open ? <LinkChannelBody {...props} /> : null;
}

function LinkChannelBody({ open, onOpenChange }: LinkChannelProps) {
  const { linkChannel, startConsent, can } = useYouTube();
  const candidates = useLinkCandidatesQuery(open);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const data = candidates.data;
  const channels = data?.channels ?? [];
  const choice = selected ?? channels[0]?.id ?? null;

  const submit = async () => {
    if (busy || !choice || !data?.integrationId) return;
    setBusy(true);
    const ok = await linkChannel(data.integrationId, choice);
    setBusy(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[520px] gap-0 p-0">
        <DialogHeader className="border-b border-[#EEF1F5] px-5 py-4">
          <DialogTitle className="text-[15px] text-[#0F1B3D]">Link a Channel to This Client</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#6B7890]">
            {data?.accountName
              ? `Channels reachable from ${data.accountName}. Everything in this module then reads and writes to the channel you pick.`
              : "Pick which YouTube channel on the connected Google account this client manages."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[52vh] overflow-y-auto px-5 py-4">
          {candidates.isPending ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading Channels">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : candidates.error ? (
            <Notice tone="red" title="Couldn&apos;t Load Channels">
              {describeYouTubeError(candidates.error).message}
              <span className="mt-2 block">
                <Button size="sm" variant="secondary" onClick={() => void candidates.refetch()}>
                  Try again
                </Button>
              </span>
            </Notice>
          ) : !data?.integrationId ? (
            <EmptyState
              compact
              icon={Link2}
              title="No Google Account Connected Yet"
              description="Connect a Google account that owns the channel first, then come back to link it."
              action={
                <Button size="sm" variant="primary" gate={can.canManageConnection} onClick={() => void startConsent()}>
                  Connect YouTube
                </Button>
              }
            />
          ) : channels.length === 0 ? (
            <EmptyState
              compact
              icon={Link2}
              title="No Channels On This Account"
              description="The connected Google account doesn't own a YouTube channel, or the permission to read it wasn't granted. Reconnect with a different account if the channel belongs elsewhere."
              action={
                <Button size="sm" variant="secondary" gate={can.canManageConnection} onClick={() => void startConsent()}>
                  Reconnect
                </Button>
              }
            />
          ) : (
            <div className="space-y-2" role="radiogroup" aria-label="Channels">
              {channels.map((item) => (
                <ChoiceCard
                  key={item.id}
                  name="yt-link-channel"
                  checked={choice === item.id}
                  onSelect={() => setSelected(item.id)}
                  icon={Link2}
                  title={item.name}
                  description={<span className="font-mono text-[11.5px]">{item.id}</span>}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#EEF1F5] px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            gate={can.canManageConnection}
            disabled={!choice || !data?.integrationId}
            disabledReason="Choose a channel first"
            onClick={() => void submit()}
          >
            Link channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
