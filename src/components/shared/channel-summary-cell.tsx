import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ChannelSummary } from "@/types/domain/company";

/**
 * Connected channel counts as three small pips.
 *
 * A table cell has no room for badges, but the split between healthy, degraded
 * and disconnected is exactly what an operator scans for.
 */
export function ChannelSummaryCell({ channels }: { channels: ChannelSummary }) {
  const total = channels.connected + channels.degraded + channels.disconnected;

  if (total === 0) {
    return <span className="text-2xs text-muted-foreground">None</span>;
  }

  const parts = [
    { label: "Healthy", count: channels.connected, dot: "bg-success", text: "text-foreground" },
    { label: "Degraded", count: channels.degraded, dot: "bg-warning", text: "text-warning" },
    { label: "Disconnected", count: channels.disconnected, dot: "bg-danger", text: "text-danger" },
  ].filter((part) => part.count > 0);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-2.5">
          {parts.map((part) => (
            <span key={part.label} className="inline-flex items-center gap-1">
              <span className={`size-1.5 rounded-full ${part.dot}`} aria-hidden />
              <span className={`text-2xs tabular ${part.text}`}>{part.count}</span>
            </span>
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {parts.map((part) => `${part.count} ${part.label.toLowerCase()}`).join(" · ")}
      </TooltipContent>
    </Tooltip>
  );
}
