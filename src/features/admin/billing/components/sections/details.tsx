"use client";

import { useState } from "react";
import { Building, Mail, MoreHorizontal, Pencil, Phone, Plus, Star, Trash2, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { CONTACT_KIND_LABEL } from "../../billing-data/config";
import { useBillingView } from "../../billing-data/hooks";
import type { BillingContact } from "../../billing-data/types";
import { useBilling } from "../../store/billing-store";
import { ActionMenu, Badge, Button, ConfirmDialog, EmptyState, Section, SectionHeader, buttonClass } from "../ui";

export function BillingDetailsCard() {
  const { snapshot } = useBillingView();
  const { gates, openFlow } = useBilling();
  const { profile } = snapshot;
  const address = [profile.addressLine1, profile.addressLine2].filter(Boolean).join(", ");

  const rows: [string, string, boolean?][] = [
    ["Legal business name", profile.legalName],
    ["Billing email", profile.billingEmail],
    ["Billing phone", profile.billingPhone],
    ["Address", address],
    ["City", profile.city],
    ["State", profile.state],
    ["Country", profile.country],
    ["PIN code", profile.postalCode, true],
    ["GSTIN", profile.gstin, true],
    ["PAN", profile.pan, true],
  ];
  if (profile.taxId || profile.country !== "India") rows.push(["Tax ID", profile.taxId, true]);

  return (
    <Section id="billing-details" className="flex h-full flex-col">
      <SectionHeader
        id="billing-details"
        icon={Building}
        title="Billing details"
        description="Printed on every invoice and receipt"
        actions={
          <Button size="sm" variant="secondary" icon={Pencil} gate={gates?.editDetails} onClick={() => openFlow({ kind: "details" })}>
            Edit billing details
          </Button>
        }
      />
      <dl className="grid grid-cols-1 gap-x-6 border-t border-[#EEF1F5] px-4 py-2 sm:grid-cols-2">
        {rows.map(([label, value, mono]) => (
          <div key={label} className={cn("flex min-w-0 items-baseline justify-between gap-3 border-b border-[#F1F4F8] py-2 sm:block sm:border-0 sm:py-1.5", label === "Address" && "sm:col-span-2")}>
            <dt className="shrink-0 text-[11.5px] text-[#6B7890]">{label}</dt>
            <dd className={cn("min-w-0 break-words text-right text-[12.5px] font-medium text-[#0F1B3D] sm:text-left", mono && "tabular-nums tracking-[0.02em]", !value && "font-normal text-[#98A2B3]")}>
              {value || (label === "GSTIN" ? "Not added — invoices won't show a GSTIN" : "Not added")}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

export function ContactsCard() {
  const { snapshot } = useBillingView();
  const { gates, openFlow } = useBilling();
  const contacts = snapshot.contacts;

  return (
    <Section id="billing-contacts" className="flex h-full flex-col">
      <SectionHeader
        id="billing-contacts"
        icon={UsersRound}
        title="Billing contacts"
        description="Receive invoices, receipts and payment alerts"
        actions={
          contacts.length > 0 && (
            <Button size="sm" variant="secondary" icon={Plus} gate={gates?.editDetails} onClick={() => openFlow({ kind: "contact", contactId: null })}>
              Add contact
            </Button>
          )
        }
      />
      {contacts.length === 0 ? (
        <EmptyState
          compact
          icon={UserRound}
          title="No billing contact"
          description="Invoices and payment alerts only go to the billing email until you add someone."
          action={
            <Button size="sm" variant="primary" icon={Plus} gate={gates?.editDetails} onClick={() => openFlow({ kind: "contact", contactId: null })}>
              Add contact
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-[#EEF1F5] border-t border-[#EEF1F5]">
          {contacts.map((contact) => (
            <ContactRow key={contact.id} contact={contact} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function ContactRow({ contact }: { contact: BillingContact }) {
  const { snapshot } = useBillingView();
  const { gates, openFlow, actions } = useBilling();
  const [confirm, setConfirm] = useState(false);
  const initials = contact.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const successor = contact.kind === "primary" ? snapshot.contacts.find((item) => item.id !== contact.id) : null;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[11.5px] font-bold", contact.kind === "primary" ? "bg-[#EFF4FF] text-[#1D4ED8]" : "bg-[#F3F5F9] text-[#475467]")}>{initials}</span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-[#0F1B3D]">
          {contact.name}
          <Badge tone={contact.kind === "primary" ? "blue" : contact.kind === "finance" ? "violet" : "neutral"}>{contact.kind === "primary" ? "Primary" : contact.kind === "finance" ? "Finance" : "Contact"}</Badge>
        </p>
        <p className="text-[12px] text-[#6B7890]">{contact.role}</p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-[#3C4A66]">
          <span className="inline-flex min-w-0 items-center gap-1">
            <Mail className="size-3 shrink-0 text-[#98A2B3]" />
            <span className="truncate">{contact.email}</span>
          </span>
          {contact.phone && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Phone className="size-3 text-[#98A2B3]" />
              {contact.phone}
            </span>
          )}
        </p>
      </div>
      <ActionMenu
        label={`Actions for ${contact.name}`}
        width={200}
        trigger={
          <button type="button" className={buttonClass("ghost", "iconSm")} aria-label={`Actions for ${contact.name}`}>
            <MoreHorizontal className="size-4" />
          </button>
        }
        items={[
          { label: "Edit", icon: Pencil, onSelect: () => openFlow({ kind: "contact", contactId: contact.id }), gate: gates?.editDetails },
          {
            label: "Make primary",
            icon: Star,
            hidden: contact.kind === "primary",
            gate: gates?.editDetails,
            onSelect: async () => {
              const result = await actions.saveContact({ ...contact, kind: "primary" });
              if (result.ok) toast.success(`${contact.name} is now the primary billing contact`);
              else toast.error(result.message, { description: result.hint });
            },
          },
          "separator",
          { label: "Remove", icon: Trash2, danger: true, onSelect: () => setConfirm(true), gate: gates?.editDetails },
        ]}
      />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Remove ${contact.name}?`}
        description={`They'll stop receiving invoices, receipts and payment alerts as ${CONTACT_KIND_LABEL[contact.kind].toLowerCase()}.${
          successor ? ` ${successor.name} becomes the primary billing contact.` : contact.kind === "primary" ? " You'll have no billing contact; alerts go only to the billing email." : ""
        }`}
        confirmLabel="Remove contact"
        onConfirm={async () => {
          const result = await actions.removeContact(contact.id);
          if (!result.ok) {
            toast.error(result.message, { description: result.hint });
            return false;
          }
          toast.success(`${contact.name} removed from billing contacts`);
        }}
      />
    </li>
  );
}
