"use client";
import { useQuery } from "@tanstack/react-query";
import { nativeWhatsAppApi } from "./native-api";
import { Badge, Panel } from "./ui";

const LABELS: Record<string, string> = {
  providerMode: "Provider Mode",
  metaEnabled: "Live Meta Switch",
  graphVersion: "Pinned Graph API Version",
  metaAppId: "Meta App ID",
  metaAppSecret: "Meta App Secret",
  webhookVerifyToken: "Webhook Verify Token",
  webhookPublicHttps: "Public HTTPS Webhook URL",
  tokenEncryptionKey: "Token Encryption Key",
  cloudMediaStorage: "Cloud Media Storage",
  flowJsonVersion: "Flow JSON Version",
  embeddedSignupConfig: "Embedded Signup Configuration",
};

export function NativeReadinessPanel({ scope }: { scope: string }) {
  const result = useQuery({ queryKey: ["whatsapp-native-diagnostics", scope], queryFn: () => nativeWhatsAppApi.diagnostics(scope), refetchInterval: 30000 });
  const report = result.data;
  return (
    <Panel title="Go-Live Readiness" actions={report ? <Badge>{report.mode === "MOCK" ? "Simulation Mode" : report.ready ? "Ready For Live Checks" : "Action Required"}</Badge> : undefined}>
      <p className="mb-3 text-xs text-slate-500">Server-Side Settings Needed Before A Live Connection. Passing This Checklist Does Not Prove Meta Approval, Webhook Delivery Or Sending; Those Need Separate Live Verification.</p>
      {result.error ? <p role="alert" className="text-xs text-rose-700">{result.error.message}</p> : result.isLoading ? <p role="status" className="text-xs">Loading Readiness...</p> : (
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          {report?.checks.map((check) => (
            <div key={check.key} className="flex min-w-0 justify-between gap-3 rounded border border-slate-100 p-2">
              <dt className="min-w-0 break-words" title={check.hint}>{LABELS[check.key] ?? check.key}</dt>
              <dd className={check.ok ? "text-emerald-700" : check.required && report.mode === "META" ? "text-rose-700" : "text-amber-700"}>
                {check.ok ? "Ready" : check.required && report.mode === "META" ? "Action Required" : "Optional"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}
