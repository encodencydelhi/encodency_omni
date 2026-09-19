"use client";

import { useState, type ReactNode } from "react";
import { Building, UserRound } from "lucide-react";
import { toast } from "sonner";
import { CONTACT_KIND_LABEL } from "../../billing-data/config";
import { useBillingView } from "../../billing-data/hooks";
import { EMAIL_RE, GSTIN_RE, PAN_RE, PHONE_RE, PIN_RE } from "../../billing-data/selectors";
import type { BillingContact, BillingProfile, ContactKind } from "../../billing-data/types";
import { useBilling } from "../../store/billing-store";
import { FlowError, FlowShell } from "../flow-shell";
import { Button, FormField, SelectMenu, Segmented, x } from "../ui";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
// GST state codes for the states above; the first two digits of a GSTIN.
const GST_STATE_CODE: Record<string, string> = {
  "Andhra Pradesh": "37", "Arunachal Pradesh": "12", Assam: "18", Bihar: "10", Chhattisgarh: "22", Delhi: "07", Goa: "30", Gujarat: "24", Haryana: "06", "Himachal Pradesh": "02",
  Jharkhand: "20", Karnataka: "29", Kerala: "32", "Madhya Pradesh": "23", Maharashtra: "27", Manipur: "14", Meghalaya: "17", Mizoram: "15", Nagaland: "13", Odisha: "21",
  Punjab: "03", Rajasthan: "08", Sikkim: "11", "Tamil Nadu": "33", Telangana: "36", Tripura: "16", "Uttar Pradesh": "09", Uttarakhand: "05", "West Bengal": "19",
};
const COUNTRIES = ["India", "United Arab Emirates", "Singapore", "United Kingdom", "United States"];

type ProfileErrors = Partial<Record<keyof BillingProfile, string>>;

function validateProfile(profile: BillingProfile): ProfileErrors {
  const errors: ProfileErrors = {};
  const india = profile.country === "India";
  if (profile.legalName.trim().length < 2) errors.legalName = "Enter the registered business name.";
  if (!EMAIL_RE.test(profile.billingEmail.trim())) errors.billingEmail = "Enter a valid email address.";
  if (profile.billingPhone && !PHONE_RE.test(profile.billingPhone.trim())) errors.billingPhone = "Enter a valid phone number.";
  if (!profile.addressLine1.trim()) errors.addressLine1 = "Enter the street address.";
  if (!profile.city.trim()) errors.city = "Enter the city.";
  if (!profile.state.trim()) errors.state = india ? "Choose the state." : "Enter the state or region.";
  if (india ? !PIN_RE.test(profile.postalCode.trim()) : !profile.postalCode.trim()) errors.postalCode = india ? "PIN codes are 6 digits." : "Enter the postal code.";
  const gstin = profile.gstin.trim().toUpperCase();
  if (gstin) {
    if (!GSTIN_RE.test(gstin)) errors.gstin = "GSTIN is 15 characters, e.g. 05AABTN1234F1Z5.";
    else if (india && GST_STATE_CODE[profile.state] && gstin.slice(0, 2) !== GST_STATE_CODE[profile.state]) errors.gstin = `This GSTIN is registered in another state. ${profile.state} GSTINs start with ${GST_STATE_CODE[profile.state]}.`;
  }
  const pan = profile.pan.trim().toUpperCase();
  if (pan && !PAN_RE.test(pan)) errors.pan = "PAN is 10 characters, e.g. AABTN1234F.";
  else if (pan && gstin && GSTIN_RE.test(gstin) && gstin.slice(2, 12) !== pan) errors.pan = "Doesn't match the PAN inside your GSTIN.";
  return errors;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 border-b border-[#EEF1F5] pb-4 last:border-0">
      <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7890]">{title}</legend>
      {children}
    </fieldset>
  );
}

