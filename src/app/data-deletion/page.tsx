import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";
import { APP } from "@/config/app";

export const metadata: Metadata = {
  title: "Data Deletion",
  description: `How to ask ${APP.name} to delete your data.`,
  robots: { index: true, follow: true },
};

const UPDATED = "16 November 2026";

export default function DataDeletionPage() {
  return (
    <LegalLayout title="Data Deletion Instructions" updated={UPDATED}>
      <p>
        You can ask {APP.name} to delete the personal information we hold about you. This page explains how, for people who use {APP.name} and for people whose information a business
        stores through {APP.name} (for example after messaging a business on WhatsApp or filling in one of its forms). See also our <a href="/privacy-policy">Privacy Policy</a>.
      </p>

      <h2>If you have a {APP.name} account</h2>
      <ul>
        <li>Company owners can export and delete workspace data from <strong>Settings</strong> in the app.</li>
        <li>
          To delete your own account or any personal information, email <a href={`mailto:${APP.supportEmail}`}>{APP.supportEmail}</a> from the address on the account with the subject
          “Delete my data”.
        </li>
      </ul>

      <h2>If you removed {APP.name} from Facebook, Instagram or Google</h2>
      <p>
        Removing the app in your Facebook, Instagram or Google account settings stops further access. To also delete what we stored from that connection, email us as below and tell us which
        account was connected. We delete the stored access tokens and the data fetched through them.
      </p>

      <h2>If a business stores your information (for example WhatsApp messages or a lead)</h2>
      <p>
        The business decides what it keeps. Please ask the business to delete it, or email <a href={`mailto:${APP.supportEmail}`}>{APP.supportEmail}</a> with the phone number or email address
        you used and the business’s name. We will verify the request and delete the matching records or pass the request to the business. Replying <strong>STOP</strong> to a business’s WhatsApp
        message stops its marketing messages to you.
      </p>

      <h2>What happens next</h2>
      <ul>
        <li>We confirm your request and may ask you to prove it is you.</li>
        <li>We delete or anonymise the information within a reasonable time, normally within 30 days.</li>
        <li>We may keep what the law requires us to keep (for example invoices and security audit records) and backups until they are overwritten.</li>
        <li>We tell you when it is done.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        {APP.vendor} Pvt. Ltd. · <a href={`mailto:${APP.supportEmail}`}>{APP.supportEmail}</a>
      </p>
    </LegalLayout>
  );
}
