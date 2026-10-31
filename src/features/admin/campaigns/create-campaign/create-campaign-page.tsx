"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Save, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { clientsApi } from "@/features/clients/data/clients-api";
import { Field } from "@/features/companies/components/primitives";
import { AdminPageTitle } from "@/features/admin/shared/admin-page-title";
import { campaignsApi, type CampaignObjective, type CampaignMode } from "../live/campaigns-api";
import { ChannelTag, Section, channelLabel, humanize } from "../campaign-ui";

const objectives: CampaignObjective[] = ["AWARENESS", "TRAFFIC", "ENGAGEMENT", "LEADS", "SALES", "APP_PROMOTION", "RETENTION", "REENGAGEMENT"];
const modes: CampaignMode[] = ["ORGANIC", "PAID", "UNIFIED"];
/** Provider codes the API accepts (Instagram is part of META). */
const channels = ["META", "LINKEDIN", "YOUTUBE", "GOOGLE_BUSINESS"];

export function CreateCampaignPage() {
  const router = useRouter();
  const cache = useQueryClient();
  const { companyId, clientId, setClientId } = useTenancyContext();
  const clients = useQuery({ queryKey: ["campaign-create-clients", companyId], enabled: Boolean(companyId), queryFn: () => clientsApi.list(companyId) });
  const [selectedClient, setSelectedClient] = useState("");
  const targetClient = selectedClient || (clients.data?.some(client => client.id === clientId) ? clientId : "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [objective, setObjective] = useState<CampaignObjective>("AWARENESS");
  const [mode, setMode] = useState<CampaignMode>("ORGANIC");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!companyId || !targetClient || !clients.data?.some(client => client.id === targetClient)) return setError("Select a verified client before saving.");
    if (!name.trim()) return setError("Enter a campaign name.");
    if (start && end && end < start) return setError("End date must be on or after start date.");
    if (budget && (!/^\d{1,12}(\.\d{1,2})?$/.test(budget) || Number(budget) <= 0)) return setError("Enter a positive budget with at most two decimal places.");
    setSaving(true); setError("");
    try {
      const created = await campaignsApi.create(companyId, targetClient, { name: name.trim(), description: description.trim() || undefined, internalNotes: notes.trim() || undefined, objective, campaignMode: mode, channels: selectedChannels, budget: budget ? { amount: Number(budget).toFixed(2), currency: "INR" } : undefined, startDate: start || null, endDate: end || null });
      setClientId(targetClient);
      await cache.invalidateQueries({ queryKey: ["workspace-campaigns"] });
      await cache.invalidateQueries({ queryKey: ["workspace-campaign-counts"] });
      toast.success("Campaign saved", { description: "Your campaign brief is saved as a draft. No posts or ads were launched." });
      router.push(`/admin/campaigns/${created.id}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The campaign could not be saved."); }
    finally { setSaving(false); }
  };
  const toggleChannel = (channel: string) => setSelectedChannels(current => current.includes(channel) ? current.filter(value => value !== channel) : [...current, channel]);
  const clientName = clients.data?.find(client => client.id === targetClient)?.name;

  return (
    <div className="space-y-1">
      <AdminPageTitle
        eyebrow="Marketing / Campaigns / New"
        title="Create Campaign"
        description="Build a clear brief for your client. Save goals, channels, dates and planned budget before preparing content."
        action={<Button asChild variant="outline" size="sm"><Link href="/admin/campaigns"><ArrowLeft className="size-3.5" /> All Campaigns</Link></Button>}
      />

      <form onSubmit={event => void submit(event)} className="grid items-start gap-1 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-1">
          <Section title="Campaign brief" icon={Target}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Client" htmlFor="campaign-client" required error={clients.isError ? "Clients could not be loaded. Refresh the page to try again." : null}>
                <Select value={targetClient} onValueChange={setSelectedClient} disabled={saving || clients.isPending}>
                  <SelectTrigger id="campaign-client" aria-label="Campaign client"><SelectValue placeholder="Select a client" /></SelectTrigger>
                  <SelectContent>{clients.data?.map(client => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Campaign name" htmlFor="campaign-name" required>
                <Input id="campaign-name" required maxLength={200} placeholder="e.g. Winter product launch" value={name} onChange={event => setName(event.target.value)} />
              </Field>
              <Field label="Brief" htmlFor="campaign-brief" className="sm:col-span-2">
                <Textarea id="campaign-brief" maxLength={2000} rows={3} placeholder="What is this campaign about, and what should it achieve?" value={description} onChange={event => setDescription(event.target.value)} />
              </Field>
              <Field label="Objective" htmlFor="campaign-objective">
                <Select value={objective} onValueChange={value => setObjective(value as CampaignObjective)}>
                  <SelectTrigger id="campaign-objective"><SelectValue /></SelectTrigger>
                  <SelectContent>{objectives.map(value => <SelectItem key={value} value={value}>{humanize(value)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Campaign mode" htmlFor="campaign-mode">
                <Select value={mode} onValueChange={value => setMode(value as CampaignMode)}>
                  <SelectTrigger id="campaign-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>{modes.map(value => <SelectItem key={value} value={value}>{humanize(value)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <fieldset className="space-y-1 sm:col-span-2">
                <legend className="mb-1 text-[0.8125rem] font-medium text-foreground">Planned channels</legend>
                <div className="flex flex-wrap gap-1.5">
                  {channels.map(channel => {
                    const on = selectedChannels.includes(channel);
                    return (
                      <button
                        key={channel}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleChannel(channel)}
                        className={cn("rounded-sm border transition-colors", on ? "border-primary/40 bg-primary-subtle ring-1 ring-primary/20" : "border-transparent opacity-80 hover:opacity-100")}
                      >
                        <ChannelTag channel={channel} className={on ? "border-transparent bg-transparent text-primary" : ""} />
                      </button>
                    );
                  })}
                </div>
                <p className="text-2xs text-muted-foreground">Optional. Channels are planning labels; nothing is published from here.</p>
              </fieldset>
            </div>
          </Section>

          <Section title="Timing & budget" icon={CalendarDays}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Start date" htmlFor="campaign-start">
                <Input id="campaign-start" type="date" value={start} onChange={event => setStart(event.target.value)} />
              </Field>
              <Field label="End date" htmlFor="campaign-end">
                <Input id="campaign-end" type="date" min={start || undefined} value={end} onChange={event => setEnd(event.target.value)} />
              </Field>
              <Field label="Planned budget (INR)" htmlFor="campaign-budget">
                <Input id="campaign-budget" inputMode="decimal" placeholder="Optional" value={budget} onChange={event => setBudget(event.target.value)} />
              </Field>
              <Field label="Internal notes" htmlFor="campaign-notes" className="sm:col-span-3">
                <Textarea id="campaign-notes" maxLength={5000} rows={2} placeholder="Notes for your team" value={notes} onChange={event => setNotes(event.target.value)} />
              </Field>
            </div>
          </Section>
        </div>

        <Section title="Ready to save?">
          <div className="space-y-3">
            <p className="text-xs leading-5 text-muted-foreground">This creates a workspace draft. Social posts are prepared in Content; paid ad delivery is managed in Meta Ads.</p>
            <dl className="space-y-2 border-y border-[#EDF1F5] py-3 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Client</dt><dd className="truncate text-right font-medium text-foreground">{clientName ?? "Not selected"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Status</dt><dd className="font-medium text-foreground">Draft</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Channels</dt><dd className="truncate text-right font-medium text-foreground">{selectedChannels.length ? selectedChannels.map(channelLabel).join(", ") : "Not set"}</dd></div>
            </dl>
            {error && <p role="alert" className="rounded-sm border border-danger/20 bg-danger-subtle p-2 text-xs leading-5 text-danger">{error}</p>}
            <div className="space-y-1">
              <Button type="submit" size="sm" className="w-full" disabled={saving || !targetClient || !name.trim()}><Save className="size-3.5" />{saving ? "Saving..." : "Save Campaign Draft"}</Button>
              <Button asChild variant="ghost" size="sm" className="w-full"><Link href="/admin/campaigns">Cancel</Link></Button>
            </div>
          </div>
        </Section>
      </form>
    </div>
  );
}
