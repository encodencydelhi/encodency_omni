"use client";

import { useQuery } from "@tanstack/react-query";
import { Clientservice } from "@/services/admin/project.service";

export function useClients() {
  return useQuery({ queryKey: ["admin", "Clients"], queryFn: ({ signal }) => Clientservice.getClients(signal) });
}

export function useProject(id: string) {
  return useQuery({ queryKey: ["admin", "Clients", id], queryFn: ({ signal }) => Clientservice.getProject(id, signal) });
}
