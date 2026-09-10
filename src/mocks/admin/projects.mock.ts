import { adminOrganization } from "./admin-dashboard.mock";
import type { AdminProjectRecord } from "@/types/admin";

export const adminProjectRecords: AdminProjectRecord[] = [
  {
    id: "moksha-sewa", organizationId: adminOrganization.id, name: "Moksha Sewa", website: "mokshasewa.org",
    status: "active", color: "#EF3340", logoText: "MS", description: "End-to-end outreach, volunteer and donation marketing for Moksha Sewa.",
    connectedChannels: ["Meta", "Instagram", "LinkedIn", "Google", "WhatsApp", "YouTube", "Website"],
    leads: 426, seoScore: 86, campaigns: 5, websiteVisits: 28420, socialReach: 174600,
    lastActivity: "12 minutes ago", createdAt: "15 Jan 2024", owner: "Ankit Verma",
  },
  {
    id: "ganga-explorer", organizationId: adminOrganization.id, name: "Ganga Explorer", website: "gangaexplorer.in",
    status: "active", color: "#69B842", logoText: "GE", description: "Tourism and travel marketing across the Ganga region.",
    connectedChannels: ["Facebook", "Instagram", "Google", "Website"],
    leads: 62, seoScore: 65, campaigns: 4, websiteVisits: 9860, socialReach: 51900,
    lastActivity: "5 hours ago", createdAt: "08 Mar 2024", owner: "Priya Sharma",
  },
  {
    id: "namo-gange-campaign", organizationId: adminOrganization.id, name: "Namo Gange Campaign", website: "namogange.org",
    status: "active", color: "#314B61", logoText: "NG", description: "Awareness and advocacy campaign for a clean Ganga.",
    connectedChannels: ["Facebook", "X", "YouTube", "LinkedIn", "Website"],
    leads: 48, seoScore: 82, campaigns: 8, websiteVisits: 4580, socialReach: 21800,
    lastActivity: "1 day ago", createdAt: "22 Jun 2024", owner: "Rahul Mehta",
  },
  {
    id: "green-bharat", organizationId: adminOrganization.id, name: "Green Bharat Initiative", website: "greenbharat.in",
    status: "paused", color: "#4BBF62", logoText: "GB", description: "Sustainability and education initiative for a greener India.",
    connectedChannels: ["Instagram", "LinkedIn", "Website"], leads: 12, seoScore: 45, campaigns: 2,
    websiteVisits: 6240, socialReach: 32700, lastActivity: "3 days ago", createdAt: "04 Sep 2023", owner: "Manish Sirohi",
  },
];
