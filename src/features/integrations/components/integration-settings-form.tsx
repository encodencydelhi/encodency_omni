/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Platform integration policy.
 *
 * Only settings the server really applies are here: the background job reads the first two, and issue detection reads the
 * third. Anything that nothing reads (approval policies, sync intervals, retry policies, escalation) is not offered.
 */

"use client";

import { useState } from "react";
import { CheckCircle2Icon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useIntegrationSettings, useUpdateIntegrationSettings } from "../data/hooks";
import type { IntegrationSettings } from "../data/types";

export function IntegrationSettingsForm() {
  const { data: settings, isError } = useIntegrationSettings();
  const updateSettings = useUpdateIntegrationSettings();
  const [formState, setFormState] = useState<IntegrationSettings | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The form follows the server's copy when its content changes (a save), not on every background refetch.
  const settingsKey = settings ? JSON.stringify(settings) : null;
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  if (settings && settingsKey !== syncedKey) {
    setSyncedKey(settingsKey);
    setFormState({ ...settings });
  }

  if (isError) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">The platform settings could not be loaded.</p>;
  }
  if (!formState || !settings) {
    return <div className="h-48 rounded-xl border border-slate-200/60 bg-slate-100 animate-pulse" />;
  }

  const dirty = JSON.stringify(formState) !== JSON.stringify(settings);
  const change = (patch: Partial<IntegrationSettings>) => {
    setFormState((current) => (current ? { ...current, ...patch } : current));
    setSaveSuccess(false);
  };

  const save = async () => {
    setError(null);
    try {
      await updateSettings.mutateAsync(formState);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The settings were not saved.");
    }
  };

  const row = (title: string, description: string, control: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 text-xs">{title}</p>
        <p className="text-slate-500 text-xs mt-0.5">{description}</p>
      </div>
      {control}
    </div>
  );

  return (
    <div className="space-y-4 w-full max-w-full text-xs relative pb-16">
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
        <div className="border-b border-slate-100 pb-2">
          <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">Background connection upkeep</div>
          <div className="text-slate-500 text-xs">What the server does by itself, for every company.</div>
        </div>
        {row(
          "Renew tokens automatically",
          "About once a day (and within a week of a LinkedIn token's end) the server renews logins that hold a refresh token, so a revoked one is found early. A company can still switch this off for itself. When this is off, nothing is renewed in the background for anyone.",
          <Switch checked={formState.autoRefreshEnabled} onCheckedChange={(autoRefreshEnabled) => change({ autoRefreshEnabled })} aria-label="Renew tokens automatically" />,
        )}
        {row(
          "Notify company admins",
          "Owners and Admins get an in-app notice (and e-mail or WhatsApp where they chose it) when a connection needs reconnecting or its access is about to end. A reminder is not repeated more than once a week.",
          <Switch checked={formState.notifyCompanyAdmins} onCheckedChange={(notifyCompanyAdmins) => change({ notifyCompanyAdmins })} aria-label="Notify company admins" />,
        )}
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
        <div className="border-b border-slate-100 pb-2">
          <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">Issue detection</div>
          <div className="text-slate-500 text-xs">When a problem becomes an issue in the queue.</div>
        </div>
        <div className="space-y-1 pt-3 max-w-sm">
          <Label className="text-xs font-semibold text-slate-700">Failed checks in a row before it is raised</Label>
          <Select value={String(formState.repeatedFailureThreshold)} onValueChange={(value) => change({ repeatedFailureThreshold: Number(value) })}>
            <SelectTrigger className="text-xs bg-white"><SelectValue /></SelectTrigger>
            <SelectContent className="text-xs">
              {[1, 2, 3, 5, 10].map((count) => <SelectItem key={count} value={String(count)}>{count === 1 ? "After the first failure" : `After ${count} failures in a row`}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-slate-400 block">A connection whose access is gone is raised at once, whatever this is set to. This only applies to checks that keep failing for another reason.</span>
        </div>
      </div>

      {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 font-medium text-rose-700">{error}</p>}

      <div className="sticky bottom-3 flex items-center justify-end gap-2">
        {saveSuccess && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2Icon className="size-3.5" /> Saved</span>
        )}
        <Button type="button" variant="outline" size="sm" className="text-xs bg-white" onClick={() => setFormState({ ...settings })} disabled={!dirty || updateSettings.isPending}>
          Discard
        </Button>
        <Button type="button" size="sm" className="text-xs bg-[#EB0711] hover:bg-[#EB0711]/90 text-white" onClick={() => void save()} disabled={!dirty || updateSettings.isPending}>
          <SaveIcon className="size-3.5 mr-1.5" />
          {updateSettings.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
