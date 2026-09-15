export type TabKey =
  | "overview"
  | "pages"
  | "landing-pages"
  | "forms"
  | "analytics"
  | "seo"
  | "monitoring"
  | "settings";

export interface WebsitePageItem {
  id: string;
  name: string;
  slug: string;
  template: string;
  status: "Published" | "Draft" | "Scheduled";
  views: string;
  bounce: string;
  seo: number;
  updated: string;
  metaTitle?: string;
  metaDesc?: string;
}

export interface WebsiteFormItem {
  id: string;
  name: string;
  status: "Active" | "Draft" | "Archived";
  submissions: number;
  conv: string;
  fields: { name: string; type: string; required: boolean }[];
  redirectUrl?: string;
  emailNotifications?: boolean;
}

export interface WebsiteSubmissionItem {
  id: string;
  name: string;
  email: string;
  form: string;
  status: "New" | "Converted" | "Contacted" | "Read";
  time: string;
}
