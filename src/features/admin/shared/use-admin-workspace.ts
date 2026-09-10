"use client";
import { useQuery } from "@tanstack/react-query";
import { adminWorkspaceService } from "@/services/admin/admin-workspace.service";
export const useCalendarContent = () => useQuery({ queryKey: ["admin", "calendar"], queryFn: ({ signal }) => adminWorkspaceService.getCalendar(signal) });
export const useCampaigns = () => useQuery({ queryKey: ["admin", "campaigns"], queryFn: ({ signal }) => adminWorkspaceService.getCampaigns(signal) });
export const useCampaign = (id: string) => useQuery({ queryKey: ["admin", "campaigns", id], queryFn: ({ signal }) => adminWorkspaceService.getCampaign(id, signal) });
export const useAdminModule = (key: string) => useQuery({ queryKey: ["admin", "module", key], queryFn: ({ signal }) => adminWorkspaceService.getModule(key, signal) });
