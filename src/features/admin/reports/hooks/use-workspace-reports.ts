"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { workspaceReportsService, type ReportFormat, type ScheduleInput } from "@/services/admin/workspace-reports.service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A report belongs to one client; `null` means no client is chosen yet. */
export function useWorkspaceReports(clientId: string | null | undefined) {
  const { companyId } = useTenancyContext();
  const client = clientId && UUID.test(clientId) ? clientId : null;
  const queryClient = useQueryClient();
  const key = (part: string) => ["admin", "workspace-reports", companyId, client, part] as const;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "workspace-reports", companyId, client] });
  const enabled = Boolean(companyId && client);

  const status = useQuery({ queryKey: key("status"), queryFn: ({ signal }) => workspaceReportsService.status(client!, signal), enabled, staleTime: 60_000 });
  const files = useQuery({ queryKey: key("files"), queryFn: ({ signal }) => workspaceReportsService.list(client!, signal), enabled, staleTime: 15_000 });
  const schedules = useQuery({ queryKey: key("schedules"), queryFn: ({ signal }) => workspaceReportsService.schedules(client!, signal), enabled, staleTime: 15_000 });

  const generate = useMutation({ mutationFn: (body: { format: ReportFormat; rangeDays: number }) => workspaceReportsService.generate(client!, body), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => workspaceReportsService.remove(client!, id), onSuccess: refresh });
  const createSchedule = useMutation({ mutationFn: (body: ScheduleInput) => workspaceReportsService.createSchedule(client!, body), onSuccess: refresh });
  const updateSchedule = useMutation({ mutationFn: (input: { id: string; body: ScheduleInput }) => workspaceReportsService.updateSchedule(client!, input.id, input.body), onSuccess: refresh });
  const deleteSchedule = useMutation({ mutationFn: (id: string) => workspaceReportsService.deleteSchedule(client!, id), onSuccess: refresh });
  const runSchedule = useMutation({ mutationFn: (id: string) => workspaceReportsService.runSchedule(client!, id), onSuccess: refresh });

  return { client, status, files, schedules, generate, remove, createSchedule, updateSchedule, deleteSchedule, runSchedule };
}
