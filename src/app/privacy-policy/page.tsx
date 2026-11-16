import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";
import { APP } from "@/config/app";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${APP.name} collects, uses, shares and protects information.`,
  robots: { index: true, follow: true },
};

const UPDATED = "16 November 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated={UPDATED}>
      <p>
        {APP.name} (“{APP.name}”, “we”, “us”) is a marketing operations platform operated by {APP.vendor} Pvt. Ltd. Companies use it to manage
        content, campaigns, social and Google channels, WhatsApp messaging, CRM, website monitoring, automation, team access, billing and support.
        This policy explains what information we handle, why, who we share it with, how long we keep it, and the choices you have.
      </p>

      <h2>1. Who is responsible for which information</h2>
      <ul>
        <li>
          <strong>Our customers (companies and their team members)</strong>: for the account and usage information described in section 2, {APP.vendor} is the
          controller.
        </li>
        <li>
          <strong>The customers of our customers</strong> (for example people who message a business on WhatsApp, fill in a lead form, or appear as a CRM
          contact): the business that uses {APP.name} decides why and how that information is used, and {APP.vendor} processes it on the business’s behalf.
          If you are such a person and want to see or delete your information, please contact the business first; we will also help (section 9).
        </li>
      </ul>

      <h2>2. Information we collect</h2>
      <h3>Account and team information</h3>
      <p>Name, email address, role, company and client memberships, sign-in and security data (hashed passwords, two-step verification, sessions), and invitations.</p>
      <h3>Information from connected channels</h3>
      <p>
        When a company connects Meta (Facebook, Instagram, WhatsApp, Meta Ads), Google (Business Profile, YouTube, Search Console, Analytics) or LinkedIn, we receive the
        access tokens and the account, page, location, channel or ad-account details the connecting person approves. We read and, where the company asks us to, publish or
        change only what the approved permissions allow. Access tokens are stored encrypted.
      </p>
      <h3>Messaging, leads and CRM records</h3>
      <p>
        Business phone numbers and WhatsApp conversation data (messages, templates, delivery status, contact opt-in and opt-out), leads received from lead forms or webhooks,
        and CRM records a company creates (leads, contacts, deals, tasks). This can include names, phone numbers, email addresses and message content supplied by the business or by the
        people who contact it.
      </p>
      <h3>Content and media</h3>
      <p>Posts, drafts, images, videos and documents a company uploads or generates, and the reports and analytics built from the company’s own connected channels.</p>
      <h3>Billing information</h3>
      <p>Plan, invoices, billing contacts and billing details. Card and bank details are entered with our payment provider (Razorpay); we do not store full card numbers.</p>
      <h3>Support and assistant conversations</h3>
      <p>
        Support tickets, and questions asked to the in-app assistant with its answers. Passwords, keys and card numbers typed into a message are masked before saving. The assistant may
        look up counts and statuses of your own workspace to answer you; it does not read names, emails, phone numbers or message text for this.
      </p>
      <h3>Technical information</h3>
      <p>IP address, browser type, request logs, error logs and a session cookie that keeps you signed in. We do not use advertising cookies.</p>

      <h2>3. How we use information</h2>
      <ul>
        <li>To provide, secure and support the service you or your company asked for.</li>
        <li>To connect to the channels you approve and to publish, send, read or report on their behalf.</li>
        <li>To run automations and notifications that a company has configured.</li>
        <li>To bill, prevent fraud and abuse, keep audit records and meet legal duties.</li>
        <li>To improve reliability and help content, such as reviewing assistant conversations to fix wrong answers.</li>
      </ul>
      <p>We do not sell personal information, and we do not use information from Meta, Google or LinkedIn for advertising or to build profiles for resale.</p>

      <h2>4. Meta (Facebook, Instagram, WhatsApp) data</h2>
      <p>
        We use data from the Meta platform only to provide the features a company enables: reading and publishing to its Pages and Instagram accounts, reading its ad accounts and lead forms,
        and sending and receiving WhatsApp messages through the WhatsApp Business Platform. We keep WhatsApp messages and contact data only as long as the business keeps them in its workspace
        or until it deletes them. We follow Meta’s platform terms and WhatsApp’s business and messaging policies, including honouring opt-out requests. People can ask to delete their data as described in
        section 9 and on our <a href="/data-deletion">Data Deletion</a> page.
      </p>

      <h2>5. Google user data</h2>
      <p>
        {APP.name}’s use and transfer of information received from Google APIs adheres to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. We use Google data only to provide the features the connecting person approves (for example managing a Business Profile, YouTube channel, or reading
        Search Console and Analytics reports). We do not use it for advertising, do not sell it, and do not let people read it except as needed to provide the feature, for security, or to comply with law.
        A company can disconnect Google at any time from its Integrations page, and can also remove access in its Google account settings.
      </p>

      <h2>6. Who we share information with</h2>
      <p>We share information only with service providers that help us run {APP.name}, under agreements that limit their use of it:</p>
      <ul>
        <li>Cloud hosting and database providers, and Cloudinary for media storage.</li>
        <li>Razorpay for payments.</li>
        <li>Email delivery (the company’s own email settings or our provider) for notifications, invitations and reports.</li>
        <li>OpenAI and Google (Gemini) for AI features such as writing help, image generation, website analysis and the assistant. We send only what the feature needs; the assistant is not sent names, emails, phone numbers or message content from your workspace.</li>
        <li>Meta, Google, LinkedIn and AiSensy, only to carry out what a company has asked us to do through them.</li>
      </ul>
      <p>We may also disclose information if the law requires it or to protect the rights, safety and security of our users and the service.</p>

      <h2>7. How long we keep it</h2>
      <ul>
        <li>Account and workspace data: while the account is active, then deleted or anonymised within a reasonable period after closure, unless the law requires us to keep it (for example invoices and audit records).</li>
        <li>Assistant conversations: up to 180 days by default.</li>
        <li>Technical logs and automation event records: kept for a limited period (typically 30 to 90 days).</li>
        <li>Backups are overwritten on their normal cycle.</li>
      </ul>

      <h2>8. Security</h2>
      <p>
        We use encryption in transit, encryption of stored access tokens, role-based access control, per-company and per-client data separation, audit logging and two-step verification. No system is
        perfectly secure; if we learn of a breach that affects you we will tell you as the law requires.
      </p>

      <h2>9. Your choices and rights</h2>
      <p>
        You can ask us to access, correct, export or delete your personal information, to withdraw consent, or to object to how it is used. Team members can manage most of their own details in the app.
        To use these rights, or to ask about information a business holds through {APP.name}, email <a href={`mailto:${APP.supportEmail}`}>{APP.supportEmail}</a>. We will verify who you are and reply
        within a reasonable time. Where we process information for a business, we may pass your request to that business. Applicable law, including India’s Digital Personal Data Protection Act, 2023,
        may give you additional rights.
      </p>

      <h2>10. Children</h2>
      <p>{APP.name} is for businesses and is not directed to children. We do not knowingly collect information from children.</p>

      <h2>11. International transfers</h2>
      <p>Our providers may process information in other countries. Where we do this, we use providers and safeguards appropriate to the law that applies.</p>

      <h2>12. Changes to this policy</h2>
      <p>We will post changes on this page and update the date above. For material changes we will also notify account owners in the app or by email.</p>

      <h2>13. Contact</h2>
      <p>
        {APP.vendor} Pvt. Ltd. · <a href={`mailto:${APP.supportEmail}`}>{APP.supportEmail}</a>
      </p>
    </LegalLayout>
  );
}
