import { redirect } from "next/navigation";
import { acceptInvitationTarget } from "./legacy-invitation-redirect";

/**
 * Legacy owner-invite URL. Emails sent before the backend rebuilt its link
 * builder contain `/invitations/accept?token=…` (that string is the API path),
 * which matches no page — the invitee lands on a 404 with a live token in hand.
 */
export default async function LegacyInvitationAcceptRedirect({
  searchParams,
}: {
  searchParams: Promise<import("./legacy-invitation-redirect").LegacySearchParams>;
}) {
  redirect(acceptInvitationTarget(await searchParams));
}
