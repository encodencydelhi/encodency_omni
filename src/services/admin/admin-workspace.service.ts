import { calendarContent, campaigns, moduleRecords } from "@/mocks/admin/admin-workspace.mock";

const wait = (signal?: AbortSignal) => new Promise<void>((resolve, reject) => { const timer = setTimeout(resolve, 180); signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true }); });
export const adminWorkspaceService = {
  async getCalendar(signal?: AbortSignal) { await wait(signal); return calendarContent; },
  async getCampaigns(signal?: AbortSignal) { await wait(signal); return campaigns; },
  async getCampaign(id: string, signal?: AbortSignal) { await wait(signal); return campaigns.find((item) => item.id === id) ?? null; },
  async getModule(key: string, signal?: AbortSignal) { await wait(signal); return moduleRecords[key] ?? []; },
};
