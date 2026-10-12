"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Flame,
  HelpCircle,
  Info,
  Layers,
  RefreshCw,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Field,
  KeyValue,
  Panel,
  StatCard,
  StatGrid,
  WithTooltip,
} from "@/features/companies/components/primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function PrimitivesShowcasePage() {
  const [fieldValue, setFieldValue] = useState("Acme Studio Org");
  const [hasError, setHasError] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [showRulers, setShowRulers] = useState(true);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 pb-20">
      {/* Top Header */}
      <div className="border-b border-border pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                Design System Preview
              </span>
              <span className="text-xs text-muted-foreground">
                src/features/companies/components/primitives.tsx
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              Primitives & Layout Gaps Inspector
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Yahan aap sabhi building blocks (StatCard, StatGrid, Panel, Field, KeyValue, Tooltip) aur unke exact layout gaps ko visually inspect kar sakte hain.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showRulers ? "default" : "outline"}
              size="sm"
              onClick={() => setShowRulers(!showRulers)}
              className="text-xs"
            >
              {showRulers ? "🔍 Hide Gap Badges" : "📏 Highlight Gap Badges"}
            </Button>
            <Button
              variant={isCompact ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsCompact(!isCompact)}
              className="text-xs"
            >
              Mode: {isCompact ? "Compact (Rows of 8)" : "Standard (Normal)"}
            </Button>
          </div>
        </div>
      </div>

      {/* 1. StatCard & Tones Showcase */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              1. StatCard & StatGrid (6 Tones & Spacing)
            </h2>
            <p className="text-xs text-muted-foreground">
              StatGrid `gap-1` (4px) se cards ko tightly group karta hai. Har card ke andar label-icon gap `gap-1.5` (6px) aur mt `1.5` (6px) hai.
            </p>
          </div>
          {showRulers && (
            <span className="text-[11px] font-mono bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded border border-amber-500/20">
              Grid Gap: 4px (`gap-1`) | Icon Gap: 6px (`gap-1.5`)
            </span>
          )}
        </div>

        <StatGrid className="grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Total Tenants"
            value="1,428"
            hint="+12% from last month"
            icon={Users}
            tone="brand"
            compact={isCompact}
            href="#tenants"
          />
          <StatCard
            label="Healthy Services"
            value="99.98%"
            hint="All nodes operational"
            icon={CheckCircle2}
            tone="success"
            compact={isCompact}
          />
          <StatCard
            label="Quota Warnings"
            value="14"
            hint="Approaching 90% limit"
            icon={AlertTriangle}
            tone="warning"
            compact={isCompact}
            href="#warnings"
          />
          <StatCard
            label="Breached SLAs"
            value="3"
            hint="Needs immediate action"
            icon={Flame}
            tone="danger"
            compact={isCompact}
            href="#breaches"
          />
          <StatCard
            label="Active Deployments"
            value="86"
            hint="Across 12 clusters"
            icon={Server}
            tone="info"
            compact={isCompact}
          />
          <StatCard
            label="Idle Workers"
            value="4"
            hint="Standby capacity"
            icon={Clock}
            tone="neutral"
            compact={isCompact}
          />
        </StatGrid>
      </section>

      {/* 2. Visual Gap Analysis Breakdown */}
      {showRulers && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <Info className="size-4" />
            <span>Interactive Layout Gaps Measurement</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded bg-background p-3 border border-border space-y-1.5 shadow-2xs">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>StatCard Header Gap</span>
                <code className="text-[11px] text-primary">gap-1.5 (6px)</code>
              </div>
              <p className="text-muted-foreground text-2xs">
                Line 87: Label aur Icon badge ke beech me 6px ka gap hai, taaki lamba 2-line label icon ke upar overlap na kare.
              </p>
              <div className="mt-2 flex items-center justify-between rounded border border-dashed border-primary/40 bg-primary/5 p-2 text-2xs">
                <span className="font-medium">Label Paragraph</span>
                <span className="bg-primary text-primary-foreground px-1 text-[10px] rounded">6px gap</span>
                <span className="size-5 bg-muted rounded flex items-center justify-center text-[10px]">Icon</span>
              </div>
            </div>

            <div className="rounded bg-background p-3 border border-border space-y-1.5 shadow-2xs">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>Value & Hint Spacing</span>
                <code className="text-[11px] text-primary">mt-1.5 & mt-1</code>
              </div>
              <p className="text-muted-foreground text-2xs">
                Line 102 & 103: Header se Value tak 6px margin (`mt-1.5`) aur Value se Hint tak 4px margin (`mt-1`).
              </p>
              <div className="mt-2 flex flex-col gap-1 rounded border border-dashed border-primary/40 bg-primary/5 p-2 text-2xs">
                <span className="text-[10px] text-muted-foreground">Header Row</span>
                <span className="bg-primary/20 text-primary px-1 text-[9px] w-fit rounded">6px (mt-1.5)</span>
                <span className="font-bold text-xs">Value (1,428)</span>
                <span className="bg-primary/20 text-primary px-1 text-[9px] w-fit rounded">4px (mt-1)</span>
                <span className="text-[10px] text-muted-foreground">Hint (+12% from last month)</span>
              </div>
            </div>

            <div className="rounded bg-background p-3 border border-border space-y-1.5 shadow-2xs">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>Grid Tightness</span>
                <code className="text-[11px] text-primary">gap-1 (4px)</code>
              </div>
              <p className="text-muted-foreground text-2xs">
                Line 129: Normal dashboard me `gap-4` (16px) hota hai, par tenant workspace ke liye ultra-dense 4px spacing use hoti hai.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1 rounded border border-dashed border-primary/40 bg-primary/5 p-2 text-2xs text-center">
                <div className="bg-background border p-1 rounded">Card 1</div>
                <div className="bg-background border p-1 rounded">Card 2</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Panel Component Showcase */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Server className="size-4 text-primary" />
          2. Panel Component (Standard vs Flush Mode)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Standard Panel */}
          <Panel
            title="Standard Panel (with Padding)"
            description="Header has gap-x-3 gap-y-2 (12px / 8px). Body has px-3 pb-3."
            action={
              <div className="flex gap-1.5">
                <Button size="xs" variant="outline">
                  <RefreshCw className="size-3 mr-1" />
                  Refresh
                </Button>
                <Button size="xs" variant="default">
                  Configure
                </Button>
              </div>
            }
          >
            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                Yeh standard panel hai jisme padding aur structured content hota hai.
              </p>
              <div className="rounded border border-border p-2.5 bg-muted/30">
                <div className="font-medium text-foreground">API Quota Pool</div>
                <div className="text-muted-foreground text-2xs mt-0.5">
                  18,450 / 25,000 calls consumed today (73.8%)
                </div>
              </div>
            </div>
          </Panel>

          {/* Flush Panel */}
          <Panel
            title="Flush Panel (for Tables / Edge-to-Edge Lists)"
            description="flush={true} removes body padding so table borders touch the edge."
            flush
            action={
              <Button size="xs" variant="ghost">
                View All <ArrowUpRight className="size-3 ml-1" />
              </Button>
            }
          >
            <table className="w-full text-xs">
              <thead className="border-y border-border bg-muted/40 text-muted-foreground text-[11px]">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Resource</th>
                  <th className="px-3 py-1.5 text-right font-medium">Limit</th>
                  <th className="px-3 py-1.5 text-right font-medium">Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                <tr>
                  <td className="px-3 py-2 font-medium">Storage Volume</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">500 GB</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-600">312 GB</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">Webhook Deliveries</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">100,000</td>
                  <td className="px-3 py-2 text-right font-semibold text-amber-600">92,100</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">Monthly Active Users</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">1,000</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-600">640</td>
                </tr>
              </tbody>
            </table>
          </Panel>
        </div>
      </section>

      {/* 4. Field, KeyValue & WithTooltip */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Zap className="size-4 text-primary" />
          3. Field, KeyValue & WithTooltip Components
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Field Form Example */}
          <Panel title="Field Component" description="Shows label, required asterisk (*), hint, and error message.">
            <div className="space-y-4">
              <Field
                label="Company Workspace Name"
                htmlFor="workspace-name"
                required
                hint={!hasError ? "This name is visible in tenant portals and billing invoices." : undefined}
                error={hasError ? "Company name cannot be blank or contain special characters." : null}
              >
                <Input
                  id="workspace-name"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="h-8 text-xs"
                />
              </Field>

              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setHasError(!hasError)}
                >
                  Toggle Error State ({hasError ? "Active Error" : "Normal Hint"})
                </Button>
              </div>
            </div>
          </Panel>

          {/* KeyValue & Tooltip */}
          <Panel title="KeyValue & WithTooltip" description="gap-3 (12px) label-value pair with hover explanations.">
            <dl className="divide-y divide-border">
              <KeyValue label="Tenant ID">
                <span className="font-mono text-xs">cmp_9f82d110bc7a</span>
              </KeyValue>
              <KeyValue label="SLA Policy">
                <WithTooltip content="Urgent tickets require first reply under 1 hour and resolution under 8 hours.">
                  <span className="underline decoration-dotted font-medium text-primary">
                    Enterprise Platinum Tier
                  </span>
                </WithTooltip>
              </KeyValue>
              <KeyValue label="Auto-Scaling Status">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-xs">
                  <ShieldCheck className="size-3.5" /> Enabled (Min 2, Max 16)
                </span>
              </KeyValue>
              <KeyValue label="Last Heartbeat">
                <WithTooltip content="Node ping received 12 seconds ago via US-East Gateway.">
                  <span className="text-muted-foreground text-xs">12s ago</span>
                </WithTooltip>
              </KeyValue>
            </dl>
          </Panel>
        </div>
      </section>

      {/* 5. Gaps & Improvements Live Verification */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          4. Code Gaps Fixed Verification
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">
                Typo Fixed: `tabular-nums`
              </span>
              <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                FIXED
              </span>
            </div>
            <p className="text-2xs text-muted-foreground">
              Ab `tabular-nums` apply ho gaya hai jisse numbers har digit par exactly same width lete hain aur layout shift nahi hota:
            </p>
            <div className="flex gap-4 p-2 bg-muted/30 rounded border text-sm font-semibold tabular-nums">
              <span>999,999</span>
              <span>111,111</span>
              <span>888,888</span>
              <span>(Monospaced numbers aligned)</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">
                Flex Label `min-w-0 flex-1`
              </span>
              <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                FIXED
              </span>
            </div>
            <p className="text-2xs text-muted-foreground">
              Very long labels without spaces (jaise technical keys) icon ko shrink nahi karenge:
            </p>
            <div className="max-w-xs">
              <StatCard
                label="VERY_LONG_TECHNICAL_ENVIRONMENT_IDENTIFIER_KEY"
                value="Active"
                icon={Database}
                tone="brand"
                compact
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
