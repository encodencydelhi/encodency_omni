"use client";

import { useState } from "react";
import { CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import { useBilling } from "../../store/billing-store";
import { FlowShell, useFlowClose } from "../flow-shell";
import { Button, FormField } from "../ui";

export function PaymentFlow() {
  const { flow, closeFlow } = useBilling();
  const open = flow?.kind === "payment";
  const role = open ? flow.role : "primary";

  if (!open) return null;

  return (
    <FlowShell
      open={open}
      onOpenChange={(v) => !v && closeFlow()}
      title={role === "primary" ? "Update primary payment method" : "Add backup payment method"}
      description="All future invoices and automated charges will use this card."
      icon={CreditCard}
      width={480}
    >
      <PaymentForm role={role} />
    </FlowShell>
  );
}

function PaymentForm({ role }: { role: "primary" | "backup" }) {
  const { actions } = useBilling();
  const close = useFlowClose();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const dirty = name.trim() !== "" || number.trim() !== "" || expiry.trim() !== "" || cvc.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const [expMonth, expYear] = (expiry || "01/25").split("/").map(Number);
    const res = await actions.savePaymentMethod(
      {
        type: "card",
        holderName: name,
        cardNumber: number,
        expMonth,
        expYear,
      },
      role
    );
    setSaving(false);
    
    if (res.ok) {
      toast.success("Payment method saved successfully");
      close();
    } else {
      toast.error(res.message, { description: res.hint });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5">
      <div className="space-y-4">
        <FormField label="Cardholder Name">
          <input
            required
            autoFocus
            className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Name on card"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="Card Number">
          <div className="relative">
            <CreditCard className="absolute left-3 top-2.5 size-4 text-[#8A99AE]" />
            <input
              required
              className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="0000 0000 0000 0000"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </div>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Expiry Date">
            <input
              required
              className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </FormField>
          <FormField label="CVC">
            <input
              required
              className="flex h-9 w-full rounded-sm border border-[#DCE2EA] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="123"
              type="password"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
            />
          </FormField>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-[#EEF1F5] pt-5">
        <div className="flex items-center gap-1.5 text-[11px] text-[#6B7890]">
          <Lock className="size-3" />
          <span>Secured by Stripe</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving} disabled={!dirty || saving}>
            Save Card
          </Button>
        </div>
      </div>
    </form>
  );
}
