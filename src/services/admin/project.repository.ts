import { adminProjectRecords } from "@/mocks/admin/projects.mock";
import type { AdminProjectRecord } from "@/types/admin";

export interface ProjectRepository {
  list(signal?: AbortSignal): Promise<AdminProjectRecord[]>;
  getById(id: string, signal?: AbortSignal): Promise<AdminProjectRecord | null>;
}

async function mockDelay(signal?: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const timeout = globalThis.setTimeout(resolve, 220);
    signal?.addEventListener("abort", () => { globalThis.clearTimeout(timeout); reject(new DOMException("Request aborted", "AbortError")); }, { once: true });
  });
}

export const mockProjectRepository: ProjectRepository = {
  async list(signal) { await mockDelay(signal); return adminProjectRecords; },
  async getById(id, signal) { await mockDelay(signal); return adminProjectRecords.find((project: AdminProjectRecord) => project.id === id) ?? null; },
};
