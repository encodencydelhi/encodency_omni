import { type Campaign, type Contact, type Template, type TemplateAction } from "./mock-service";

export const TEMPLATE_TYPES = ["Text", "Image", "Video", "File", "Location"] as const;
/** A text header may hold one {{1}} variable, filled from parameter "0" so it never clashes with the body variables. */
export const headerVariable = (template: Template) => (!template.type || template.type === "Text") && /\{\{1\}\}/.test(template.header);
/** Every value a sender must supply, in the order the server expects: header "0", body and URL variables, then "coupon". */
export function templateKeys(template: Template): string[] {
  const actions = templateActions(template);
  // A tracked link's variable is filled by the system with a per-message token, so the sender never supplies it.
  const tracked = new Set(actions.filter(a => a.type === "URL" && a.track).map(a => /\{\{(\d+)\}\}$/.exec(a.value)?.[1]));
  const numbers = templateParameters(template.body + " " + actions.filter(a => a.type === "URL").map(a => a.value).join(" ")).filter(key => /^\d+$/.test(key) && !tracked.has(key));
  return [...(headerVariable(template) ? ["0"] : []), ...numbers, ...(actions.some(a => a.type === "Copy Code") ? ["coupon"] : [])];
}
export const parameterLabel = (key: string) => key === "0" ? "Header Value" : key === "coupon" ? "Coupon Code" : `{{${key}}}`;
export function templateParameters(body: string): string[] {
  return [...new Set(Array.from(body.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g), match => match[1]?.trim() || "").filter(Boolean))];
}
export function templateActions(template: Template): TemplateAction[] {
  return template.actions ?? (template.button ? [{ id: "legacy-button", type: template.buttonType === "Quick Reply" ? "Quick Reply" : "URL", label: template.button, value: template.buttonTarget, urlType: "Static" }] : []);
}
export function validateTemplate(template: Template, existing: Template[]): string[] {
  const errors: string[] = [];
  if (!/^[a-z0-9_]{1,120}$/.test(template.name)) errors.push("Template Name Must Use Lowercase Letters, Numbers And Underscores (Up To 120 Characters).");
  if (existing.some(t => t.id !== template.id && t.name === template.name && t.language === template.language)) errors.push("A Template With This Name And Language Already Exists.");
  if (!template.body.trim() || template.body.length > 1024) errors.push("Template Format Is Required And Must Be At Most 1,024 Characters.");
  const parameters = templateParameters(template.body);
  if (parameters.some((key, index) => key !== String(index + 1))) errors.push("Use Sequential Parameters: {{1}}, {{2}}, {{3}}.");
  if (parameters.some(key => !(template.variables?.[key] || (key === "1" ? template.sample : "")).trim())) errors.push("Add A Sample Value For Every Parameter.");
  if (template.header.length > 60 || template.footer.length > 60) errors.push("Header And Footer Must Be At Most 60 Characters.");
  if (template.type && !["Text", "Location"].includes(template.type) && !template.mediaName) errors.push("Choose Sample Media For The Selected Template Type.");
  if(template.category==='Authentication'&&!template.authentication)errors.push('Choose The Authentication Layout And OTP Settings.');
  if(template.authentication){const a=template.authentication;if(template.category!=="Authentication"||template.body!=="{{1}}"||template.type!=="Text"||template.header||template.footer||template.actions?.length)errors.push("Authentication Uses Fixed Code Content Without Custom Media Or Actions.");if(a.expirationMinutes<1||a.expirationMinutes>90||!Number.isInteger(a.expirationMinutes))errors.push("Use An Expiry Of 1-90 Minutes.");if((a.otpType==="ONE_TAP"||a.otpType==="ZERO_TAP")&&(!a.packageName||!a.signatureHash))errors.push("Add Android Package And Signature Hash For One-Tap Or Zero-Tap.");if(a.otpType==="ZERO_TAP"&&a.zeroTapTermsAccepted!==true)errors.push("Accept The Zero-Tap Terms To Use Zero-Tap.");}
  if(template.layout==="Carousel"){if(template.category!=="Marketing"||template.header||template.footer||template.actions?.length)errors.push("Carousel Requires Marketing With No Top-Level Header, Footer Or Buttons.");if(!template.cards||template.cards.length<2||template.cards.length>10)errors.push("Add 2-10 Carousel Cards.");for(const c of template.cards||[]){if(!c.mediaId||!c.body.trim()||c.body.length>160||/[{}]/.test(c.body))errors.push("Each Card Needs Uploaded Media And Static Text Up To 160 Characters.");if(c.type!==template.cards?.[0]?.type)errors.push("Use The Same Media Type Across Cards.");for(const a of c.actions){try{if(!a.label.trim()||a.label.length>20||new URL(a.value).protocol!=="https:")throw Error();}catch{errors.push("Add A Short Card Button Label And Valid HTTPS URL.");}}}}
  const actions = templateActions(template);
  const count = (type: TemplateAction["type"]) => actions.filter(a => a.type === type).length;
  if (actions.length > 10) errors.push("Use At Most Ten Buttons.");
  if (count("URL") > 2) errors.push("Use At Most Two Website Buttons.");
  if (count("Phone") > 1) errors.push("Use At Most One Call Button.");
  if (count("Copy Code") > 1) errors.push("Use At Most One Coupon Code Button.");
  if (count("Flow") > 1) errors.push("Use At Most One Flow Button.");
  if (count("Catalog") > 1 || (count("Catalog") === 1 && actions.length > 1)) errors.push("A Catalog Template Has Only Its Catalog Button.");
  const quick = actions.flatMap((a, index) => a.type === "Quick Reply" ? [index] : []);
  if (quick.length && (quick[quick.length - 1] ?? 0) - (quick[0] ?? 0) !== quick.length - 1) errors.push("Keep Quick Replies Together, Before Or After The Other Buttons.");
  if (count("Copy Code") && template.category !== "Marketing") errors.push("Coupon Code Buttons Are For Marketing Templates.");
  if (actions.some(a => !["Copy Code", "Catalog"].includes(a.type) && (!a.label.trim() || a.label.length > 25))) errors.push("Add Button Titles Within 25 Characters.");
  let nextUrlVariable = parameters.length;
  for (const action of actions) {
    if (action.type === "URL") {
      try { const url = new URL(action.value.replace(/\{\{\d+\}\}/g, "sample")); if (url.protocol !== "https:") throw new Error(); } catch { errors.push("Add A Valid HTTPS URL For The Website Button."); }
      if (action.urlType === "Dynamic") {
        const expected = String(++nextUrlVariable);
        if (!action.value.endsWith(`{{${expected}}}`) || templateParameters(action.value).some(key => key !== expected)) errors.push(`Use {{${expected}}} At The End Of The Dynamic URL Parameter.`);
        if (!template.variables?.[expected]?.trim()) errors.push("Add A Sample Value For The Dynamic URL Parameter.");
      } else if (templateParameters(action.value).length) errors.push("Select Dynamic URL To Use A URL Parameter.");
      if (action.track) {
        try { if (new URL(action.trackTarget ?? "").protocol !== "https:") throw new Error(); } catch { errors.push("Add An HTTPS Destination For The Tracked Link."); }
        if (action.urlType !== "Dynamic") errors.push("A Tracked Link Uses A Dynamic URL.");
      }
    }
    if (action.type === "Phone" && !/^\d{10,15}$/.test(action.value)) errors.push("Enter A Phone Button Number With Country Code And Without The + Sign.");
    if (action.type === "Copy Code" && !/^[A-Za-z0-9]{1,15}$/.test(action.value)) errors.push("Enter An Example Coupon Code With 1-15 Letters Or Numbers.");
    if (action.type === "Flow" && !action.value) errors.push("Choose A Published Flow For The Flow Button.");
  }
  if (/[{}]/.test(template.header)) {
    if ((template.type ?? "Text") !== "Text") errors.push("Only A Text Header Can Contain A Variable.");
    else if (templateParameters(template.header).join() !== "1") errors.push("A Header Supports Exactly One Variable, {{1}}.");
    if (!template.variables?.["0"]?.trim()) errors.push("Add A Sample Value For The Header Variable.");
  }
  if (template.limitedTimeOffer) {
    const offer = template.limitedTimeOffer;
    if (template.category !== "Marketing") errors.push("A Limited-Time Offer Needs The Marketing Category.");
    if (!offer.text.trim() || offer.text.length > 16) errors.push("The Offer Headline Needs 1-16 Characters.");
    if (offer.hasExpiration && (!Number.isInteger(offer.offerHours) || (offer.offerHours ?? 0) < 1 || (offer.offerHours ?? 0) > 720)) errors.push("An Offer Lasts 1-720 Hours.");
    if (template.footer) errors.push("Limited-Time Offers Do Not Allow A Footer.");
    if (template.body.length > 600) errors.push("A Limited-Time Offer Body Has At Most 600 Characters.");
  }
  if (template.type === "Location") {
    const place = template.location;
    if (!place || !Number.isFinite(place.latitude) || place.latitude < -90 || place.latitude > 90 || !Number.isFinite(place.longitude) || place.longitude < -180 || place.longitude > 180) errors.push("Enter A Valid Latitude And Longitude For The Location Header.");
    else if (!place.name.trim() || !place.address.trim()) errors.push("Add A Place Name And Address For The Location Header.");
  }
  return [...new Set(errors)];
}
export function resolveMessage(template: Template, values: Record<string, string> = {}): string {
  return template.body.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, key: string) => values[key] || template.variables?.[key] || (key === "1" ? template.sample : "") || `{{${key}}}`);
}
export function parseRecipientPhones(value: string): string[] {
  const phones = value.split(/[\n,]+/).map(phone => phone.trim()).filter(Boolean);
  if (phones.some(phone => !/^\+\d{10,15}$/.test(phone))) throw new Error("Use International Phone Numbers With + And 10–15 Digits.");
  return [...new Set(phones)];
}
export function readCampaignCsv(text: string): { headers: string[]; rows: string[][] } {
  const records: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(cell.trim()); if (row.some(Boolean)) records.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("CSV Contains An Unclosed Quoted Value.");
  row.push(cell.trim()); if (row.some(Boolean)) records.push(row);
  const headers = records.shift() || [];
  if (!headers.length || headers.some(header => !header) || new Set(headers.map(header => header.toLowerCase())).size !== headers.length) throw new Error("CSV Needs Unique, Non-Empty Column Headers.");
  if (records.some(record => record.length !== headers.length)) throw new Error("Each CSV Row Must Match The Header Column Count.");
  return { headers, rows: records };
}
export function mapCampaignCsv(text: string, mapping: { name: string; phone: string; consent: string }, confirmedConsent: boolean, countryCode = "91"): Contact[] {
  const { headers, rows } = readCampaignCsv(text);
  const nameIndex = headers.indexOf(mapping.name), phoneIndex = headers.indexOf(mapping.phone), consentIndex = headers.indexOf(mapping.consent);
  if (nameIndex < 0 || phoneIndex < 0 || nameIndex === phoneIndex) throw new Error("Map Separate Name And Phone Number Columns.");
  if (consentIndex < 0 && !confirmedConsent) throw new Error("Map A Consent Column Or Confirm That The Imported Contacts Have Opted In.");
  if (!/^\d{1,4}$/.test(countryCode)) throw new Error("Enter A Country Calling Code Using Digits Only.");
  return rows.map((record, index) => {
    const name = record[nameIndex] || "";
    const rawPhone = (record[phoneIndex] || "").replace(/[\s()-]/g, "");
    const phone = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone.length === 10 ? countryCode : ""}${rawPhone}`;
    const consentValue = consentIndex >= 0 ? (record[consentIndex] || "").toLowerCase() : "true";
    if (!name || !/^\+\d{10,15}$/.test(phone)) throw new Error(`CSV Row ${index + 2}: Enter A Name And Valid International Phone Number.`);
    if (!/^(true|false|yes|no|1|0|opted in|opted out)$/.test(consentValue)) throw new Error(`CSV Row ${index + 2}: Consent Must Be true/false, yes/no, 1/0 Or Opted In/Out.`);
    return { id: `csv-${index}`, name, phone, consent: /^(true|yes|1|opted in)$/.test(consentValue), tags: ["Imported"], agent: "Unassigned", notes: "Imported In Demo Campaign" };
  });
}
export function resolveCampaignParameters(campaign: Campaign, contact?: Contact): Record<string, string> {
  return Object.fromEntries(Object.entries(campaign.parameters || {}).map(([key, value]) => {
    const resolved = value === "$FirstName" ? contact?.name.split(" ")[0] : value === "$Name" ? contact?.name : value === "$Phone" ? contact?.phone : value.startsWith("$Field:") ? contact?.attributes?.[value.slice(7)] : value;
    return [key, resolved || campaign.parameterFallbacks?.[key] || "Customer"];
  }));
}
export function campaignRecipients(contacts: Contact[], selected: string[], manual: string[]): { ids: string[]; phones: string[]; excluded: number } {
  const blocked = new Set(contacts.filter(c => !c.consent).map(c => c.phone));
  const selectedContacts = contacts.filter(c => selected.includes(c.id));
  const candidatePhones = [...new Set([...selectedContacts.map(c => c.phone), ...manual])];
  return { ids: selectedContacts.filter(c => c.consent).map(c => c.id), phones: candidatePhones.filter(phone => !blocked.has(phone)), excluded: candidatePhones.filter(phone => blocked.has(phone)).length };
}
export function campaignValidation(campaign: Campaign, template: Template | undefined, recipients: string[], scheduled: boolean): string[] {
  const errors: string[] = [];
  if (!campaign.name.trim()) errors.push("Enter A Campaign Name.");
  if (!template || template.status !== "Approved") errors.push("Select A Demo Approved Template.");
  if (campaign.kind !== "API" && !recipients.length) errors.push("Choose At Least One Consenting Recipient.");
  if (template && templateKeys(template).some(key => !campaign.parameters?.[key]?.trim())) errors.push("Configure Every Template Parameter.");
  if (template?.type && template.type !== "Text" && !campaign.mediaName) errors.push("Choose Campaign Media For The Selected Template.");
  if (scheduled && (!Number.isFinite(new Date(campaign.scheduledAt).getTime()) || new Date(campaign.scheduledAt).getTime() <= Date.now())) errors.push("Choose A Future Schedule.");
  if ((campaign.retryCount ?? 0) < 0 || (campaign.retryCount ?? 0) > 3) errors.push("Choose Between Zero And Three Retries.");
  return errors;
}
export function editorHref(kind: "templates" | "campaigns", id?: string): string {
  const query = new URLSearchParams();
  if (id) query.set("id", id);
  return `/admin/whatsapp/${kind}/create${query.size ? `?${query.toString()}` : ""}`;
}
export function workspaceHref(section: "Templates" | "Campaigns"): string {
  return `/admin/whatsapp?${new URLSearchParams({ section }).toString()}`;
}
