"use client";

/**
 * Settings of the social automation steps (comments, reviews and posts on LinkedIn, Facebook, Instagram, YouTube and
 * Google Business). With a "New comment or review" trigger the ids are filled from {{trigger.*}} automatically.
 */
const input = "h-9 w-full rounded-lg border border-[#E2E8F0] px-3 text-[11.5px] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]/20";
const area = "w-full resize-y rounded-lg border border-[#E2E8F0] px-3 py-2 text-[11.5px] focus:border-[#2563EB] focus:outline-none";

const PLATFORMS: Record<string, Array<[string, string]>> = {
  social_publish: [["facebook", "Facebook Page"], ["instagram", "Instagram"], ["linkedin", "LinkedIn Page"], ["google_business", "Google Business"]],
  social_lead: [["{{trigger.platform}}", "From the trigger"], ["linkedin", "LinkedIn"], ["facebook", "Facebook"], ["instagram", "Instagram"]],
  social_hide: [["{{trigger.platform}}", "From the trigger"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["youtube", "YouTube (hold for review)"]],
  default: [["{{trigger.platform}}", "From the trigger"], ["linkedin", "LinkedIn"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["youtube", "YouTube"], ["google_business", "Google Business (review)"]],
};

function Field({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold text-[#334155]">{title}</span>{children}{hint ? <span className="mt-1 block text-[10px] leading-4 text-[#94A3B8]">{hint}</span> : null}</label>;
}

export function SocialStepFields({ actionId, config, setConfig }: { actionId: string; config: Record<string, string | number | undefined>; setConfig: (patch: Record<string, unknown>) => void }) {
  const platforms = PLATFORMS[actionId] ?? PLATFORMS.default!;
  const targets = actionId !== "social_publish";
  return <>
    <Field title="Platform">
      <select className={`${input} bg-white`} value={config.platform ?? platforms[0]![0]} onChange={(e) => setConfig({ platform: e.target.value })}>{platforms.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    </Field>

    {targets && <details className="rounded-lg border border-[#E2E8F0] px-3 py-2" open={!String(config.commentId ?? "").includes("{{")}>
      <summary className="cursor-pointer text-[11px] font-semibold text-[#334155]">Which comment (filled from the trigger)</summary>
      <div className="mt-2 space-y-2">
        <Field title="Page / account" hint="{{trigger.accountId}}"><input className={input} value={config.accountId ?? ""} onChange={(e) => setConfig({ accountId: e.target.value })} /></Field>
        <Field title="Post / video" hint="{{trigger.postId}}"><input className={input} value={config.postId ?? ""} onChange={(e) => setConfig({ postId: e.target.value })} /></Field>
        <Field title="Comment / review" hint="{{trigger.commentId}}"><input className={input} value={config.commentId ?? ""} onChange={(e) => setConfig({ commentId: e.target.value })} /></Field>
        <Field title="Thread (top comment)" hint="{{trigger.threadId}}: replies go into the same thread"><input className={input} value={config.threadId ?? ""} onChange={(e) => setConfig({ threadId: e.target.value })} /></Field>
      </div>
    </details>}

    {actionId === "social_ai_reply" && <>
      <div className="grid grid-cols-2 gap-2">
        <Field title="Language"><select className={`${input} bg-white`} value={config.language ?? "auto"} onChange={(e) => setConfig({ language: e.target.value })}>{[["auto", "Same as the comment"], ["English", "English"], ["Hindi", "Hindi"], ["Hinglish", "Hinglish"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field title="Tone"><select className={`${input} bg-white`} value={config.tone ?? "Friendly"} onChange={(e) => setConfig({ tone: e.target.value })}>{["Friendly", "Professional", "Warm", "Short", "Formal"].map((v) => <option key={v}>{v}</option>)}</select></Field>
      </div>
      <Field title="Extra instruction for AI (optional)" hint="e.g. “ask them to WhatsApp us on our business number”. AI never invents prices, offers or links."><input className={input} maxLength={500} value={config.instruction ?? ""} onChange={(e) => setConfig({ instruction: e.target.value })} /></Field>
      <Field title="Result name" hint={`Use the reply later as {{variables.${config.saveAs || "aiReply"}.text}}`}><input className={input} value={config.saveAs ?? ""} onChange={(e) => setConfig({ saveAs: e.target.value })} /></Field>
      <p className="rounded-lg bg-[#F5F3FF] px-3 py-2 text-[10.5px] text-[#5B21B6]">AI reads the post, the whole thread and the comment, then writes a reply. Nothing is posted by this step: add “Reply to Comment / Review” after it (and an Approval step in between for a human check).</p>
    </>}

    {(actionId === "social_reply" || actionId === "social_publish") && <Field title={actionId === "social_publish" ? "Post text" : "Reply text"} hint={actionId === "social_publish" ? "Write it, or use an AI step's answer: {{variables.ai.text}}." : "Usually {{variables.aiReply.text}} from an AI Reply step."}>
      <textarea rows={5} maxLength={5000} className={area} value={config.text ?? ""} onChange={(e) => setConfig({ text: e.target.value })} />
    </Field>}

    {actionId === "social_publish" && <>
      <Field title="Page / account (mapping id, optional)" hint="Leave empty when the client has only one page of this channel."><input className={input} value={config.mappingId ?? ""} onChange={(e) => setConfig({ mappingId: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field title="Publish after (minutes)" hint="0 = as soon as possible (about 3 minutes)."><input type="number" min={0} max={43200} className={input} value={config.delayMinutes ?? 0} onChange={(e) => setConfig({ delayMinutes: Math.max(0, Math.min(43200, Number(e.target.value) || 0)) })} /></Field>
        <Field title="Photo (media asset id, optional)" hint="Needed for Instagram."><input className={input} value={config.mediaAssetId ?? ""} onChange={(e) => setConfig({ mediaAssetId: e.target.value })} /></Field>
      </div>
      <p className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-[10.5px] text-[#475569]">The post goes through the normal publishing queue: it appears in Content → Calendar, is checked against the channel&apos;s rules, retried safely and you are notified when it is live.</p>
    </>}

    {actionId === "social_reply" && <p className="rounded-lg bg-[#FFF7ED] px-3 py-2 text-[10.5px] text-[#9A3412]">This posts publicly as the page / channel / business. Put an Approval step before it unless you want fully automatic replies. A reply that times out is never re-sent automatically.</p>}
    {actionId === "social_lead" && <p className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-[10.5px] text-[#475569]">One lead per person (commenting again does not duplicate it). AI adds interest, score and next step. Use {"{{variables.<name>.leadId}}"} later, e.g. to create a task.</p>}
    {actionId === "social_hide" && <p className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-[10.5px] text-[#475569]">Facebook/Instagram: hidden from everyone except the writer and their friends. YouTube: held for review in YouTube Studio.</p>}
  </>;
}
