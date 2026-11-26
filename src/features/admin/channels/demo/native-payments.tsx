"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/types/api";
import { nativeScopeHeaders } from "./native-api";
import { Badge, Field, Panel } from "./ui";
import { apiClient } from "@/lib/api/client";

/**
 * WhatsApp Payments (India): send an order with a Pay button through the Client's own payment gateway (linked in Meta's
 * WhatsApp Manager), follow its payment, update the customer on the order, and refund. Money never passes through Media360.
 */
interface PaymentRow {
  id: string; referenceId: string; status: "PENDING" | "CAPTURED" | "FAILED"; orderStatus: string; totalMinor: number; refundedMinor: number;
  method: string | null; errorCode: string | null; createdAt: string; capturedAt: string | null; contact: { id: string; name: string; phone: string } | null;
}
interface Settings { gateway: string | null; configurationName: string | null }
interface ContactOption { id: string; name: string; phone: string; consent: boolean; suppressed?: boolean }

const root = "/integrations/whatsapp/v2/payments";
const api = {
  list: (scope: string) => apiClient.request<{ items: PaymentRow[] }>({ method: "GET", path: root, headers: nativeScopeHeaders(scope) }),
  settings: (scope: string) => apiClient.request<Settings>({ method: "GET", path: `${root}/settings`, headers: nativeScopeHeaders(scope) }),
  saveSettings: (scope: string, body: { gateway: string; configurationName: string }) => apiClient.request<Settings>({ method: "PUT", path: `${root}/settings`, body, headers: nativeScopeHeaders(scope) }),
  create: (scope: string, body: unknown) => apiClient.request<PaymentRow>({ method: "POST", path: root, body, headers: nativeScopeHeaders(scope) }),
  status: (scope: string, id: string, body: unknown) => apiClient.request<PaymentRow>({ method: "POST", path: `${root}/${id}/status`, body, headers: nativeScopeHeaders(scope) }),
  refund: (scope: string, id: string, body: unknown) => apiClient.request<PaymentRow>({ method: "POST", path: `${root}/${id}/refund`, body, headers: nativeScopeHeaders(scope) }),
  sync: (scope: string, id: string) => apiClient.request<PaymentRow>({ method: "POST", path: `${root}/${id}/sync`, headers: nativeScopeHeaders(scope) }),
};
const rupees = (minor: number) => `₹${(minor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const toMinor = (value: string) => Math.round(Number(value || "0") * 100);
const message = (error: unknown) => (ApiError.isApiError(error) ? error.message : "Something went wrong. Please try again.");
const NEXT_STATUS = ["processing", "partially_shipped", "shipped", "completed", "canceled"] as const;

function SettingsForm({ scope, settings, onSaved }: { scope: string; settings: Settings | undefined; onSaved: () => void }) {
  const [gateway, setGateway] = useState(settings?.gateway ?? "razorpay");
  const [name, setName] = useState(settings?.configurationName ?? "");
  const save = useMutation({ mutationFn: () => api.saveSettings(scope, { gateway, configurationName: name.trim() }), onSuccess: () => { toast.success("Payment settings saved."); onSaved(); }, onError: (error) => toast.error(message(error)) });
  return (
    <Panel title="Payment Gateway" actions={<Badge>{settings?.configurationName ? "Set Up" : "Not Set Up"}</Badge>}>
      <p className="mb-3 text-xs text-slate-500">Link this Client&apos;s own payment gateway to its WhatsApp account in Meta&apos;s WhatsApp Manager (Payment settings). Meta then shows a configuration name: enter it here. Payments go straight to the Client&apos;s gateway account.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Gateway"><select value={gateway} onChange={(event) => setGateway(event.target.value)} className="h-9 rounded-md border border-slate-200 px-2 text-sm">{["razorpay", "payu", "billdesk", "zaakpay"].map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
        <Field label="Configuration Name (From Meta)"><Input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="e.g. razorpay-main" /></Field>
        <div className="flex items-end"><Button type="button" onClick={() => save.mutate()} disabled={!/^[A-Za-z0-9 _.-]{1,60}$/.test(name.trim()) || save.isPending}>Save</Button></div>
      </div>
    </Panel>
  );
}

function NewOrder({ scope, contacts, onSent }: { scope: string; contacts: ContactOption[]; onSent: () => void }) {
  const [contactId, setContactId] = useState("");
  const [items, setItems] = useState([{ name: "", price: "", quantity: "1" }]);
  const [tax, setTax] = useState("0");
  const [shipping, setShipping] = useState("0");
  const [body, setBody] = useState("Here is your order. Tap the button to review and pay.");
  const [goodsType, setGoodsType] = useState<"digital-goods" | "physical-goods">("digital-goods");
  const [address, setAddress] = useState({ name: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "" });
  const [origin, setOrigin] = useState({ countryOfOrigin: "India", importerName: "", importerAddress: "" });
  const physical = goodsType === "physical-goods";
  const subtotal = items.reduce((sum, item) => sum + toMinor(item.price) * Math.max(0, Math.floor(Number(item.quantity) || 0)), 0);
  const total = subtotal + toMinor(tax) + (physical ? toMinor(shipping) : 0);
  const addressValid = !physical || Boolean(address.name.trim() && address.addressLine1.trim() && address.city.trim() && address.state.trim() && /^\d{6}$/.test(address.postalCode.trim()));
  const originValid = !physical || Boolean(origin.countryOfOrigin.trim() && origin.importerName.trim() && origin.importerAddress.trim());
  const valid = contactId && body.trim() && total > 0 && addressValid && originValid && items.every((item) => item.name.trim() && toMinor(item.price) > 0 && Number(item.quantity) >= 1);
  const send = useMutation({
    mutationFn: () => api.create(scope, {
      contactId, goodsType, body: body.trim(), taxMinor: toMinor(tax),
      ...(physical ? { shippingMinor: toMinor(shipping), beneficiary: { name: address.name.trim(), addressLine1: address.addressLine1.trim(), ...(address.addressLine2.trim() ? { addressLine2: address.addressLine2.trim() } : {}), city: address.city.trim(), state: address.state.trim(), postalCode: address.postalCode.trim() } } : {}),
      items: items.map((item) => ({ name: item.name.trim(), amountMinor: toMinor(item.price), quantity: Math.floor(Number(item.quantity)), ...(physical ? { countryOfOrigin: origin.countryOfOrigin.trim(), importerName: origin.importerName.trim(), importerAddress: origin.importerAddress.trim() } : {}) })),
    }),
    onSuccess: () => { toast.success("Order sent. The customer can now pay inside WhatsApp."); setItems([{ name: "", price: "", quantity: "1" }]); onSent(); },
    onError: (error) => toast.error(message(error)),
  });
  const eligible = contacts.filter((contact) => contact.consent && !contact.suppressed);
  const setAddr = (key: keyof typeof address) => (event: { target: { value: string } }) => setAddress({ ...address, [key]: event.target.value });
  const setOrig = (key: keyof typeof origin) => (event: { target: { value: string } }) => setOrigin({ ...origin, [key]: event.target.value });
  return (
    <Panel title="Send An Order With A Pay Button">
      <p className="mb-3 text-xs text-slate-500">The customer must have messaged this number in the last 24 hours. For goods you deliver, Meta also needs the delivery address and, under Indian rules, the country of origin and the importer (or maker) of the items.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Customer"><select value={contactId} onChange={(event) => setContactId(event.target.value)} className="h-9 rounded-md border border-slate-200 px-2 text-sm"><option value="">Choose a contact…</option>{eligible.map((contact) => <option key={contact.id} value={contact.id}>{contact.name || contact.phone} · {contact.phone}</option>)}</select></Field>
        <Field label="Type"><select value={goodsType} onChange={(event) => setGoodsType(event.target.value as typeof goodsType)} className="h-9 rounded-md border border-slate-200 px-2 text-sm"><option value="digital-goods">Services / digital goods</option><option value="physical-goods">Physical goods (delivered)</option></select></Field>
        <Field label="Message"><Input value={body} onChange={(event) => setBody(event.target.value)} maxLength={1024} /></Field>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_140px_100px_auto]">
            <Input aria-label="Item name" placeholder="Item name" value={item.name} maxLength={60} onChange={(event) => setItems(items.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)))} />
            <Input aria-label="Price in rupees" placeholder="Price (₹)" inputMode="decimal" value={item.price} onChange={(event) => setItems(items.map((row, i) => (i === index ? { ...row, price: event.target.value } : row)))} />
            <Input aria-label="Quantity" placeholder="Qty" inputMode="numeric" value={item.quantity} onChange={(event) => setItems(items.map((row, i) => (i === index ? { ...row, quantity: event.target.value } : row)))} />
            <Button type="button" variant="outline" disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== index))}>Remove</Button>
          </div>
        ))}
        <Button type="button" variant="outline" disabled={items.length >= 50} onClick={() => setItems([...items, { name: "", price: "", quantity: "1" }])}>Add Item</Button>
      </div>
      {physical && (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">Delivery address</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Name"><Input value={address.name} maxLength={200} onChange={setAddr("name")} /></Field>
              <Field label="PIN code"><Input value={address.postalCode} inputMode="numeric" maxLength={6} onChange={setAddr("postalCode")} /></Field>
              <Field label="Address line 1"><Input value={address.addressLine1} maxLength={100} onChange={setAddr("addressLine1")} /></Field>
              <Field label="Address line 2 (optional)"><Input value={address.addressLine2} maxLength={100} onChange={setAddr("addressLine2")} /></Field>
              <Field label="City"><Input value={address.city} maxLength={100} onChange={setAddr("city")} /></Field>
              <Field label="State"><Input value={address.state} maxLength={100} onChange={setAddr("state")} /></Field>
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">Item origin (applies to every item)</p>
            <div className="grid gap-2">
              <Field label="Country of origin"><Input value={origin.countryOfOrigin} maxLength={60} onChange={setOrig("countryOfOrigin")} /></Field>
              <Field label="Importer or maker name"><Input value={origin.importerName} maxLength={120} onChange={setOrig("importerName")} /></Field>
              <Field label="Importer or maker address"><Input value={origin.importerAddress} maxLength={250} onChange={setOrig("importerAddress")} /></Field>
            </div>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Field label="Tax (₹)"><Input inputMode="decimal" value={tax} onChange={(event) => setTax(event.target.value)} className="w-32" /></Field>
          {physical && <Field label="Delivery charge (₹)"><Input inputMode="decimal" value={shipping} onChange={(event) => setShipping(event.target.value)} className="w-32" /></Field>}
        </div>
        <p className="text-sm font-semibold text-slate-900">Total: {rupees(total)}</p>
        <Button type="button" onClick={() => send.mutate()} disabled={!valid || send.isPending}>Send Order</Button>
      </div>
    </Panel>
  );
}

function PaymentActions({ scope, row, onChanged }: { scope: string; row: PaymentRow; onChanged: () => void }) {
  const [next, setNext] = useState<string>("");
  const [refund, setRefund] = useState("");
  const status = useMutation({ mutationFn: () => api.status(scope, row.id, { status: next }), onSuccess: () => { toast.success("The customer was told about the order."); setNext(""); onChanged(); }, onError: (error) => toast.error(message(error)) });
  const refundIt = useMutation({ mutationFn: () => api.refund(scope, row.id, { amountMinor: toMinor(refund) }), onSuccess: () => { toast.success("Refund requested from the payment gateway."); setRefund(""); onChanged(); }, onError: (error) => toast.error(message(error)) });
  const sync = useMutation({ mutationFn: () => api.sync(scope, row.id), onSuccess: () => { toast.success("Status checked with Meta."); onChanged(); }, onError: (error) => toast.error(message(error)) });
  const open = !["completed", "canceled"].includes(row.orderStatus);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {open && <select aria-label="Update order status" value={next} onChange={(event) => setNext(event.target.value)} className="h-8 rounded-md border border-slate-200 px-1 text-xs"><option value="">Update order…</option>{NEXT_STATUS.filter((value) => value !== row.orderStatus && !(value === "canceled" && row.status === "CAPTURED")).map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select>}
      {next && <Button type="button" size="sm" disabled={status.isPending} onClick={() => status.mutate()}>Send</Button>}
      {row.status === "CAPTURED" && row.refundedMinor < row.totalMinor && <><Input aria-label="Refund amount in rupees" placeholder="Refund ₹" inputMode="decimal" value={refund} onChange={(event) => setRefund(event.target.value)} className="h-8 w-24" /><Button type="button" size="sm" variant="outline" disabled={toMinor(refund) <= 0 || toMinor(refund) + row.refundedMinor > row.totalMinor || refundIt.isPending} onClick={() => refundIt.mutate()}>Refund</Button></>}
      <Button type="button" size="sm" variant="outline" disabled={sync.isPending} onClick={() => sync.mutate()}>Check</Button>
    </div>
  );
}

export function NativePayments({ scope, contacts }: { scope: string; contacts: ContactOption[] }) {
  const queryClient = useQueryClient();
  const key = ["whatsapp-payments", scope];
  const settings = useQuery({ queryKey: [...key, "settings"], queryFn: () => api.settings(scope) });
  const list = useQuery({ queryKey: [...key, "list"], queryFn: () => api.list(scope), refetchInterval: 30_000 });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key });
  return (
    <div className="space-y-3">
      <SettingsForm key={settings.data?.configurationName ?? "none"} scope={scope} settings={settings.data} onSaved={refresh} />
      {settings.data?.configurationName && <NewOrder scope={scope} contacts={contacts} onSent={refresh} />}
      <Panel title="Orders" actions={<Badge>{list.data?.items.length ?? 0}</Badge>}>
        {list.isError && <p className="text-xs font-semibold text-red-700">{message(list.error)}</p>}
        {list.data?.items.length === 0 && <p className="text-xs text-slate-500">No orders yet.</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-[11px] uppercase text-slate-500"><tr><th className="py-2">Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Order Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.data?.items.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 align-top">
                  <td className="py-2"><p className="font-mono">{row.referenceId}</p><p className="text-slate-500">{new Date(row.createdAt).toLocaleString("en-IN")}</p></td>
                  <td>{row.contact ? `${row.contact.name || row.contact.phone}` : "—"}</td>
                  <td><p className="font-semibold">{rupees(row.totalMinor)}</p>{row.refundedMinor > 0 && <p className="text-slate-500">Refunded {rupees(row.refundedMinor)}</p>}</td>
                  <td><span className={row.status === "CAPTURED" ? "font-semibold text-emerald-700" : row.status === "FAILED" ? "font-semibold text-red-700" : "text-slate-600"}>{row.status === "CAPTURED" ? "Paid" : row.status === "FAILED" ? "Last attempt failed" : "Waiting for payment"}</span>{row.method && <p className="text-slate-500">{row.method.toUpperCase()}</p>}{row.errorCode && row.status === "FAILED" && <p className="text-red-700">{row.errorCode}</p>}</td>
                  <td>{row.orderStatus.replace("_", " ")}</td>
                  <td><PaymentActions scope={scope} row={row} onChanged={refresh} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