export function DetailsSheet() {
  const { snapshot } = useBillingView();
  const { closeFlow, actions } = useBilling();
  const [draft, setDraft] = useState<BillingProfile>(snapshot.profile);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof BillingProfile, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = validateProfile(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(snapshot.profile);
  const show = (key: keyof BillingProfile) => (submitted || touched[key] ? errors[key] : undefined);
  const india = draft.country === "India";

  const set = <K extends keyof BillingProfile>(key: K, value: BillingProfile[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const blur = (key: keyof BillingProfile) => () => setTouched((current) => ({ ...current, [key]: true }));
  const input = (key: keyof BillingProfile, props: { placeholder?: string; upper?: boolean; autoComplete?: string; inputMode?: "numeric" | "email" | "tel" } = {}) => (
    <input
      id={`bd-${key}`}
      className={`${x.input}${props.upper ? " uppercase tracking-[0.03em]" : ""}`}
      value={draft[key]}
      placeholder={props.placeholder}
      autoComplete={props.autoComplete}
      inputMode={props.inputMode}
      aria-invalid={Boolean(show(key))}
      onChange={(event) => set(key, props.upper ? event.target.value.toUpperCase() : event.target.value)}
      onBlur={blur(key)}
    />
  );

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) {
      setError("Fix the highlighted fields before saving.");
      return false;
    }
    setBusy(true);
    setError(null);
    const result = await actions.saveProfile({ ...draft, gstin: draft.gstin.trim().toUpperCase(), pan: draft.pan.trim().toUpperCase(), legalName: draft.legalName.trim() });
    setBusy(false);
    if (!result.ok) {
      setError(`${result.message} ${result.hint}`);
      return false;
    }
    toast.success("Billing details saved", { description: "They'll appear on your next invoice." });
    closeFlow();
    return true;
  };

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      variant="sheet"
      width={560}
      icon={Building}
      title="Edit billing details"
      description="Printed on every invoice and receipt from now on. Past invoices keep the details they were issued with."
      locked={busy}
      dirty={dirty}
      guard={{ label: "billing details", onSave: save }}
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={closeFlow} disabled={busy}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!dirty} disabledReason="No changes to save." onClick={save}>Save billing details</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <FlowError message="Couldn't save billing details" hint={error} />}
        <Group title="Business">
          <FormField label="Legal business name" htmlFor="bd-legalName" error={show("legalName")} hint="As registered for tax." required>
            {input("legalName", { autoComplete: "organization" })}
          </FormField>
        </Group>
        <Group title="Contact">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Billing email" htmlFor="bd-billingEmail" error={show("billingEmail")} required>
              {input("billingEmail", { autoComplete: "email", inputMode: "email" })}
            </FormField>
            <FormField label="Billing phone" htmlFor="bd-billingPhone" error={show("billingPhone")}>
              {input("billingPhone", { autoComplete: "tel", inputMode: "tel" })}
            </FormField>
          </div>
        </Group>
        <Group title="Address">
          <FormField label="Address line 1" htmlFor="bd-addressLine1" error={show("addressLine1")} required>
            {input("addressLine1", { autoComplete: "address-line1" })}
          </FormField>
          <FormField label="Address line 2" htmlFor="bd-addressLine2">
            {input("addressLine2", { autoComplete: "address-line2" })}
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="City" htmlFor="bd-city" error={show("city")} required>
              {input("city", { autoComplete: "address-level2" })}
            </FormField>
            <FormField label="State" htmlFor="bd-state" error={show("state")} required>
              {india ? (
                <SelectMenu label="State" size="md" fullWidth value={draft.state} placeholder="Choose state" onChange={(value) => set("state", value)} options={INDIAN_STATES.map((state) => ({ value: state, label: state }))} />
              ) : (
                input("state", { autoComplete: "address-level1" })
              )}
            </FormField>
            <FormField label="Country" htmlFor="bd-country" required>
              <SelectMenu label="Country" size="md" fullWidth value={draft.country} onChange={(value) => setDraft((current) => ({ ...current, country: value, state: value === "India" && !INDIAN_STATES.includes(current.state) ? "" : current.state }))} options={COUNTRIES.map((country) => ({ value: country, label: country }))} />
            </FormField>
            <FormField label={india ? "PIN code" : "Postal code"} htmlFor="bd-postalCode" error={show("postalCode")} required>
              {input("postalCode", { autoComplete: "postal-code", inputMode: india ? "numeric" : undefined })}
            </FormField>
          </div>
        </Group>
        <Group title="Tax information">
          {india ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="GSTIN" htmlFor="bd-gstin" error={show("gstin")} hint="Optional. Needed to claim input tax credit.">
                {input("gstin", { upper: true, placeholder: "05AABTN1234F1Z5" })}
              </FormField>
              <FormField label="PAN" htmlFor="bd-pan" error={show("pan")} hint="Optional.">
                {input("pan", { upper: true, placeholder: "AABTN1234F" })}
              </FormField>
            </div>
          ) : (
            <FormField label="Tax ID" htmlFor="bd-taxId" hint="VAT, TRN or EIN, if you have one.">
              {input("taxId")}
            </FormField>
          )}
          <p className="text-[11.5px] text-[#6B7890]">GST is applied by OmniPlatform at the rate that applies to your organization. It can&apos;t be changed here.</p>
        </Group>
      </div>
    </FlowShell>
  );
}

