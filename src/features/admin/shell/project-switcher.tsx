"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAdminContext } from "./admin-context";

export function Clientswitcher() {
  const { Clients, selectedProjectId, setSelectedProjectId } = useAdminContext();
  const selected = Clients.find((project) => project.id === selectedProjectId);
  const availableClients = Clients.filter((project) => project.id === "moksha-sewa");
  return <DropdownMenu><DropdownMenuTrigger asChild><button className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-[#D7DFEA] bg-white px-3 text-left shadow-sm hover:bg-[#F8FAFD] sm:min-w-[154px]">
    <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-[#17254A]">{selected?.name ?? "All Clients"}</span></span><ChevronsUpDown className="size-3.5 text-[#223462]" />
  </button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel>Project</DropdownMenuLabel>{availableClients.map((project) => <DropdownMenuItem key={project.id} onSelect={() => setSelectedProjectId(project.id)}><span className="size-2 rounded-full" style={{ backgroundColor: project.color }} />{project.name}{selectedProjectId === project.id && <Check className="ml-auto text-[#C9343B]" />}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}
