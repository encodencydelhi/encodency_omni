"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { teamRepository } from "./repository";
import { Invitation, Member, MemberActivity, TeamGroup } from "./types";

interface TeamState {
  members: Member[];
  groups: TeamGroup[];
  invitations: Invitation[];
  activity: MemberActivity[];
  isLoading: boolean;
  error: Error | null;
}

interface TeamContextType extends TeamState {
  refresh: () => Promise<void>;
  inviteMember: (invite: Omit<Invitation, "id" | "status" | "sentAt">) => Promise<void>;
  suspendMember: (id: string) => Promise<void>;
  reactivateMember: (id: string) => Promise<void>;
  deactivateMember: (id: string) => Promise<void>;
  createGroup: (group: Omit<TeamGroup, "id" | "updatedAt" | "activeTasks" | "memberCount" | "clientCount">) => Promise<void>;
  updateMember: (id: string, patch: Partial<Member>) => Promise<void>;
  removeMember: (id: string, replacementId?: string) => Promise<void>;
  updateInvitation: (id: string, patch: Partial<Invitation>) => Promise<void>;
  deleteInvitation: (id: string) => Promise<void>;
  updateGroup: (id: string, patch: Partial<TeamGroup>) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TeamState>({
    members: [],
    groups: [],
    invitations: [],
    activity: [],
    isLoading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const [members, groups, invitations, activity] = await Promise.all([
        teamRepository.getMembers(),
        teamRepository.getGroups(),
        teamRepository.getInvitations(),
        teamRepository.getActivity(),
      ]);
      setState({ members, groups, invitations, activity, isLoading: false, error: null });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false, error: error as Error }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const inviteMember = useCallback(async (invite: Omit<Invitation, "id" | "status" | "sentAt">) => {
    await teamRepository.inviteMember(invite);
    await refresh();
  }, [refresh]);

  const suspendMember = useCallback(async (id: string) => {
    await teamRepository.suspendMember(id);
    await refresh();
  }, [refresh]);

  const reactivateMember = useCallback(async (id: string) => {
    await teamRepository.reactivateMember(id);
    await refresh();
  }, [refresh]);

  const deactivateMember = useCallback(async (id: string) => {
    await teamRepository.deactivateMember(id);
    await refresh();
  }, [refresh]);

  const createGroup = useCallback(async (group: Omit<TeamGroup, "id" | "updatedAt" | "activeTasks" | "memberCount" | "clientCount">) => {
    await teamRepository.createGroup(group);
    await refresh();
  }, [refresh]);

  const mutate = useCallback(async (operation: () => Promise<void>) => { await operation(); await refresh(); }, [refresh]);
  const updateMember = useCallback((id: string, patch: Partial<Member>) => mutate(() => teamRepository.updateMember(id, patch)), [mutate]);
  const removeMember = useCallback((id: string, replacementId?: string) => mutate(() => teamRepository.removeMember(id, replacementId)), [mutate]);
  const updateInvitation = useCallback((id: string, patch: Partial<Invitation>) => mutate(() => teamRepository.updateInvitation(id, patch)), [mutate]);
  const deleteInvitation = useCallback((id: string) => mutate(() => teamRepository.deleteInvitation(id)), [mutate]);
  const updateGroup = useCallback((id: string, patch: Partial<TeamGroup>) => mutate(() => teamRepository.updateGroup(id, patch)), [mutate]);

  return (
    <TeamContext.Provider
      value={{
        ...state,
        refresh,
        inviteMember,
        suspendMember,
        reactivateMember,
        deactivateMember,
        createGroup,
        updateMember,
        removeMember,
        updateInvitation,
        deleteInvitation,
        updateGroup,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
