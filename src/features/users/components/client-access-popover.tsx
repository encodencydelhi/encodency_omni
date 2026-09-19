import { FolderIcon } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CompanyMembership } from "../data/types";

interface ClientAccessPopoverProps {
  memberships: CompanyMembership[];
  totalClients: number;
  className?: string;
}

export function ClientAccessPopover({
  memberships,
  totalClients,
}: ClientAccessPopoverProps) {
  const [open, setOpen] = useState(false);

  if (totalClients === 0) {
    return <span className="text-xs text-slate-400">0 clients</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-blue-600 hover:underline cursor-pointer"
        >
          <FolderIcon className="size-3 text-slate-400" />
          <span>
            {totalClients} {totalClients === 1 ? "Client" : "Clients"}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-76 p-3 shadow-lg border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 pb-2 border-b border-border mb-2.5 text-xs font-semibold text-slate-900">
          <FolderIcon className="size-3.5 text-blue-500" />
          <span>Client Access by Company ({totalClients})</span>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto pr-0.5">
          {memberships.map((m) => (
            <div key={m.id} className="text-xs">
              <div className="font-semibold text-slate-800 mb-1 flex items-center justify-between">
                <span className="truncate">{m.companyName}</span>
                <span className="text-xs text-slate-400 font-normal">
                  {m.clientAccess.scope === "all" ? "All clients" : "Selected"}
                </span>
              </div>

              {m.clientAccess.clients.length > 0 ? (
                <ul className="pl-2 space-y-0.5 border-l-2 border-slate-200 text-xs text-slate-600">
                  {m.clientAccess.clients.map((c) => (
                    <li key={c.id} className="truncate">
                      {c.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-slate-400 italic pl-2">
                  No individual clients assigned
                </span>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
