import type { AdminSupportTicket, AdminSupportEscalation, AdminSupportActivity } from "./types";

export const TERMINAL_TICKETS = new Set(["Resolved", "Closed"]);

export function getActiveTickets(tickets: AdminSupportTicket[]) {
  return tickets.filter((ticket) => !TERMINAL_TICKETS.has(ticket.status));
}

export function getTicketsByStatus(tickets: AdminSupportTicket[], status: string) {
  return tickets.filter((ticket) => ticket.status === status);
}

export function getUnassignedTickets(tickets: AdminSupportTicket[]) {
  return tickets.filter((ticket) => !ticket.assignedStaffId && !ticket.assignedTeamId && !TERMINAL_TICKETS.has(ticket.status));
}

export function getAwaitingCustomerTickets(tickets: AdminSupportTicket[]) {
  return tickets.filter((ticket) => ticket.status === "Waiting for Customer");
}

export function getSlaRisks(tickets: AdminSupportTicket[]) {
  return tickets.filter((ticket) => ticket.sla?.state === "At Risk" || ticket.sla?.state === "Breached");
}

export function getEscalatedTickets(tickets: AdminSupportTicket[]) {
  return tickets.filter((ticket) => Boolean(ticket.escalation && ticket.escalation.state !== "Resolved" && ticket.escalation.state !== "Cancelled"));
}

export function getTeamWorkload(tickets: AdminSupportTicket[]) {
  const workload = new Map<string, { name: string; active: number; urgent: number; slaRisk: number; waitingCustomer: number }>();

  for (const ticket of tickets) {
    const staffName = ticket.ownerName ?? "Unassigned";
    if (!workload.has(staffName)) {
      workload.set(staffName, { name: staffName, active: 0, urgent: 0, slaRisk: 0, waitingCustomer: 0 });
    }
    const entry = workload.get(staffName)!;
    if (!TERMINAL_TICKETS.has(ticket.status)) entry.active += 1;
    if (ticket.priority === "Urgent") entry.urgent += 1;
    if (ticket.sla?.state === "At Risk" || ticket.sla?.state === "Breached") entry.slaRisk += 1;
    if (ticket.status === "Waiting for Customer") entry.waitingCustomer += 1;
  }

  return [...workload.values()].sort((a, b) => b.active - a.active);
}

export function getCategoryDistribution(tickets: AdminSupportTicket[]) {
  const data = new Map<string, number>();
  for (const ticket of tickets) {
    data.set(ticket.category, (data.get(ticket.category) ?? 0) + 1);
  }

  return [...data.entries()].map(([category, count]) => ({ category, count }));
}

export function getPriorityDistribution(tickets: AdminSupportTicket[]) {
  const data = new Map<string, number>();
  for (const ticket of tickets) {
    data.set(ticket.priority, (data.get(ticket.priority) ?? 0) + 1);
  }
  return [...data.entries()].map(([priority, count]) => ({ priority, count }));
}

export function getActivitySummary(activity: AdminSupportActivity[]) {
  return activity.slice(0, 6);
}

export function getEscalationDirectory(tickets: AdminSupportTicket[], escalations: AdminSupportEscalation[]) {
  return escalations
    .map((item) => {
      const ticket = tickets.find((entry) => entry.id === item.ticketId);
      return { ...item, ticketTitle: ticket?.subject ?? "Unknown ticket", ticketStatus: ticket?.status ?? "Open" };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
