"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import Image from "next/image";
import mokshaLogo from "@/assets/moksha-sewa-logo.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAdminContext } from "./admin-context";

export function Clientswitcher() {
  const { Clients, selectedProjectId, setSelectedProjectId } = useAdminContext();
  const selected = Clients.find((project) => project.id === selectedProjectId);
  const availableClients = Clients;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-[42px] w-full min-w-0 items-center gap-2.5 rounded-lg border border-[#1E293B] bg-gradient-to-b from-[#172136] to-[#0F172A] px-3 text-left shadow-[0_2px_10px_rgba(0,0,0,0.2)] hover:border-[#334155] hover:shadow-[0_2px_15px_rgba(59,130,246,0.15)] transition-all duration-200 group">
          <div
            className="flex size-6 shrink-0 items-center justify-center rounded-[6px] shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden"
            style={{ backgroundColor: selected?.id === "moksha-sewa" ? "transparent" : (selected?.color || "#3B82F6") }}
          >
            {selected?.id === "moksha-sewa" ? (
              <Image src={mokshaLogo} alt={selected.name} className="size-full object-cover" />
            ) : (
              <span className="text-[11px] font-bold text-white shadow-sm">
                {selected?.name ? selected.name.charAt(0).toUpperCase() : "A"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[#F8FAFC] group-hover:text-white transition-colors">
              {selected?.name ?? "All Clients"}
            </span>
          </div>
          <ChevronsUpDown className="size-[14px] text-[#64748B] group-hover:text-[#94A3B8] transition-colors" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[204px] rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Clients
        </DropdownMenuLabel>
        {availableClients.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onSelect={() => setSelectedProjectId(project.id)}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] font-medium text-slate-700 transition-colors focus:bg-slate-100 focus:text-slate-900"
          >
            <span
              className="size-2.5 shrink-0 rounded-full shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]"
              style={{ backgroundColor: project.color || "#3B82F6" }}
            />
            <span className="truncate flex-1">{project.name}</span>
            {selectedProjectId === project.id && (
              <Check className="ml-auto size-4 text-blue-600 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
