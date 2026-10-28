import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { PageHeader, Section } from "@/features/support/ui";

const REFERENCES = [
  { title: "Platform settings", description: "Identity, localization, security, governance, privacy and maintenance policies.", href: ROUTES.superAdmin.settings },
  { title: "Support inbox", description: "Open customer tickets and follow up with company admins.", href: `${ROUTES.superAdmin.support}/inbox` },
  { title: "System health", description: "Review service status, incidents and scheduled maintenance.", href: ROUTES.superAdmin.systemHealth },
  { title: "API monitoring", description: "Inspect request activity, errors and endpoint health.", href: ROUTES.superAdmin.apiMonitoring },
];

export default function SuperAdminHelpPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="Documentation" description="Quick links to platform operations and support guidance." />
      <Section title="Platform guides" description="Open the relevant workspace for the task you need to complete.">
        <div className="divide-y divide-slate-100">
          {REFERENCES.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex min-w-0 items-start gap-2.5">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-red-600" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-900">{item.title}</span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">{item.description}</span>
                </span>
              </span>
              <ExternalLink className="size-3.5 shrink-0 text-slate-400" />
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
