import type { Campaign, NotificationChannel, NotificationRange, NotificationSnapshot } from "./types";

export function rangeMinutes(range: NotificationRange, customHours = 24) {
  return range === "today" ? 1440 : range === "7d" ? 10080 : range === "30d" ? 43200 : customHours * 60;
}

export function scopedIntents(snapshot: NotificationSnapshot, range: NotificationRange, companyScope: string, customHours = 24) {
  const floor = Date.parse(snapshot.generatedAt) - rangeMinutes(range, customHours) * 60_000;
  return snapshot.intents.filter((intent) => Date.parse(intent.createdAt) >= floor && (companyScope === "all" || intent.companyId === companyScope || (companyScope === "platform" && intent.companyId === null)));
}

export function kpis(snapshot: NotificationSnapshot, range: NotificationRange, companyScope: string, customHours = 24) {
  const intents = scopedIntents(snapshot, range, companyScope, customHours);
  const intentIds = new Set(intents.map((intent) => intent.id));
  const deliveries = snapshot.deliveries.filter((delivery) => intentIds.has(delivery.intentId));
  const activeCampaigns = snapshot.campaigns.filter((campaign) => ["scheduled", "in_progress", "pending_approval"].includes(campaign.state)).length;
  return {
    created: intents.length,
    unread: snapshot.receipts.filter((receipt) => receipt.state === "unread" && intentIds.has(receipt.intentId)).length,
    scheduled: intents.filter((intent) => intent.state === "scheduled").length,
    dispatchRequested: intents.filter((intent) => intent.state === "dispatch_requested").length,
    providerAccepted: deliveries.filter((delivery) => delivery.state === "provider_accepted").length,
    delivered: deliveries.filter((delivery) => delivery.state === "delivered").length,
    failed: deliveries.filter((delivery) => delivery.state === "failed" || delivery.state === "undeliverable").length,
    activeCampaigns,
  };
}

export function deliveryByChannel(snapshot: NotificationSnapshot) {
  const channels: NotificationChannel[] = ["in_app", "email", "whatsapp", "push"];
  return channels.map((channel) => {
    const rows = snapshot.deliveries.filter((delivery) => delivery.channel === channel);
    return {
      channel,
      eligible: rows.length,
      accepted: rows.filter((row) => row.state === "provider_accepted").length,
      delivered: rows.filter((row) => row.state === "delivered").length,
      failed: rows.filter((row) => row.state === "failed" || row.state === "undeliverable").length,
      unknown: rows.filter((row) => row.state === "unknown").length,
      lastActivity: rows.map((row) => row.lastActivityAt).sort().at(-1) ?? null,
    };
  });
}

export function campaignIntentCount(snapshot: NotificationSnapshot, campaign: Campaign) {
  return snapshot.intents.filter((intent) => intent.campaignId === campaign.id).length;
}
