import { mockProjectRepository } from "./project.repository";

export const Clientservice = {
  getClients: (signal?: AbortSignal) => mockProjectRepository.list(signal),
  getProject: (id: string, signal?: AbortSignal) => mockProjectRepository.getById(id, signal),
};
