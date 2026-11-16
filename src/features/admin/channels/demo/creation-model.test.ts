import assert from "node:assert/strict";
import test from "node:test";
import { demoAdapter, seedWorkspace, subscribeDemoWorkspace, type Campaign, type Template } from "./mock-service";
import { campaignRecipients, campaignValidation, editorHref, mapCampaignCsv, parseRecipientPhones, resolveCampaignParameters, resolveMessage, templateParameters, validateTemplate, workspaceHref } from "./creation-model";
import { whatsappWorkspaceScope } from "./workspace-scope";

function validTemplate(): Template {
  return { id: "draft", name: "order_confirmation", category: "Utility", language: "English", type: "Text", header: "Order Update", body: "Hello {{1}}, your order {{2}} is ready. Thank you!", footer: "Thank You", sample: "Aarav", variables: { "1": "Aarav", "2": "ORD-24" }, button: "", buttonType: "URL", buttonTarget: "", actions: [], status: "Draft" };
}
test("template creation validates names, sequential variables and samples", () => {
  const template = validTemplate();
  assert.deepEqual(validateTemplate(template, []), []);
  assert.ok(validateTemplate({ ...template, name: "Order Confirmation" }, []).some(error => error.includes("Lowercase")));
  assert.ok(validateTemplate({ ...template, body: "Hello {{2}}, thanks." }, []).some(error => error.includes("Sequential")));
  assert.ok(validateTemplate({ ...template, variables: { "1": "Aarav" } }, []).some(error => error.includes("Sample")));
  assert.ok(validateTemplate(template, [{ ...template, id: "other" }]).some(error => error.includes("Already Exists")));
  assert.deepEqual(templateParameters("Hello {{1}} {{2}} {{1}}"), ["1", "2"]);
});
test("authentication draft validation preserves fixed OTP content and expiry",()=>{
 const template:Template={...validTemplate(),category:"Authentication",body:"{{1}}",header:"",footer:"",variables:{"1":"123456"},authentication:{otpType:"COPY_CODE",expirationMinutes:10,securityRecommendation:true}};
 assert.deepEqual(validateTemplate(template,[]),[]);
 assert.ok(validateTemplate({...template,authentication:{...template.authentication!,expirationMinutes:0}},[]).length);
 assert.ok(validateTemplate({...template,body:"Custom text {{1}}"},[]).length);
});
test("carousel validation needs two owned media cards and HTTPS buttons",()=>{
 const card={type:"Image" as const,body:"Product",mediaId:"owned",actions:[{type:"URL" as const,label:"View",value:"https://example.test"}]};
 const template:Template={...validTemplate(),category:"Marketing",header:"",footer:"",layout:"Carousel",cards:[card,{...card}]};
 assert.deepEqual(validateTemplate(template,[]),[]);
 assert.ok(validateTemplate({...template,cards:[card]},[]).length);
 assert.ok(validateTemplate({...template,cards:[card,{...card,mediaId:""}]},[]).length);
});
test("buttons are validated: dynamic URL samples, quick replies stay together, mixing is allowed", () => {
  const template = validTemplate();
  template.actions = [{ id: "url", type: "URL", label: "View Order", value: "https://example.com/orders/{{3}}", urlType: "Dynamic" }];
  assert.ok(validateTemplate(template, []).some(error => error.includes("Dynamic URL Parameter")));
  template.variables = { ...template.variables, "3": "ORD-24" };
  assert.deepEqual(validateTemplate(template, []), []);
  template.actions.push({ id: "reply", type: "Quick Reply", label: "Help", value: "" });
  assert.deepEqual(validateTemplate(template, []), []);
  template.actions = [{ id: "a", type: "Quick Reply", label: "A", value: "" }, { id: "url", type: "URL", label: "Open", value: "https://example.com/orders/{{3}}", urlType: "Dynamic" }, { id: "b", type: "Quick Reply", label: "B", value: "" }];
  assert.ok(validateTemplate(template, []).some(error => error.includes("Together")));
  template.actions = [{ id: "phone", type: "Phone", label: "Call Us", value: "+919000000100" }];
  assert.ok(validateTemplate(template, []).some(error => error.includes("Without The +")));
});
test("media templates require sample media and button count limits are enforced", () => {
  const template = { ...validTemplate(), type: "Image" as const };
  assert.ok(validateTemplate(template, []).some(error => error.includes("Sample Media")));
  assert.deepEqual(validateTemplate({ ...template, mediaName: "banner.png" }, []), []);
  assert.ok(validateTemplate({ ...validTemplate(), actions: Array.from({ length: 11 }, (_, i) => ({ id: String(i), type: "Quick Reply" as const, label: "Reply", value: "" })) }, []).some(error => error.includes("Ten Buttons")));
});
test("manual and saved recipients are deduplicated and known opt-outs cannot bypass exclusion", () => {
  const contacts = seedWorkspace("audience-test").contacts;
  const optedOut = contacts.find(contact => !contact.consent)!;
  const optedIn = contacts.find(contact => contact.consent)!;
  const audience = campaignRecipients(contacts, [optedIn.id, optedOut.id], [optedIn.phone, optedOut.phone, "+919000000199"]);
  assert.deepEqual(audience.ids, [optedIn.id]);
  assert.equal(audience.phones.length, 2);
  assert.equal(audience.excluded, 1);
  assert.ok(!audience.phones.includes(optedOut.phone));
  assert.deepEqual(parseRecipientPhones("+919000000100,\n+919000000100"), ["+919000000100"]);
  assert.throws(() => parseRecipientPhones("900"), /International/);
});
test("campaign CSV supports mapped columns, quoted names, local numbers and explicit consent", () => {
  const csv = 'Mobile Number,Full Name,Permission\r\n9000000190,"Verma, Ishaan",yes\r\n+919000000191,Meera,no';
  const rows = mapCampaignCsv(csv, { name: "Full Name", phone: "Mobile Number", consent: "Permission" }, false);
  assert.equal(rows[0]?.name, "Verma, Ishaan");
  assert.equal(rows[0]?.phone, "+919000000190");
  assert.equal(rows[1]?.consent, false);
  assert.throws(() => mapCampaignCsv("Name,Mobile\nAarav,9000000190", { name: "Name", phone: "Mobile", consent: "Not Provided" }, false), /Confirm/);
  assert.equal(mapCampaignCsv("Name,Mobile\nAarav,9000000190", { name: "Name", phone: "Mobile", consent: "Not Provided" }, true).length, 1);
});
test("campaign review requires approved templates, mapped values, audience and valid schedules", () => {
  const template = { ...validTemplate(), status: "Approved" as const };
  const campaign: Campaign = { id: "campaign", name: "Order Update", kind: "Broadcast", status: "Draft", audience: ["c1"], templateId: template.id, scheduledAt: "", sent: 0, read: 0, parameters: { "1": "$FirstName", "2": "ORD-24" } };
  assert.deepEqual(campaignValidation(campaign, template, ["+919000000100"], false), []);
  assert.ok(campaignValidation(campaign, { ...template, status: "Pending" }, ["+919000000100"], false).some(error => error.includes("Approved")));
  assert.ok(campaignValidation(campaign, template, [], false).some(error => error.includes("Recipient")));
  assert.ok(campaignValidation(campaign, template, ["+919000000100"], true).some(error => error.includes("Future")));
  assert.ok(campaignValidation({ ...campaign, parameters: {} }, template, ["+919000000100"], false).some(error => error.includes("Parameter")));
  assert.deepEqual(campaignValidation({ ...campaign, kind: "API" }, template, [], false), []);
  const contact = seedWorkspace("mapping").contacts[0]!;
  assert.equal(resolveCampaignParameters(campaign, contact)["1"], contact.name.split(" ")[0]);
  assert.equal(resolveMessage(template, { "1": "Meera", "2": "ORD-55" }), "Hello Meera, your order ORD-55 is ready. Thank you!");
});
test("creation links leave company and client selection to the sidebar", () => {
  const create = new URL(editorHref("templates", "draft-id"), "https://example.com");
  assert.equal(create.pathname, "/admin/whatsapp/templates/create");
  assert.equal(create.searchParams.get("scope"), null);
  assert.equal(create.searchParams.get("id"), "draft-id");
  const back = new URL(workspaceHref("Campaigns"), "https://example.com");
  assert.equal(back.searchParams.get("section"), "Campaigns");
  assert.equal(back.searchParams.get("scope"), null);
  assert.equal(editorHref("campaigns"), "/admin/whatsapp/campaigns/create");
});
test("WhatsApp scopes follow the existing company/client and remain isolated when the sidebar switches", () => {
  const firstClient = whatsappWorkspaceScope("company-a", "client-a");
  const secondClient = whatsappWorkspaceScope("company-a", "client-b");
  const otherCompany = whatsappWorkspaceScope("company-b", "client-a");
  assert.notEqual(firstClient, secondClient);
  assert.notEqual(firstClient, otherCompany);
  assert.notEqual(whatsappWorkspaceScope("a:b", "c"), whatsappWorkspaceScope("a", "b:c"));
  const first = demoAdapter.load(firstClient);
  demoAdapter.save(firstClient, { ...first, templates: [validTemplate()] });
  assert.equal(demoAdapter.load(firstClient).templates[0]?.name, "order_confirmation");
  assert.notEqual(demoAdapter.load(secondClient).templates[0]?.name, "order_confirmation");
  assert.notEqual(demoAdapter.load(otherCompany).templates[0]?.name, "order_confirmation");
  assert.equal(demoAdapter.load(whatsappWorkspaceScope("company-a", "client-a")).templates[0]?.name, "order_confirmation");
});
test("saved drafts notify the same scope across pages without changing another client's snapshot", () => {
  const scope = "company-a:client-a:editor-test";
  let notifications = 0;
  const other = demoAdapter.load("company-a:client-b:editor-test");
  const first = demoAdapter.load(scope);
  assert.equal(demoAdapter.load(scope), first);
  const unsubscribe = subscribeDemoWorkspace(scope, () => notifications++);
  demoAdapter.save(scope, { ...first, templates: [validTemplate(), ...first.templates] });
  assert.equal(notifications, 1);
  assert.equal(demoAdapter.load(scope).templates[0]?.name, "order_confirmation");
  assert.equal(demoAdapter.load("company-a:client-b:editor-test"), other);
  unsubscribe();
  demoAdapter.save(scope, first);
  assert.equal(notifications, 1);
});
