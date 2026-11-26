export const APP = {
  name: "Media360",
  shortName: "Media360",
  vendor: "EnCodency",
  /** Registered company details, exactly as on the GST certificate (shown on public pages for platform verification). */
  legalName: "ENCODENCY PRIVATE LIMITED",
  registeredAddress: "112/07, Madhyam Marg, Agarwal Farm, Jaipur, Rajasthan 302020, India",
  panelName: "Super Admin",
  description:
    "Internal control panel for the Media360 omnichannel marketing SaaS.",
  supportEmail: "platform-ops@encodency.com",
  /** Default page size used by every server-paginated table. */
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
} as const;
