import { AdminPageTitle } from "@/features/admin/shared/admin-page-title";
import { AnalyticsPage } from "@/features/admin/analytics/components/analytics-page";

export default function Page() {
  return (
    <div className="space-y-3">
      <AdminPageTitle
        eyebrow="Analytics"
        title="Analytics"
        description="Performance across your channels, campaigns, CRM and automation. Figures that are not measured yet show a dash."
      />
      <AnalyticsPage />
    </div>
  );
}
