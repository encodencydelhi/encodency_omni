/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Security & Verification: incoming authenticity, outgoing signing, destination safety, replay protection
 * and payload privacy. Visibility only. This is not a policy editor and does not duplicate Global Settings.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { Button } from "@/components/ui/button";
import {
  ENDPOINT_STATE, PRIVACY_LABEL, READINESS, SECURITY_REFERENCES, SECURITY_REVIEW, SIGNING_STATE, SOURCE_CONFIGURATION_STATE, URL_VALIDATION,
  VERIFICATION_METHOD_LABEL, WEBHOOK_ROUTES, MODULE_LINKS,
} from "../data/config";
import { endpointSecurityWarnings, incomingInWindow, securitySummary } from "../data/selectors";
import type { IncomingSource, OutgoingEndpoint } from "../data/types";
import { CompanyCell, EndpointCell, OpenLink, TablePanel, SectionCard } from "./cells";
import { CardGrid, Chip, EmptyRows, Kpi, Mono, Notice, State, Timestamp } from "./kit";
import { useWebhookData } from "./webhooks-context";

export function SecurityPage() {
  const { snapshot, window } = useWebhookData();
  const router = useRouter();
  const summary = useMemo(() => securitySummary(snapshot, window), [snapshot, window]);
  const events = useMemo(() => incomingInWindow(snapshot, window), [snapshot, window]);

  const failuresBySource = (id: string) => events.filter((e) => e.sourceId === id && (e.verification.state === "rejected" || e.verification.state === "unavailable")).length;

  const incomingColumns: Array<DataTableColumn<IncomingSource>> = [
    { id: "source", header: "Source", cell: (row) => (<div className="min-w-0"><span className="block text-[0.8125rem] font-medium">{row.name}</span><Mono className="text-muted-foreground">{row.id}</Mono></div>) },
    { id: "provider", header: "Provider", hideBelow: "lg", cell: (row) => <span className="text-[0.8125rem]">{row.providerName}</span> },
    { id: "method", header: "Verification Method", cell: (row) => <span className="text-[0.8125rem]">{VERIFICATION_METHOD_LABEL[row.verificationMethod]}</span> },
    { id: "ready", header: "Configuration Readiness", cell: (row) => (<div className="space-y-1"><State registry={READINESS} status={row.readiness} /><State registry={SOURCE_CONFIGURATION_STATE} status={row.configurationState} /></div>) },
    { id: "fail", header: "Recent Failures", align: "right", cell: (row) => <span className="tabular">{failuresBySource(row.id)}</span> },
    { id: "last", header: "Last Verified Event", hideBelow: "xl", cell: () => <span className="text-2xs text-muted-foreground">No genuine verification data. Demo records only</span> },
    { id: "act", header: "Actions", align: "right", cell: (row) => <OpenLink href={WEBHOOK_ROUTES.incomingSource(row.id)} label="Source" /> },
  ];

  const signingColumns: Array<DataTableColumn<OutgoingEndpoint>> = [
    { id: "endpoint", header: "Endpoint", cell: (row) => <EndpointCell endpoint={row} /> },
    { id: "scope", header: "Company / Scope", hideBelow: "lg", cell: (row) => <CompanyCell id={row.companyId} name={row.companyName} /> },
    { id: "method", header: "Signing Method", hideBelow: "md", cell: (row) => <span className="text-[0.8125rem]">{row.signing.method === "hmac_sha256" ? "HMAC-SHA256 (ref)" : "None"}</span> },
    { id: "state", header: "Configuration", cell: (row) => <State registry={SIGNING_STATE} status={row.signing.state} /> },
    { id: "secret", header: "Secret Version Ref", hideBelow: "xl", cell: (row) => (row.signing.secretVersionRef ? <Mono>{row.signing.secretVersionRef}</Mono> : <span className="text-muted-foreground">None</span>) },
    { id: "rot", header: "Last Rotation", hideBelow: "xl", cell: (row) => <Timestamp iso={row.signing.lastRotationAt} /> },
    { id: "review", header: "Review Status", cell: (row) => <State registry={SECURITY_REVIEW} status={row.signing.reviewStatus} /> },
    { id: "act", header: "Actions", align: "right", cell: (row) => <OpenLink href={`${WEBHOOK_ROUTES.endpoint(row.id)}?tab=security`} label="Security" /> },
  ];

  const destinationColumns: Array<DataTableColumn<OutgoingEndpoint>> = [
    { id: "endpoint", header: "Endpoint", cell: (row) => <EndpointCell endpoint={row} /> },
    { id: "state", header: "State", hideBelow: "md", cell: (row) => <State registry={ENDPOINT_STATE} status={row.state} /> },
    { id: "https", header: "HTTPS", cell: (row) => <Chip tone={row.security.httpsState === "https" ? "info" : "danger"}>{row.security.httpsState === "https" ? "HTTPS" : row.security.httpsState === "http" ? "HTTP" : "Unknown"}</Chip> },
    { id: "val", header: "URL Validation", cell: (row) => <State registry={URL_VALIDATION} status={row.security.urlValidationState} /> },
    { id: "review", header: "Last Security Review", hideBelow: "lg", cell: (row) => <Timestamp iso={row.security.lastSecurityReviewAt} /> },
    { id: "warn", header: "Warnings", align: "right", cell: (row) => <span className="tabular">{endpointSecurityWarnings(row).length}</span> },
  ];

  const timestampPassed = events.filter((e) => e.verification.timestampCheck === "passed").length;
  const replayPassed = events.filter((e) => e.verification.replayWindowCheck === "passed").length;
  const notRecorded = events.filter((e) => e.verification.replayWindowCheck === "not_recorded").length;
  const duplicates = events.filter((e) => e.dedup.result === "duplicate_http_delivery").length;
  const privacyCounts = (Object.keys(PRIVACY_LABEL) as Array<keyof typeof PRIVACY_LABEL>).map((key) => ({ key, count: snapshot.endpoints.filter((e) => e.policy.payloadPrivacy === key).length }));

  return (
    <div className="space-y-1">
      <Notice tone="warning" title="Demo records. Nothing here is cryptographically verified">
        Verification and signing states shown are fixtures or references. No signature was verified by this frontend, and no signing secret exists here. Actual enforcement belongs to the backend.
      </Notice>

      <CardGrid cols={4}>
        <Kpi label="Registered Incoming Sources" value={summary.registeredSources} hint="From Integrations provider configuration" />
        <Kpi label="Verification Configured" value={`${summary.sourcesWithVerification} / ${summary.registeredSources}`} tone={summary.sourcesWithVerification < summary.registeredSources ? "warning" : "default"} hint="Sources with a defined policy" />
        <Kpi label="Verification Failures" value={summary.verificationFailures} tone={summary.verificationFailures ? "danger" : "default"} hint="Rejected or not verified, in period" href={`${WEBHOOK_ROUTES.incomingEvents}?verification=rejected`} />
        <Kpi label="Rejected Events" value={summary.rejectedEvents} tone={summary.rejectedEvents ? "danger" : "default"} hint="Verification rejected, in period" />
        <Kpi label="Endpoints With Signing" value={`${summary.endpointsSigned} / ${summary.totalEndpoints}`} tone={summary.endpointsSigned < summary.totalEndpoints ? "warning" : "default"} hint="Configured (reference) signing" />
        <Kpi label="Endpoints Needing Review" value={summary.endpointsNeedingReview} tone={summary.endpointsNeedingReview ? "warning" : "default"} hint="One or more security warnings" />
        <Kpi label="Rotation Reviews Due" value={summary.rotationReviewsDue} tone={summary.rotationReviewsDue ? "warning" : "default"} hint="From review status references" />
        <Kpi label="Duplicate Deliveries Ignored" value={duplicates} hint="Incoming, in period" />
      </CardGrid>

      <div id="incoming-verification" className="scroll-mt-24">
        <TablePanel title="Incoming Verification" description="Each provider has its own requirements. Providers do not all use the same signing algorithm.">
          <DataTable columns={incomingColumns} rows={snapshot.sources} getRowId={(row) => row.id} isLoading={false} caption="Incoming verification" onRowClick={(row) => router.push(WEBHOOK_ROUTES.incomingSource(row.id))} emptyState={<EmptyRows title="No sources registered" />} />
        </TablePanel>
      </div>

      <TablePanel title="Outgoing Signing" description="References only. Signing secrets are never shown or stored in the browser." action={<Button asChild variant="outline" size="sm"><Link href={WEBHOOK_ROUTES.outgoing}>Endpoints</Link></Button>}>
        <DataTable columns={signingColumns} rows={snapshot.endpoints} getRowId={(row) => row.id} isLoading={false} caption="Outgoing signing" onRowClick={(row) => router.push(`${WEBHOOK_ROUTES.endpoint(row.id)}?tab=security`)} emptyState={<EmptyRows title="No endpoints configured" />} />
      </TablePanel>

      <div className="grid gap-1 xl:grid-cols-[1.4fr_1fr]">
        <TablePanel title="Endpoint Destination Security" description="Frontend validation is preliminary. It is not SSRF protection.">
          <DataTable columns={destinationColumns} rows={snapshot.endpoints} getRowId={(row) => row.id} isLoading={false} caption="Destination security" emptyState={<EmptyRows title="No endpoints configured" />} />
        </TablePanel>
        <SectionCard title="Destination Policy References" description="Backend and network-layer controls. Not enforced by this frontend.">
          <dl className="space-y-3">
            {[["Private-network restriction", SECURITY_REFERENCES.privateNetworkPolicy], ["Redirect policy", SECURITY_REFERENCES.redirectPolicy], ["DNS resolution policy", SECURITY_REFERENCES.dnsPolicy], ["Outbound egress policy", SECURITY_REFERENCES.egressPolicy]].map(([label, value]) => (
              <div key={label}><dt className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt><dd className="mt-0.5 text-2xs">{value}</dd></div>
            ))}
          </dl>
        </SectionCard>
      </div>

      <div className="grid gap-1 lg:grid-cols-2">
        <SectionCard title="Replay Protection" description="Derived from demo verification and deduplication records.">
          <ul className="space-y-2 text-[0.8125rem]">
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">Timestamp checks passed (demo)</span><span className="tabular font-medium">{timestampPassed}</span></li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">Replay-window checks passed (demo)</span><span className="tabular font-medium">{replayPassed}</span></li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">Checks not recorded (rejected earlier)</span><span className="tabular font-medium">{notRecorded}</span></li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">Duplicate HTTP deliveries ignored</span><span className="tabular font-medium">{duplicates}</span></li>
          </ul>
          <p className="mt-3 text-2xs text-muted-foreground">Incoming replay never bypasses original signature or authenticity requirements. Outgoing deliveries carry a stable idempotency reference per event so recipients can deduplicate.</p>
        </SectionCard>
        <SectionCard title="Payload Privacy" description="Endpoint privacy classification. Payloads are sanitized before persistence or export.">
          <ul className="space-y-2 text-[0.8125rem]">
            {privacyCounts.map((item) => (<li key={item.key} className="flex justify-between gap-3"><span className="text-muted-foreground">{PRIVACY_LABEL[item.key]}</span><span className="tabular font-medium">{item.count} endpoint{item.count === 1 ? "" : "s"}</span></li>))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link href={WEBHOOK_ROUTES.events}>Event catalogue</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.globalSettings}>Global Settings</Link></Button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
