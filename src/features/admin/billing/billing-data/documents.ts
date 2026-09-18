
import { BILLING_MOCK_MODE, CYCLE_LABEL, INVOICE_STATUS_META, LIMIT_META, SUBSCRIPTION_STATUS_META } from "./config";
import {
  formatLimit,
  formatUsed,
  hasReceipt,
  invoicePeriod,
  longDate,
  methodLabel,
  nextPayment,
  planById,
  primaryMethod,
  shortDate,
  usageRows,
} from "./selectors";
import type { BillingSnapshot, Invoice } from "./types";

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;

const WIDTHS: Record<string, number> = {
  " ": 278, ".": 278, ",": 278, ":": 278, "-": 333, "/": 278, "(": 333, ")": 333, "%": 889, "*": 389, "#": 556, "+": 584, "@": 1015, "&": 667, "'": 191,
  I: 278, J: 500, M: 833, W: 944, m: 833, w: 722, i: 222, j: 222, l: 222, f: 278, t: 278, r: 333,
};
const BOLD_BONUS = 1.06;

function textWidth(text: string, size: number, bold = false) {
  let width = 0;
  for (const char of text) width += WIDTHS[char] ?? (/[A-Z]/.test(char) ? 667 : /[a-z]/.test(char) ? 530 : 556);
  return (width / 1000) * size * (bold ? BOLD_BONUS : 1);
}

function ascii(text: string) {
  return text
    .replace(/₹/g, "Rs. ")
    .replace(/[–—]/g, "-")
    .replace(/[•·]/g, "*")
    .replace(/×/g, "x")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "");
}

const escapePdf = (text: string) => text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

type Rgb = [number, number, number];
const INK: Rgb = [0.06, 0.106, 0.239];
const BODY: Rgb = [0.235, 0.29, 0.4];
const MUTED: Rgb = [0.42, 0.47, 0.565];
const RULE: Rgb = [0.894, 0.914, 0.941];
const ACCENT: Rgb = [0.145, 0.388, 0.922];

interface TextOptions {
  size?: number;
  bold?: boolean;
  color?: Rgb;
  align?: "left" | "right";
}

class PdfDocument {
  private pages: string[][] = [[]];
  y = PAGE_H - MARGIN;

  private get ops() {
    return this.pages[this.pages.length - 1]!;
  }

  text(value: string, x: number, options: TextOptions = {}, y = this.y) {
    const { size = 10, bold = false, color = BODY, align = "left" } = options;
    const clean = ascii(value);
    const left = align === "right" ? x - textWidth(clean, size, bold) : x;
    this.ops.push(`BT ${color.join(" ")} rg /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${left.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdf(clean)}) Tj ET`);
  }

