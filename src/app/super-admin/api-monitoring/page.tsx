/**
 * Media360 - Super Admin API Monitoring Route
 */

import type { Metadata } from "next";
import { ApiMonitoringOperationsCenter } from "@/features/api-monitoring/components/operations-center";

export const metadata: Metadata = {
  title: "API Monitoring | Media360 Super Admin",
  description:
    "Monitor API request volumes, response times, error rates, and rate limits across all platform integrations.",
};

export default function ApiMonitoringRoute() {
  return <ApiMonitoringOperationsCenter page="overview" />;
}
