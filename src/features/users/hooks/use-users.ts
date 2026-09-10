"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query/keys";
import { ApiError } from "@/types/api";
import type { UserStatus } from "@/types/domain/user";
import { userService, type UserListParams } from "../services/user-service";

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: ({ signal }) => userService.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useChangeUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      userService.changeStatus(id, status),
    onSuccess: (user) => {
      // Company detail pages embed the same user records.
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      toast.success(
        user.status === "suspended" ? `${user.name} has been suspended` : `${user.name} is active again`,
      );
    },
    onError: (error) => {
      toast.error(
        ApiError.isApiError(error) ? error.message : "The status change could not be applied.",
      );
    },
  });
}