  /** Wraps to `width`, advancing `y`. */
  paragraph(value: string, x: number, width: number, options: TextOptions = {}) {
    const size = options.size ?? 10;
    const words = ascii(value).split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, size, options.bold) > width && line) {
        this.text(line, x, options);
        this.y -= size * 1.4;
        line = word;
      } else line = next;
    }
    if (line) {
      this.text(line, x, options);
      this.y -= size * 1.4;
    }
  }

  rule(y = this.y, color: Rgb = RULE, from = MARGIN, to = PAGE_W - MARGIN) {
    this.ops.push(`${color.join(" ")} RG 0.75 w ${from} ${y.toFixed(2)} m ${to} ${y.toFixed(2)} l S`);
  }

  fill(x: number, y: number, w: number, h: number, color: Rgb) {
    this.ops.push(`${color.join(" ")} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }

  /** Starts a new page when fewer than `needed` points remain. */
  ensure(needed: number) {
    if (this.y - needed > MARGIN + 30) return;
    this.pages.push([]);
    this.y = PAGE_H - MARGIN;
  }

  build(footer: string): Uint8Array {
    const objects: string[] = [];
    const add = (body: string) => {
      objects.push(body);
      return objects.length;
    };
    add("<< /Type /Catalog /Pages 2 0 R >>");
    add(""); // pages, filled below
    const regular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const bold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const pageIds: number[] = [];
    this.pages.forEach((ops, index) => {
      const footerOps = [
        `${RULE.join(" ")} RG 0.75 w ${MARGIN} 40 m ${PAGE_W - MARGIN} 40 l S`,
        `BT ${MUTED.join(" ")} rg /F1 8 Tf 1 0 0 1 ${MARGIN} 28 Tm (${escapePdf(ascii(footer))}) Tj ET`,
        `BT ${MUTED.join(" ")} rg /F1 8 Tf 1 0 0 1 ${(PAGE_W - MARGIN - textWidth(`Page ${index + 1} of ${this.pages.length}`, 8)).toFixed(2)} 28 Tm (Page ${index + 1} of ${this.pages.length}) Tj ET`,
      ];
      const stream = [...ops, ...footerOps].join("\n");
      const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      pageIds.push(
        add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${content} 0 R >>`),
      );
    });
    objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    objects.forEach((body, index) => {
      offsets.push(out.length);
      out += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((offset) => {
      out += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new TextEncoder().encode(out);
  }
}

/* ------------------------------------------------------------------ */
/* Shared blocks                                                       */
/* ------------------------------------------------------------------ */

const RIGHT = PAGE_W - MARGIN;
const pdfMoney = (amount: number) => {
  const value = Math.round(amount * 100) / 100;
  const formatted = Math.abs(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value < 0 ? "-" : ""}Rs. ${formatted}`;
};

const FOOTER = BILLING_MOCK_MODE
  ? "Sample document generated in OmniPlatform mock mode. Not a valid tax invoice."
  : "Computer-generated document. No signature required.";

function letterhead(doc: PdfDocument, title: string, subtitle: string) {
  doc.fill(MARGIN, doc.y - 4, 4, 22, ACCENT);
  doc.text("OmniPlatform", MARGIN + 12, { size: 15, bold: true, color: INK }, doc.y + 2);
  doc.text("EnCodency Pvt. Ltd.", MARGIN + 12, { size: 8.5, color: MUTED }, doc.y - 11);
  doc.text(title, RIGHT, { size: 15, bold: true, color: INK, align: "right" }, doc.y + 2);
  doc.text(subtitle, RIGHT, { size: 9, color: MUTED, align: "right" }, doc.y - 11);
  doc.y -= 36;
  doc.rule();
  doc.y -= 22;
}

function billTo(doc: PdfDocument, snapshot: BillingSnapshot, x: number) {
  const { profile } = snapshot;
  const top = doc.y;
  doc.text("BILLED TO", x, { size: 7.5, bold: true, color: MUTED });
  doc.y -= 14;
  doc.text(profile.legalName, x, { size: 10.5, bold: true, color: INK });
  doc.y -= 13;
  [
    profile.addressLine1,
    profile.addressLine2,
    `${profile.city}, ${profile.state} ${profile.postalCode}`,
    profile.country,
    profile.gstin ? `GSTIN: ${profile.gstin}` : "",
    profile.pan ? `PAN: ${profile.pan}` : "",
    profile.taxId ? `Tax ID: ${profile.taxId}` : "",
    profile.billingEmail,
  ]
    .filter(Boolean)
    .forEach((line) => {
      doc.text(line, x, { size: 9 });
      doc.y -= 12;
    });
  return top - doc.y;
}

function facts(doc: PdfDocument, rows: [string, string][], x: number, top: number) {
  let y = top;
  rows.forEach(([label, value]) => {
    doc.text(label, x, { size: 9, color: MUTED }, y);
    doc.text(value, RIGHT, { size: 9, bold: true, color: INK, align: "right" }, y);
    y -= 14;
  });
  return top - y;
}

function tableHeader(doc: PdfDocument, columns: { label: string; x: number; align?: "left" | "right" }[]) {
  doc.fill(MARGIN, doc.y - 6, PAGE_W - MARGIN * 2, 20, [0.973, 0.98, 0.988]);
  columns.forEach((column) => doc.text(column.label.toUpperCase(), column.x, { size: 7.5, bold: true, color: MUTED, align: column.align }, doc.y));
  doc.y -= 22;
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export function invoicePdf(invoice: Invoice, snapshot: BillingSnapshot): Uint8Array {
  const doc = new PdfDocument();
  letterhead(doc, "Tax invoice", invoice.number);

  const top = doc.y;
  const used = billTo(doc, snapshot, MARGIN);
  const factsHeight = facts(
    doc,
    [
      ["Invoice number", invoice.number],
      ["Issue date", shortDate(invoice.issuedAt)],
      ["Due date", shortDate(invoice.dueAt)],
      ["Billing period", invoicePeriod(invoice)],
      ["Status", INVOICE_STATUS_META[invoice.status].label],
    ],
    330,
    top,
  );
  doc.y = top - Math.max(used, factsHeight) - 18;

  tableHeader(doc, [
    { label: "Description", x: MARGIN + 8 },
    { label: "Qty", x: 400, align: "right" },
    { label: "Amount", x: RIGHT - 8, align: "right" },
  ]);
  invoice.lines.forEach((line) => {
    doc.ensure(24);
    const start = doc.y;
    doc.paragraph(line.description, MARGIN + 8, 300, { size: 9.5, color: INK });
    doc.text(String(line.quantity), 400, { size: 9.5, align: "right" }, start);
    doc.text(pdfMoney(line.amount), RIGHT - 8, { size: 9.5, align: "right", color: INK }, start);
    doc.y -= 4;
    doc.rule(doc.y + 8);
  });

  doc.y -= 8;
  const totals: [string, string, boolean][] = [
    ["Subtotal", pdfMoney(invoice.subtotal), false],
    [`GST (${Math.round(invoice.taxRate * 100)}%)`, pdfMoney(invoice.tax), false],
    ["Total", pdfMoney(invoice.total), true],
  ];
  totals.forEach(([label, value, strong]) => {
    doc.ensure(18);
    if (strong) doc.rule(doc.y + 10, RULE, 330);
    doc.text(label, 340, { size: strong ? 11 : 9.5, bold: strong, color: strong ? INK : MUTED });
    doc.text(value, RIGHT - 8, { size: strong ? 11 : 9.5, bold: strong, color: INK, align: "right" });
    doc.y -= strong ? 20 : 15;
  });

  doc.y -= 8;
  doc.ensure(90);
  doc.text("PAYMENT", MARGIN, { size: 7.5, bold: true, color: MUTED });
  doc.y -= 14;
  const payment: [string, string][] = [
    ["Paid on", invoice.paidAt ? shortDate(invoice.paidAt) : "Not paid"],
    ["Method", invoice.paymentMethodLabel ?? "-"],
    ["Transaction ID", invoice.transactionId ?? "-"],
  ];
  if (invoice.refundedAt) payment.push(["Refunded on", shortDate(invoice.refundedAt)]);
  payment.forEach(([label, value]) => {
    doc.text(label, MARGIN, { size: 9, color: MUTED });
    doc.text(value, MARGIN + 110, { size: 9, color: INK });
    doc.y -= 13;
  });
  if (invoice.note) {
    doc.y -= 8;
    doc.paragraph(`Note: ${invoice.note}`, MARGIN, PAGE_W - MARGIN * 2, { size: 9, color: MUTED });
  }
  return doc.build(FOOTER);
}

export function receiptPdf(invoice: Invoice, snapshot: BillingSnapshot): Uint8Array {
  if (!hasReceipt(invoice)) throw new Error("Receipts exist only for paid invoices.");
  const doc = new PdfDocument();
  letterhead(doc, "Payment receipt", `For ${invoice.number}`);

  doc.text("AMOUNT PAID", MARGIN, { size: 7.5, bold: true, color: MUTED });
  doc.y -= 26;
  doc.text(pdfMoney(invoice.total), MARGIN, { size: 24, bold: true, color: INK });
  doc.y -= 16;
  doc.text(`Paid on ${longDate(invoice.paidAt ?? invoice.issuedAt)} by ${invoice.paymentMethodLabel ?? "-"}`, MARGIN, { size: 9.5 });
  doc.y -= 30;

  const top = doc.y;
  const used = billTo(doc, snapshot, MARGIN);
  const factsHeight = facts(
    doc,
    [
      ["Receipt for", invoice.number],
      ["Transaction ID", invoice.transactionId ?? "-"],
      ["Billing period", invoicePeriod(invoice)],
      ["Subtotal", pdfMoney(invoice.subtotal)],
      [`GST (${Math.round(invoice.taxRate * 100)}%)`, pdfMoney(invoice.tax)],
      ["Total paid", pdfMoney(invoice.total)],
    ],
    300,
    top,
  );
  doc.y = top - Math.max(used, factsHeight) - 18;
  if (invoice.refundedAt) {
    doc.rule();
    doc.y -= 18;
    doc.text(`Refunded in full on ${longDate(invoice.refundedAt)} to ${invoice.paymentMethodLabel ?? "the original method"}.`, MARGIN, { size: 10, bold: true, color: INK });
    doc.y -= 14;
  }
  return doc.build(FOOTER);
}

export function summaryPdf(snapshot: BillingSnapshot, generatedAt: Date): Uint8Array {
  const doc = new PdfDocument();
  const { subscription } = snapshot;
  const plan = planById(snapshot.plans, subscription.planId);
  const next = nextPayment(snapshot);
  letterhead(doc, "Billing summary", `${snapshot.organizationName} * ${longDate(generatedAt.toISOString())}`);

  const top = doc.y;
  doc.text("SUBSCRIPTION", MARGIN, { size: 7.5, bold: true, color: MUTED });
  doc.y -= 16;
  doc.text(`${plan.name} plan`, MARGIN, { size: 16, bold: true, color: INK });
  doc.y -= 15;
  doc.text(`${SUBSCRIPTION_STATUS_META[subscription.status].label} * ${CYCLE_LABEL[subscription.cycle]} billing`, MARGIN, { size: 9.5 });
  doc.y -= 14;
  facts(
    doc,
    [
      [subscription.status === "trialing" ? "Trial ends" : subscription.status === "scheduled_cancellation" ? "Cancels on" : "Renews on", longDate(subscription.cancelAt ?? subscription.trialEndsAt ?? subscription.currentPeriodEnd)],
      ["Next payment", next.breakdown && next.state !== "none" ? pdfMoney(next.breakdown.total) : next.headline],
      ["Payment method", methodLabel(primaryMethod(snapshot.paymentMethods))],
      ["Billing email", snapshot.profile.billingEmail],
    ],
    300,
    top,
  );
  doc.y = Math.min(doc.y, top - 70) - 16;

  doc.text("USAGE THIS PERIOD", MARGIN, { size: 7.5, bold: true, color: MUTED });
  doc.y -= 16;
  tableHeader(doc, [
    { label: "Limit", x: MARGIN + 8 },
    { label: "Used", x: 360, align: "right" },
    { label: "Included", x: 450, align: "right" },
    { label: "Share", x: RIGHT - 8, align: "right" },
  ]);
  usageRows(snapshot).forEach((row) => {
    doc.ensure(18);
    doc.text(LIMIT_META[row.key].label, MARGIN + 8, { size: 9.5, color: INK });
    doc.text(formatUsed(row.key, row.used), 360, { size: 9.5, align: "right" });
    doc.text(formatLimit(row.key, row.limit), 450, { size: 9.5, align: "right" });
    doc.text(row.limit === null ? "-" : `${row.percent}%`, RIGHT - 8, { size: 9.5, align: "right", bold: row.state !== "healthy", color: INK });
    doc.y -= 6;
    doc.rule(doc.y + 1);
    doc.y -= 10;
  });

  doc.y -= 12;
  doc.ensure(60);
  doc.text("RECENT INVOICES", MARGIN, { size: 7.5, bold: true, color: MUTED });
  doc.y -= 16;
  tableHeader(doc, [
    { label: "Invoice", x: MARGIN + 8 },
    { label: "Issued", x: 200 },
    { label: "Status", x: 310 },
    { label: "Total", x: RIGHT - 8, align: "right" },
  ]);
  if (!snapshot.invoices.length) {
    doc.text("No invoices yet.", MARGIN + 8, { size: 9.5, color: MUTED });
    doc.y -= 16;
  }
  snapshot.invoices.slice(0, 8).forEach((invoice) => {
    doc.ensure(18);
    doc.text(invoice.number, MARGIN + 8, { size: 9.5, color: INK });
    doc.text(shortDate(invoice.issuedAt), 200, { size: 9.5 });
    doc.text(INVOICE_STATUS_META[invoice.status].label, 310, { size: 9.5 });
    doc.text(pdfMoney(invoice.total), RIGHT - 8, { size: 9.5, align: "right", color: INK });
    doc.y -= 6;
    doc.rule(doc.y + 1);
    doc.y -= 10;
  });
  return doc.build(FOOTER);
}
