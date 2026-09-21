import { useMemo } from "react";
import { useSupport } from "./mock-provider";
import { SupportTicket, TicketStatus } from "./types";

export function useTicketsByStatus(status: TicketStatus | "Active") {
  const { tickets } = useSupport();
  return useMemo(() => {
    if (status === "Active") {
      return tickets.filter(t => t.status !== "Resolved" && t.status !== "Closed");
    }
    return tickets.filter(t => t.status === status);
  }, [tickets, status]);
}

export function useUnassignedTickets() {
  const { tickets } = useSupport();
  return useMemo(() => {
    return tickets.filter(t => t.status !== "Resolved" && t.status !== "Closed" && !t.assignedStaffId && !t.assignedTeamId);
  }, [tickets]);
}

export function useSlaRisks() {
  const { tickets } = useSupport();
  return useMemo(() => {
    return tickets.filter(t => 
      t.status !== "Resolved" && 
      t.status !== "Closed" && 
      (t.slaInstance?.firstResponseState === "At Risk" || t.slaInstance?.firstResponseState === "Breached" ||
       t.slaInstance?.resolutionState === "At Risk" || t.slaInstance?.resolutionState === "Breached")
    );
  }, [tickets]);
}

export function useEscalatedTickets() {
  const { tickets } = useSupport();
  return useMemo(() => {
    return tickets.filter(t => t.escalationId);
  }, [tickets]);
}

export function useTeamWorkload() {
  const { tickets, teams } = useSupport();
  return useMemo(() => {
    return teams.map(team => {
      const teamTickets = tickets.filter(t => t.assignedTeamId === team.id && t.status !== "Resolved" && t.status !== "Closed");
      const unassigned = teamTickets.filter(t => !t.assignedStaffId).length;
      const highUrgent = teamTickets.filter(t => t.priority === "High" || t.priority === "Urgent").length;
      return { team, activeTickets: teamTickets.length, unassigned, highUrgent };
    });
  }, [tickets, teams]);
}

export function useTicketsByCompany(companyId: string) {
  const { tickets } = useSupport();
  return useMemo(() => tickets.filter(t => t.companyId === companyId), [tickets, companyId]);
}

export function useAwaitingSupport() {
  const { tickets } = useSupport();
  return useMemo(() => {
    return tickets.filter(t => 
      t.status !== "Resolved" && 
      t.status !== "Closed" && 
      t.assignedStaffId
    );
  }, [tickets]);
}

export function useAwaitingCustomer() {
  const { tickets } = useSupport();
  return useMemo(() => {
    return tickets.filter(t => t.status === "Waiting for Customer" || t.status === "Waiting for Internal Team");
  }, [tickets]);
}

export function useBreachedTickets() {
  const { tickets } = useSupport();
  return useMemo(() => {
    return tickets.filter(t => 
      t.slaInstance?.firstResponseState === "Breached" || t.slaInstance?.resolutionState === "Breached"
    );
  }, [tickets]);
}
