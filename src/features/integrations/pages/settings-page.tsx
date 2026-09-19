/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Integration Settings Page Component
 */

"use client";

import {
  IntegrationSettingsForm,
  IntegrationsNav,
} from "../components";

export function SettingsPage() {
  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            Integration Settings
          </h1>
          <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
            Platform Policies
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Platform-wide default governance policies, token expiration review intervals, backoff retry strategies, and notification thresholds.
        </p>
      </div>

      {/* Navigation */}
      <IntegrationsNav />

      {/* Form with Unsaved Changes Bar */}
      <IntegrationSettingsForm />
    </div>
  );
}
