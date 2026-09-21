import { relativeTime } from "@/features/companies/data/clock";
import { titleCase } from "@/features/global-settings/data/text";
import type { ActorSnapshot, AuditEvent, EventScope } from "../data/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const two = (value: number) => String(value).padStart(2, "0");

/** Every timestamp is shown in UTC and says so, so two people never read the same event as different times. */
export function utcShort(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())} UTC`;
}

export function utcFull(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())} UTC`;
}

/** Relative time in Title Case against the demo clock, e.g. "4 Days Ago". */
export const ago = (iso: string) => titleCase(relativeTime(iso));

export const plural = (count: number, singular: string, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`;

/** "Platform-Wide", "Company Name", or "Company Name > Client Name". */
export function scopeText(scope: EventScope): string {
  if (scope.level === "platform") return "Platform-Wide";
  if (scope.level === "client") return `${scope.companyName ?? "Company"} > ${scope.clientName ?? "Client"}`;
  return scope.companyName ?? "Company";
}

/** The name to show for an actor. A failed sign-in names the attempted account, never the account owner as the actor. */
export function actorText(actor: ActorSnapshot): string {
  return actor.displayName;
}

export function actorSubline(actor: ActorSnapshot, canSeeEmail: boolean): string {
  if (actor.type === "anonymous") return canSeeEmail && actor.attemptedIdentifier ? `Attempted: ${actor.attemptedIdentifier}` : "Attempted account hidden";
  if (actor.roleAtEvent) return actor.roleAtEvent;
  return actor.type === "staff" ? "Platform Staff" : actor.type === "company_user" ? "Company User" : actor.type === "system" ? "System Service" : "External Provider";
}

export const shortId = (id: string) => (id.length > 26 ? `${id.slice(0, 24)}...` : id);

export const sentence = (event: AuditEvent) => event.summary;
