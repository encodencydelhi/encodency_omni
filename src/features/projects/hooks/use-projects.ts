"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { Clientservice, type ProjectListParams } from "../services/project-service";

export function useClients(params: ProjectListParams) {
  return useQuery({
    queryKey: queryKeys.Clients.list(params),
    queryFn: ({ signal }) => Clientservice.list(params, signal),
    placeholderData: keepPreviousData,
  });
}
