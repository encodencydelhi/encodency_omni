"use client";

/**
 * Settings of the AI nodes (Classify, Extract, Write, Transform, Image, Agent). They run on the company's AI quota;
 * each step's answer is kept under its result name for later steps: {{variables.<name>.<field>}}.
 */
const input = "h-9 w-full rounded-lg border border-[#E2E8F0] px-3 text-[11.5px] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]/20";
const area = "w-full resize-y rounded-lg border border-[#E2E8F0] px-3 py-2 text-[11.5px] focus:border-[#2563EB] focus:outline-none";
type Config = Record<string, string | number | string[] | undefined>;

const AGENT_TOOLS: Array<[string, string]> = [
  ["lookup_resource", "Look up a record"], ["create_task", "Create a task"], ["notify_user", "Notify the team"], ["update_record", "Update the lead"],
  ["social_lead", "Save a commenter as lead"], ["social_ai_reply", "Draft a comment reply"], ["ai_classify", "Classify text"], ["ai_extract", "Extract fields"], ["ai_write", "Draft text"],
];

function Field({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold text-[#334155]">{title}</span>{children}{hint ? <span className="mt-1 block text-[10px] leading-4 text-[#94A3B8]">{hint}</span> : null}</label>;
}
const Note = ({ children }: { children: React.ReactNode }) => <p className="rounded-lg bg-[#F5F3FF] px-3 py-2 text-[10.5px] leading-4 text-[#5B21B6]">{children}</p>;

export function AiStepFields({ actionId, config, setConfig }: { actionId: string; config: Config; setConfig: (patch: Record<string, unknown>) => void }) {
  const name = String(config.saveAs || "ai");
  const str = (key: string) => String(config[key] ?? "");
  const resultName = <Field title="Result name" hint="Letters and digits, starting lower-case."><input className={input} value={str("saveAs")} onChange={(e) => setConfig({ saveAs: e.target.value })} /></Field>;
  const textInput = (title: string, hint: string) => <Field title={title} hint={hint}><textarea rows={3} maxLength={6000} className={area} value={str("input")} onChange={(e) => setConfig({ input: e.target.value })} /></Field>;
  const language = (key = "language", auto = true) => <Field title="Language"><select className={`${input} bg-white`} value={str(key) || (auto ? "auto" : "English")} onChange={(e) => setConfig({ [key]: e.target.value })}>{[...(auto ? [["auto", "Same as the input"]] : []), ["English", "English"], ["Hindi", "Hindi"], ["Hinglish", "Hinglish"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>;

  switch (actionId) {
    case "ai_classify": return <>
      {textInput("Text to classify", "e.g. {{trigger.message}}, {{lead.notes}} or {{variables.reply.text}}")}
      <Field title="Categories" hint="Comma separated, 2-10. The answer is always one of these (or unknown)."><input className={input} value={str("categories")} onChange={(e) => setConfig({ categories: e.target.value })} placeholder="lead, question, complaint, spam" /></Field>
      <Field title="How to decide (optional)"><input className={input} maxLength={800} value={str("instruction")} onChange={(e) => setConfig({ instruction: e.target.value })} placeholder="e.g. lead = asks for price, booking or a call" /></Field>
      {resultName}
      <Note>Use {`{{variables.${name}.category}}`} in a Switch to send each kind down its own path; {`{{variables.${name}.confidence}}`} is 0-1.</Note>
    </>;
    case "ai_extract": return <>
      {textInput("Text to read", "e.g. {{trigger.message}} or a WhatsApp/email body")}
      <Field title="Fields" hint="Comma separated; add :type (text, number, email, phone, date, boolean) and :description. e.g. name, phone:phone, city, budget:number:monthly budget"><textarea rows={2} className={area} value={str("fields")} onChange={(e) => setConfig({ fields: e.target.value })} /></Field>
      {resultName}
      <Note>Each field becomes {`{{variables.${name}.<field>}}`} (empty when the text does not say it, never guessed). {`{{variables.${name}.missing}}`} lists what was not found.</Note>
    </>;
    case "ai_write": return <>
      <div className="grid grid-cols-2 gap-2">
        <Field title="Write a"><select className={`${input} bg-white`} value={str("kind") || "social_post"} onChange={(e) => setConfig({ kind: e.target.value })}>{[["social_post", "Social post"], ["email", "Email"], ["whatsapp", "WhatsApp message"], ["reply", "Reply"], ["sms", "SMS"], ["note", "Internal note"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field title="Length"><select className={`${input} bg-white`} value={str("length") || "medium"} onChange={(e) => setConfig({ length: e.target.value })}>{["short", "medium", "long"].map((v) => <option key={v}>{v}</option>)}</select></Field>
        <Field title="Tone"><select className={`${input} bg-white`} value={str("tone") || "Friendly"} onChange={(e) => setConfig({ tone: e.target.value })}>{["Friendly", "Professional", "Warm", "Persuasive", "Formal", "Fun"].map((v) => <option key={v}>{v}</option>)}</select></Field>
        {language()}
      </div>
      <Field title="What to write" hint="e.g. Thank {{lead.firstName}} for the enquiry about {{lead.campaign}} and offer a call."><textarea rows={3} maxLength={2000} className={area} value={str("brief")} onChange={(e) => setConfig({ brief: e.target.value })} /></Field>
      <Field title="Facts it may use (optional)" hint="Prices, offers, links: AI uses only what is written here or in the brief, never invents."><textarea rows={2} maxLength={6000} className={area} value={str("facts")} onChange={(e) => setConfig({ facts: e.target.value })} /></Field>
      {resultName}
      <Note>Use {`{{variables.${name}.text}}`}{str("kind") === "email" ? ` and {{variables.${name}.subject}}` : ""} in Send Email, Send WhatsApp or Publish Social Post.</Note>
    </>;
    case "ai_transform": return <>
      <Field title="Do"><select className={`${input} bg-white`} value={str("mode") || "summarize"} onChange={(e) => setConfig({ mode: e.target.value })}>{[["summarize", "Summarize"], ["translate", "Translate"], ["rewrite", "Rewrite"], ["sentiment", "Detect sentiment"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      {textInput("Text", "e.g. {{trigger.message}} or {{variables.ai.text}}")}
      {str("mode") === "translate" && language("targetLanguage", false)}
      {(str("mode") || "summarize") === "summarize" && <Field title="Summary length"><select className={`${input} bg-white`} value={str("length") || "medium"} onChange={(e) => setConfig({ length: e.target.value })}><option value="short">One sentence</option><option value="medium">3 bullet lines</option><option value="long">5-8 bullet lines</option></select></Field>}
      {str("mode") === "rewrite" && <Field title="Style"><input className={input} value={str("style")} onChange={(e) => setConfig({ style: e.target.value })} placeholder="clear and friendly" /></Field>}
      {resultName}
      <Note>{str("mode") === "sentiment" ? `{{variables.${name}.sentiment}} is positive, neutral or negative; {{variables.${name}.score}} is -1 to 1.` : `The result is {{variables.${name}.text}}.`}</Note>
    </>;
    case "ai_image": return <>
      <Field title="Describe the image" hint="Variables work, e.g. a festive banner for {{trigger.festival}}. No text in the image works best."><textarea rows={3} maxLength={4000} className={area} value={str("prompt")} onChange={(e) => setConfig({ prompt: e.target.value })} /></Field>
      <div className="grid grid-cols-3 gap-2">
        <Field title="Shape"><select className={`${input} bg-white`} value={str("size") || "square"} onChange={(e) => setConfig({ size: e.target.value })}><option value="square">Square</option><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></Field>
        <Field title="Style"><select className={`${input} bg-white`} value={str("style") || "Realistic"} onChange={(e) => setConfig({ style: e.target.value })}>{["Realistic", "Cinematic", "Minimal", "Vibrant", "Natural", "Studio"].map((v) => <option key={v}>{v}</option>)}</select></Field>
        <Field title="Quality"><select className={`${input} bg-white`} value={str("quality") || "medium"} onChange={(e) => setConfig({ quality: e.target.value })}>{["low", "medium", "high"].map((v) => <option key={v}>{v}</option>)}</select></Field>
      </div>
      {resultName}
      <Note>The image is saved to this client&apos;s media library. Put {`{{variables.${name}.assetId}}`} in “Publish Social Post” → Photo. Test runs do not create images.</Note>
    </>;
    case "ai_agent": {
      const tools = Array.isArray(config.tools) ? config.tools : [];
      return <>
        <Field title="Goal" hint="What the agent should achieve, with the facts it needs, e.g. Read {{trigger.commentId}} on {{trigger.platform}}; if it is a lead, save it and create a call task for tomorrow, then notify me."><textarea rows={4} maxLength={2000} className={area} value={str("goal")} onChange={(e) => setConfig({ goal: e.target.value })} /></Field>
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-[#334155]">Tools the agent may use</span>
          <div className="grid grid-cols-2 gap-1">{AGENT_TOOLS.map(([id, label]) => <label key={id} className="flex items-center gap-1.5 text-[11px] text-[#334155]"><input type="checkbox" checked={tools.includes(id)} onChange={(e) => setConfig({ tools: e.target.checked ? [...tools, id] : tools.filter((t) => t !== id) })} />{label}</label>)}</div>
        </div>
        <Field title="Max steps (1-6)"><input type="number" min={1} max={6} className={input} value={config.maxSteps ?? 4} onChange={(e) => setConfig({ maxSteps: Math.max(1, Math.min(6, Number(e.target.value) || 4)) })} /></Field>
        {resultName}
        <Note>The agent never posts publicly, replies, emails or sends WhatsApp: add those as their own steps after it (with Approval). Every tool call is checked like a normal step and shown in the run log. Result: {`{{variables.${name}.text}}`}.</Note>
      </>;
    }
    default: return null;
  }
}
