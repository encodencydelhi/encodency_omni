import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";
import { APP } from "@/config/app";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms for using ${APP.name}.`,
  robots: { index: true, follow: true },
};

const UPDATED = "23 November 2026";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated={UPDATED}>
      <p>
        These terms apply to {APP.name}, a marketing operations platform operated by {APP.vendor} Pvt. Ltd. (“{APP.vendor}”, “we”, “us”). By creating a workspace or using {APP.name}, the
        company you represent (“you”, “the customer”) agrees to them. If you use {APP.name} for a company, you confirm you are allowed to accept these terms for it.
      </p>

      <h2>1. The service</h2>
      <p>
        {APP.name} lets a company manage content, campaigns, social and Google channels, WhatsApp messaging, CRM, website monitoring, automation, team access, billing and support. Features
        depend on the plan the company chooses. We may improve or change features; if we remove something important to a paid plan we will tell account owners first.
      </p>

      <h2>2. Accounts and team access</h2>
      <ul>
        <li>Keep sign-in details safe and turn on two-step verification. You are responsible for what happens under your team’s accounts.</li>
        <li>Give team members only the access they need. Owners and admins decide who can see which clients and features.</li>
        <li>Tell us quickly at <a href={`mailto:${APP.supportEmail}`}>{APP.supportEmail}</a> if you think an account has been misused.</li>
      </ul>

      <h2>3. Connected channels</h2>
      <p>
        When you connect Meta (Facebook, Instagram, WhatsApp, Meta Ads), Google or LinkedIn, you confirm you are allowed to manage those accounts, Pages, numbers and ad accounts, and you agree to
        follow those platforms’ own terms and policies, including the WhatsApp Business Messaging Policy, Meta Platform Terms, Google API terms and the LinkedIn API and Marketing API terms.
        {" "}{APP.name} acts only on the accounts you connect and only within the permissions you approve. A platform may limit or remove access at any time; we will show this in the app when it happens.
      </p>

      <h2>4. WhatsApp and messaging rules</h2>
      <ul>
        <li>Message only people who have agreed to hear from you, and stop when they opt out. {APP.name} records opt-outs and blocks sending to them.</li>
        <li>Use approved templates for messages outside the 24-hour customer service window, as WhatsApp requires.</li>
        <li>Meta charges for some WhatsApp conversations. These charges, and any limits Meta places on your number, apply to you.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You must not use {APP.name} to:</p>
      <ul>
        <li>send spam, misleading messages or content that is illegal, hateful, or infringes someone else’s rights;</li>
        <li>collect or use personal information without a lawful basis, or break a platform’s data rules (for example exporting or reselling member data);</li>
        <li>try to get into other companies’ data, test or break our security without written permission, or overload the service;</li>
        <li>copy, resell or rebuild {APP.name} except as your plan allows.</li>
      </ul>
      <p>We may suspend a workspace, a channel or an API key that breaks these rules or puts other customers or a platform connection at risk, and we will tell the account owner why.</p>

      <h2>6. API keys</h2>
      <p>
        Owners and admins can create API keys to use {APP.name} from their own systems. Keep keys secret and give each one only the scopes it needs. Requests made with your keys count as yours, are
        rate limited, and follow these terms. You can revoke a key at any time from API &amp; Developers.
      </p>

      <h2>7. Your data</h2>
      <p>
        Your content, contacts, messages and records stay yours. You give us permission to store and process them only to provide {APP.name} to you, as described in our{" "}
        <a href="/privacy-policy">Privacy Policy</a>. You are responsible for having the right to upload and use the information you bring into {APP.name}. You can export or delete your data, and you
        can ask us to delete it as explained on our <a href="/data-deletion">Data Deletion</a> page.
      </p>

      <h2>8. AI features</h2>
      <p>
        Some features use AI providers to write, summarise, analyse or create images. AI output can be wrong; review it before you publish or send it. You are responsible for content you publish.
      </p>

      <h2>9. Plans, trials and payment</h2>
      <ul>
        <li>Paid plans are billed in advance through our payment provider (Razorpay). Prices are shown in the app and include or add taxes as stated there.</li>
        <li>A trial ends on the date shown in the app. Features that need a paid plan stop at the end of the trial unless you choose a plan.</li>
        <li>If a payment fails we may limit the workspace after telling the owner. Fees already paid are not refundable unless the law requires it or we agree in writing.</li>
      </ul>

      <h2>10. Availability and support</h2>
      <p>
        We work to keep {APP.name} running and secure, but we do not promise it will never be interrupted. Connected platforms can be unavailable or change their APIs. Support is available through the
        in-app support desk and at <a href={`mailto:${APP.supportEmail}`}>{APP.supportEmail}</a>.
      </p>

      <h2>11. Ending the service</h2>
      <p>
        You can stop using {APP.name} and close your workspace at any time. We may end these terms if you seriously or repeatedly break them. After closure we delete or anonymise workspace data as described
        in the Privacy Policy, except records the law requires us to keep.
      </p>

      <h2>12. Liability</h2>
      <p>
        {APP.name} is provided “as is” to the extent the law allows. We are not liable for indirect or consequential losses, lost profits, or for actions of connected platforms. Our total liability for any
        claim is limited to the fees you paid us in the 12 months before the claim. Nothing in these terms limits liability that cannot be limited by law.
      </p>

      <h2>13. Law</h2>
      <p>These terms are governed by the laws of India. Disputes will be handled by the courts that have jurisdiction where {APP.vendor} Pvt. Ltd. is registered.</p>

      <h2>14. Changes</h2>
      <p>We will post changes on this page and update the date above. For material changes we will notify account owners in the app or by email before they apply.</p>

      <h2>15. Contact</h2>
      <p>
        {APP.vendor} Pvt. Ltd. · <a href={`mailto:${APP.supportEmail}`}>{APP.supportEmail}</a>
      </p>
    </LegalLayout>
  );
}
