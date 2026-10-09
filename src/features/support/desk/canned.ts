/** Ready-made replies for the desk. `{name}` is replaced with the customer's first name when inserted. */
export interface CannedReply {
  id: string;
  title: string;
  category: string;
  body: string;
}

export const CANNED_REPLIES: CannedReply[] = [
  { id: "ack", title: "We are looking into it", category: "General", body: "Hi {name},\n\nThanks for raising this. I am looking into it now and will come back to you as soon as I know more.\n\nRegards,\nOmniPlatform Support" },
  { id: "info", title: "Need more details", category: "General", body: "Hi {name},\n\nTo get to the bottom of this I need a little more information:\n\n1. What exactly were you doing when it happened?\n2. Which Client and which page?\n3. The exact error message, if you saw one.\n\nA link to a screenshot also helps a lot.\n\nRegards,\nOmniPlatform Support" },
  { id: "reconnect", title: "Reconnect the integration", category: "Integrations", body: "Hi {name},\n\nThis looks like an expired or revoked login. Please open the channel's page, choose Reconnect and keep every permission ticked in the dialog that opens. If it still fails afterwards, reply here and I will check the connection on our side.\n\nRegards,\nOmniPlatform Support" },
  { id: "meta-page", title: "Meta: no Page access", category: "Integrations", body: "Hi {name},\n\nMeta only lists Pages that the connected Facebook profile has a role on. Please give that profile access to the Page in Meta Business Settings, then open Meta > Settings, choose Reconnect and tick the Page and its Instagram account in Meta's dialog.\n\nRegards,\nOmniPlatform Support" },
  { id: "publishing", title: "Publishing failed: next steps", category: "Publishing", body: "Hi {name},\n\nThe post failed because the channel refused it. Please check that the connection is healthy and the media meets the channel's limits, then reschedule it. If the post says its outcome is unknown, check the channel before publishing again as it may already be live.\n\nRegards,\nOmniPlatform Support" },
  { id: "billing", title: "Billing: invoice question", category: "Billing", body: "Hi {name},\n\nThanks for flagging the invoice. I have checked it against your plan and usage. Could you tell me the invoice number and what looks wrong to you? Then I can correct it quickly.\n\nRegards,\nOmniPlatform Support" },
  { id: "fixed", title: "Fixed: please confirm", category: "Closing", body: "Hi {name},\n\nWe have fixed this on our side. Please try again and let us know if anything is still wrong. If it works for you, you do not need to do anything; the ticket closes once you confirm or after a few days.\n\nRegards,\nOmniPlatform Support" },
  { id: "feature", title: "Feature request logged", category: "Closing", body: "Hi {name},\n\nThank you for the suggestion. I have logged it for our product team. I cannot promise a date, but requests like yours are what we look at when planning. I am closing this ticket; raise a new one anytime.\n\nRegards,\nOmniPlatform Support" },
];

export function fillCanned(reply: CannedReply, customerName: string): string {
  const first = customerName.trim().split(/\s+/)[0] || "there";
  return reply.body.replaceAll("{name}", first);
}
