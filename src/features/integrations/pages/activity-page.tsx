/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Integration Activity Page Component
 */

"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportActivitiesToCsv } from "../data/export-utils";
import { useIntegrationActivities } from "../data/hooks";
import {
  IntegrationActivityTable,
  IntegrationsNav,
} from "../components";

export function ActivityPage() {
  const { data: activities = [] } = useIntegrationActivities();

  const handleExport = () => {
    exportActivitiesToCsv(activities);
  };

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Integration Activity
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {activities.length} Recorded Events
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable platform audit trail of tenant authorizations, external resource mappings, scope modifications, and background sync operations.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="text-xs h-8 font-semibold bg-white text-slate-700 shrink-0"
        >
          <DownloadIcon className="size-3.5 mr-1.5" />
          <span>Export Activity CSV</span>
        </Button>
      </div>

      {/* Navigation */}
      <IntegrationsNav />

      {/* Activity Table */}
      <IntegrationActivityTable activities={activities} />
    </div>
  );
}
