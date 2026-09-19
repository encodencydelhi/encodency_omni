"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, PageSection } from "@/components/shared/page-header";
import { ROUTES } from "@/config/routes";

type Tab = "overview" | "plans" | "subscriptions" | "changes" | "settings";

export function PlansSubscriptionsWorkspace({ initialTab = "overview" }: { initialTab?: Tab }) {
  return (
    <PageSection>
      <PageHeader
        title="Plans & Subscriptions"
        description="The structured Plans & Subscriptions data domain is present. The interactive workspace is being reconnected to the newer route structure."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={ROUTES.superAdmin.usage}>Open Usage & Limits</Link>
          </Button>
        }
      />
      <EmptyState
        icon={Layers}
        title={`${initialTab.charAt(0).toUpperCase()}${initialTab.slice(1)} workspace pending route reconnection`}
        description="This compatibility screen keeps the route valid while the newer Plans module files are wired back to UI pages."
      />
    </PageSection>
  );
}
