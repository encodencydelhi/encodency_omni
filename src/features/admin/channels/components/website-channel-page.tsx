"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { ChannelHeader } from "./channel-header";
import { TabKey, WebsitePageItem, WebsiteFormItem, WebsiteSubmissionItem } from "./website-tabs/types";
import { OverviewTab } from "./website-tabs/overview-tab";
import { PagesTab } from "./website-tabs/pages-tab";
import { LandingPagesTab } from "./website-tabs/landing-pages-tab";
import { FormsTab } from "./website-tabs/forms-tab";
import { AnalyticsTab } from "./website-tabs/analytics-tab";
import { SeoTab } from "./website-tabs/seo-tab";
import { MonitoringTab } from "./website-tabs/monitoring-tab";
import { SettingsTab } from "./website-tabs/settings-tab";

// Modals
import { EditPageModal } from "./website-tabs/modals/edit-page-modal";
import { DeletePageModal } from "./website-tabs/modals/delete-page-modal";
import { PreviewPageModal } from "./website-tabs/modals/preview-page-modal";
import { FormBuilderModal } from "./website-tabs/modals/form-builder-modal";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "pages", label: "Pages" },
  { key: "landing-pages", label: "Landing Pages" },
  { key: "forms", label: "Forms" },
  { key: "analytics", label: "Analytics" },
  { key: "seo", label: "SEO" },
  { key: "monitoring", label: "Monitoring" },
  { key: "settings", label: "Settings" },
];

const INITIAL_PAGES: WebsitePageItem[] = [
  { id: "p-1", name: "Home", slug: "/", template: "Standard Page", status: "Published", views: "8.4K", bounce: "42%", seo: 92, updated: "Apr 12" },
  { id: "p-2", name: "Our Work & Impact", slug: "/our-work", template: "Standard Page", status: "Published", views: "4.8K", bounce: "46%", seo: 88, updated: "Apr 10" },
  { id: "p-3", name: "Clean Ganga Donation Appeal", slug: "/donate", template: "Donation Appeal", status: "Published", views: "4.2K", bounce: "38%", seo: 95, updated: "Apr 8" },
  { id: "p-4", name: "Volunteer Registration", slug: "/volunteer", template: "Event Registration", status: "Published", views: "3.1K", bounce: "44%", seo: 85, updated: "Apr 6" },
  { id: "p-5", name: "About Namo Gange", slug: "/about", template: "Standard Page", status: "Published", views: "2.6K", bounce: "52%", seo: 82, updated: "Mar 28" },
  { id: "p-6", name: "Programs & Reforestation", slug: "/programs", template: "Standard Page", status: "Published", views: "2.2K", bounce: "40%", seo: 87, updated: "Apr 1" },
  { id: "p-7", name: "Contact & Headquarters", slug: "/contact", template: "Standard Page", status: "Published", views: "1.8K", bounce: "35%", seo: 90, updated: "Apr 11" },
  { id: "p-8", name: "Sunday Volunteer Drive", slug: "/events/sunday-drive", template: "Event Registration", status: "Published", views: "1.6K", bounce: "48%", seo: 79, updated: "Apr 9" },
  { id: "p-9", name: "News & Ecological Blog", slug: "/blog", template: "Standard Page", status: "Published", views: "3.2K", bounce: "32%", seo: 86, updated: "Apr 13" },
  { id: "p-10", name: "Impact Report 2025", slug: "/impact-report-2025", template: "Landing Page", status: "Draft", views: "0", bounce: "-", seo: 65, updated: "Apr 14" },
  { id: "p-11", name: "Annual Gala Dinner 2025", slug: "/annual-gala-2025", template: "Event Registration", status: "Scheduled", views: "0", bounce: "-", seo: 78, updated: "Apr 14" },
  { id: "p-12", name: "Privacy Policy", slug: "/privacy", template: "Standard Page", status: "Published", views: "420", bounce: "68%", seo: 70, updated: "Feb 1" },
];

const INITIAL_FORMS: WebsiteFormItem[] = [
  { id: "f-1", name: "Contact & Inquiries Form", status: "Active", submissions: 382, conv: "4.1%", fields: [] },
  { id: "f-2", name: "Volunteer Sunday Drive Signup", status: "Active", submissions: 214, conv: "3.8%", fields: [] },
  { id: "f-3", name: "Ganga Conservation Donation Form", status: "Active", submissions: 198, conv: "6.2%", fields: [] },
  { id: "f-4", name: "Monthly Environmental Newsletter", status: "Active", submissions: 68, conv: "2.4%", fields: [] },
  { id: "f-5", name: "Youth Leadership Summit RSVP", status: "Draft", submissions: 0, conv: "0.0%", fields: [] },
];