/* ------------------------------------------------------------------ */

type ContactErrors = Partial<Record<"name" | "email" | "phone" | "role", string>>;

export function ContactSheet({ contactId }: { contactId: string | null }) {
  const { snapshot } = useBillingView();
  const { closeFlow, actions } = useBilling();
  const existing = snapshot.contacts.find((contact) => contact.id === contactId) ?? null;
  const initial: BillingContact = existing ?? { id: "", kind: snapshot.contacts.some((contact) => contact.kind === "primary") ? "finance" : "primary", name: "", email: "", phone: "", role: "" };
  const [draft, setDraft] = useState<BillingContact>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const errors: ContactErrors = {};
  if (draft.name.trim().length < 2) errors.name = "Enter their full name.";
  if (!EMAIL_RE.test(draft.email.trim())) errors.email = "Enter a valid email address.";
  else if (snapshot.contacts.some((contact) => contact.id !== draft.id && contact.email.toLowerCase() === draft.email.trim().toLowerCase())) errors.email = "That email is already a billing contact.";
  if (draft.phone && !PHONE_RE.test(draft.phone.trim())) errors.phone = "Enter a valid phone number.";
  if (!draft.role.trim()) errors.role = "Add their role, e.g. Finance Manager.";
  const show = (key: keyof ContactErrors) => (submitted ? errors[key] : undefined);
  const currentPrimary = snapshot.contacts.find((contact) => contact.kind === "primary" && contact.id !== draft.id);

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return false;
    setBusy(true);
    setError(null);
    const result = await actions.saveContact({ ...draft, name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim(), role: draft.role.trim() });
    setBusy(false);
    if (!result.ok) {
      setError(`${result.message} ${result.hint}`);
      return false;
    }
    toast.success(existing ? `${draft.name.trim()} updated` : `${draft.name.trim()} added as ${CONTACT_KIND_LABEL[draft.kind].toLowerCase()}`);
    closeFlow();
    return true;
  };

  const field = (key: "name" | "email" | "phone" | "role", label: string, required = true, autoComplete?: string) => (
    <FormField label={label} htmlFor={`ct-${key}`} error={show(key)} required={required}>
      <input id={`ct-${key}`} className={x.input} autoComplete={autoComplete} value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />
    </FormField>
  );

  return (
    <FlowShell
      open
      onOpenChange={(open) => !open && closeFlow()}
      variant="sheet"
      width={480}
      icon={UserRound}
      title={existing ? `Edit ${existing.name}` : "Add billing contact"}
      description="Billing contacts receive invoices, receipts and payment alerts by email."
      locked={busy}
      dirty={dirty}
      guard={{ label: existing ? "this contact" : "the new contact", onSave: save }}
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={closeFlow} disabled={busy}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!dirty} disabledReason="No changes to save." onClick={save}>{existing ? "Save contact" : "Add contact"}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <FlowError message="Couldn't save the contact" hint={error} />}
        {field("name", "Full name", true, "name")}
        {field("email", "Email", true, "email")}
        <div className="grid gap-3 sm:grid-cols-2">
          {field("phone", "Phone", false, "tel")}
          {field("role", "Role")}
        </div>
        <FormField label="Contact type" hint={draft.kind === "primary" && currentPrimary ? `${currentPrimary.name} will become a regular billing contact.` : undefined}>
          <Segmented<ContactKind>
            label="Contact type"
            value={draft.kind}
            onChange={(kind) => setDraft((current) => ({ ...current, kind }))}
            items={[
              { value: "primary", label: "Primary" },
              { value: "finance", label: "Finance" },
              { value: "other", label: "Other" },
            ]}
          />
        </FormField>
      </div>
    </FlowShell>
  );
}
