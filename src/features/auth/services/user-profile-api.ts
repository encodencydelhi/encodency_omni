import { apiClient } from "@/lib/api/client";
import type { CurrentUserResponse } from "@/types/domain/auth";

export interface UpdateUserProfilePayload {
  name?: string;
  phone?: string | null;
}

export const userProfileApi = {
  /**
   * PATCH /api/v1/users/me — self-only account route.
   * Body: { name?: string, phone?: string | null }
   */
  updateMe(payload: UpdateUserProfilePayload): Promise<CurrentUserResponse> {
    return apiClient.request<CurrentUserResponse>({
      method: "PATCH",
      path: "/users/me",
      body: payload,
    });
  },
};