const INITIAL_SUBMISSIONS: WebsiteSubmissionItem[] = [
  { id: "s-1", name: "Rajesh Kumar", email: "rajesh@email.com", form: "Contact Form", status: "New", time: "10 min ago" },
  { id: "s-2", name: "Anita Sharma", email: "anita@email.com", form: "Donation Form", status: "Converted", time: "1h ago" },
  { id: "s-3", name: "Vikram Patel", email: "vikram@email.com", form: "Volunteer Signup", status: "Contacted", time: "2h ago" },
  { id: "s-4", name: "Meena Devi", email: "meena@email.com", form: "Contact Form", status: "Read", time: "5h ago" },
  { id: "s-5", name: "Suresh Reddy", email: "suresh@email.com", form: "Donation Form", status: "Converted", time: "6h ago" },
  { id: "s-6", name: "Kavitha Nair", email: "kavitha@email.com", form: "Newsletter Signup", status: "New", time: "8h ago" },
];

export function WebsiteChannelPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Shared Data States
  const [pages, setPages] = useState<WebsitePageItem[]>(INITIAL_PAGES);
  const [forms, setForms] = useState<WebsiteFormItem[]>(INITIAL_FORMS);
  const [submissions] = useState<WebsiteSubmissionItem[]>(INITIAL_SUBMISSIONS);

  // Modal States
  const [editingPage, setEditingPage] = useState<WebsitePageItem | null>(null);
  const [deletingPage, setDeletingPage] = useState<WebsitePageItem | null>(null);
  const [previewingPage, setPreviewingPage] = useState<WebsitePageItem | null>(null);
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);

  // Handlers
  const handleSync = () => {
    toast.success("Syncing website analytics & SSL data...", {
      description: "Fetched real-time visitor stats, edge latency, and conversion logs.",
    });
  };

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        "Page Name,URL Slug,Status,Views,Bounce Rate,SEO Score",
        ...pages.map((p) => `"${p.name}","${p.slug}","${p.status}","${p.views}","${p.bounce}","${p.seo}"`),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "website_pages_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Website report exported successfully!");
  };

  const handleSaveEditedPage = (updatedPage: WebsitePageItem) => {
    setPages(pages.map((p) => (p.id === updatedPage.id ? updatedPage : p)));
  };

  const handleConfirmDelete = (pageId: string) => {
    setPages(pages.filter((p) => p.id !== pageId));
    toast.success("Page deleted successfully");
  };

  const handleDuplicatePage = (page: WebsitePageItem) => {
    const duplicated: WebsitePageItem = {
      ...page,
      id: "p-" + Date.now(),
      name: `${page.name} (Copy)`,
      slug: `${page.slug}-copy`,
      status: "Draft",
      views: "0",
      bounce: "-",
      updated: "Just now",
    };
    setPages([duplicated, ...pages]);
    toast.success(`Duplicated "${page.name}" as draft`);
  };

  const handleSaveForm = (newForm: WebsiteFormItem) => {
    setForms([newForm, ...forms]);
  };

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab onTabChange={setActiveTab} />;
      case "pages":
        return (
          <PagesTab
            pages={pages}
            onEditPage={(page) => setEditingPage(page)}
            onPreviewPage={(page) => setPreviewingPage(page)}
            onDuplicatePage={handleDuplicatePage}
            onDeletePage={(page) => setDeletingPage(page)}
          />
        );
      case "landing-pages":
        return <LandingPagesTab />;
      case "forms":
        return (
          <FormsTab
            forms={forms}
            submissions={submissions}
            onOpenFormBuilder={() => setIsFormBuilderOpen(true)}
          />
        );
      case "analytics":
        return <AnalyticsTab />;
      case "seo":
        return <SeoTab />;
      case "monitoring":
        return <MonitoringTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <OverviewTab onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="pb-8">
      {/* Header Navigation & Banner */}
      <div className="-mx-4 -mt-5 mb-[4px] bg-white px-4 pt-5 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6 shadow-xs border-b border-slate-200">
        <ChannelHeader
          channel="website"
          onSync={handleSync}
          onExport={handleExport}
          onPrimaryAction={() => router.push("/admin/website/new-page")}
        />
        <nav className="scrollbar-thin flex gap-6 overflow-x-auto border-b border-slate-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "shrink-0 border-b-2 pb-2.5 text-[12.5px] font-bold transition-all cursor-pointer",
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Tab Render */}
      <div>{renderTab()}</div>

      {/* Modals */}
      <EditPageModal
        isOpen={!!editingPage}
        page={editingPage}
        onClose={() => setEditingPage(null)}
        onSave={handleSaveEditedPage}
      />

      <DeletePageModal
        isOpen={!!deletingPage}
        page={deletingPage}
        onClose={() => setDeletingPage(null)}
        onConfirm={handleConfirmDelete}
      />

      <PreviewPageModal
        isOpen={!!previewingPage}
        page={previewingPage}
        onClose={() => setPreviewingPage(null)}
      />

      <FormBuilderModal
        isOpen={isFormBuilderOpen}
        onClose={() => setIsFormBuilderOpen(false)}
        onSave={handleSaveForm}
      />
    </div>
  );
}
