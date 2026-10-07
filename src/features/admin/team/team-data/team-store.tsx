"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { teamRepository } from "./repository";
import { TEAM_LIVE } from "./live-team";
import { Invitation, Member, MemberActivity, TeamGroup } from "./types";

interface TeamState {
  members: Member[];
  clients: Array<{ id: string; name: string }>;
  groups: TeamGroup[];
  invitations: Invitation[];
  activity: MemberActivity[];
  isLoading: boolean;
  error: Error | null;
  /** Parts of the page that could not be loaded while the rest still works (never hidden: the layout shows them with a retry). */
  warnings: string[];
}

interface TeamContextType extends TeamState {
  refresh: () => Promise<void>;
  inviteMember: (invite: Omit<Invitation, "id" | "status" | "sentAt">) => Promise<Invitation>;
  suspendMember: (id: string, reason?: string) => Promise<void>;
  reactivateMember: (id: string) => Promise<void>;
  deactivateMember: (id: string) => Promise<void>;
  createGroup: (group: Omit<TeamGroup, "id" | "updatedAt" | "activeTasks" | "memberCount" | "clientCount">) => Promise<void>;
  updateMember: (id: string, patch: Partial<Member>) => Promise<void>;
  removeMember: (id: string, replacementId?: string) => Promise<void>;
  updateInvitation: (id: string, patch: Partial<Invitation>) => Promise<void>;
  deleteInvitation: (id: string) => Promise<void>;
  updateGroup: (id: string, patch: Partial<TeamGroup>) => Promise<void>;
  /** Gives (`grant`) or removes the access of members to one Client. */
  setClientAccess: (clientId: string, membershipIds: string[], grant: boolean) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TeamState>({
    members: [],
    clients: [],
    groups: [],
    invitations: [],
    activity: [],
    isLoading: true,
    error: null,
    warnings: [],
  });

  // Only the first load shows the page skeleton. Later refreshes (after an action) update in place, so open dialogs and filters survive.
  const loadedOnce = useRef(false);

  const refresh = useCallback(async () => {
    try {
      if (!loadedOnce.current) setState((prev) => ({ ...prev, isLoading: true, error: null }));
      // The roster is essential; everything else degrades on its own, so one failing list never blanks the whole Team area.
      const [membersResult, groupsResult, invitationsResult, activityResult, clientsResult] = await Promise.allSettled([
        teamRepository.getMembers(),
        teamRepository.getGroups(),
        teamRepository.getInvitations(),
        teamRepository.getActivity(),
        teamRepository.getClients(),
      ]);
      if (membersResult.status === "rejected") throw membersResult.reason;
      const rawMembers = membersResult.value;
      const warnings: string[] = [];
      const take = <T,>(result: PromiseSettledResult<T>, label: string, fallback: T): T => {
        if (result.status === "fulfilled") return result.value;
        warnings.push(`${label} could not be loaded.`);
        return fallback;
      };
      const groups = take(groupsResult, "Groups", [] as TeamGroup[]);
      const invitations = take(invitationsResult, "Invitations", [] as Invitation[]);
      const activity = take(activityResult, "Activity", [] as MemberActivity[]);
      const clients = take(clientsResult, "Clients", [] as Array<{ id: string; name: string }>);
      // The backend stores membership in a group on the group; each member shows the groups that list them.
      const members = TEAM_LIVE
        ? rawMembers.map((member) => ({ ...member, groups: groups.filter((group) => !group.archived && group.memberIds?.includes(member.id)).map(({ id, name }) => ({ id, name })) }))
        : rawMembers;
      loadedOnce.current = true;
      setState({ members, clients, groups, invitations, activity, isLoading: false, error: null, warnings });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false, error: loadedOnce.current ? prev.error : (error as Error) }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const inviteMember = useCallback(async (invite: Omit<Invitation, "id" | "status" | "sentAt">) => {
    const created = await teamRepository.inviteMember(invite);
    await refresh();
    return created;
  }, [refresh]);

  const suspendMember = useCallback(async (id: string, reason?: string) => {
    await teamRepository.suspendMember(id, reason);
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
  const setClientAccess = useCallback((clientId: string, membershipIds: string[], grant: boolean) => mutate(() => teamRepository.setClientAccess(clientId, membershipIds, grant)), [mutate]);

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
        setClientAccess,
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
