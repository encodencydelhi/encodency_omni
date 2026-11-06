"use client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, Select } from "./ui";
import { templateKeys } from "./creation-model";
import type { Workspace } from "./mock-service";

interface NodeLike { kind: string; value: string }
type Config = Record<string, unknown> & { templateId?: string; parameters?: Record<string, string>; mediaId?: string; tags?: string[]; notes?: string; attributes?: Record<string, string> };
const parse = (value: string): Config => { try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } };

/**
 * Structured editors for the three automation nodes that used to need hand-written JSON. The stored value is still the same JSON
 * string, so the server contract and every existing workflow keep working; a value that is not valid JSON simply opens empty.
 */
export function AutomationNodeForm({ node, data, patch }: { node: NodeLike; data: Workspace; patch: (change: { value: string }) => void }) {
  const without = (config: Config, key: string): Config => Object.fromEntries(Object.entries(config).filter(([name]) => name !== key));
  const set = (value: unknown) => patch({ value: typeof value === "string" ? value : JSON.stringify(value) });
  if (node.kind === "Delay") {
    return (
      <Field label="Wait Before The Next Step (Seconds, 0–86400)">
        <Input type="number" min={0} max={86400} step={1} value={node.value} onChange={(event) => set(String(Math.min(86400, Math.max(0, Math.floor(Number(event.target.value) || 0)))))} />
      </Field>
    );
  }
  if (node.kind === "Template") {
    const config = parse(node.value);
    const template = data.templates.find((item) => item.id === config.templateId);
    const keys = template ? templateKeys(template) : [];
    const needsMedia = !!template && !!template.type && template.type !== "Text";
    const names = data.templates.map((item) => item.name);
    return (
      <div className="space-y-2">
        <Select label="Template" value={template?.name ?? "Choose A Template"} options={["Choose A Template", ...names]} onChange={(name) => { const next = data.templates.find((item) => item.name === name); set(next ? { templateId: next.id, parameters: Object.fromEntries(templateKeys(next).map((key) => [key, config.parameters?.[key] ?? ""])) } : {}); }} />
        {template && template.status !== "Approved" && <p className="text-xs text-amber-700">This Template Is Not Approved Yet. The Step Fails Until It Is.</p>}
        {keys.map((key) => (
          <Field key={key} label={`Value For {{${key}}}`}>
            <Input maxLength={1024} value={config.parameters?.[key] ?? ""} onChange={(event) => set({ ...config, parameters: { ...config.parameters, [key]: event.target.value } })} />
          </Field>
        ))}
        {needsMedia && (
          <Select label="Header Media" value={data.media.find((item) => item.id === config.mediaId)?.name ?? "Choose Media"} options={["Choose Media", ...data.media.map((item) => item.name)]} onChange={(name) => { const media = data.media.find((item) => item.name === name); set({ ...config, mediaId: media?.id }); }} />
        )}
      </div>
    );
  }
  if (node.kind === "Contact") {
    const config = parse(node.value);
    const fields = data.settings.contactFields ?? [];
    return (
      <div className="space-y-2">
        <Field label="Set Tags (Comma Separated; Replaces Existing Tags)">
          <Input value={Array.isArray(config.tags) ? config.tags.join(", ") : ""} onChange={(event) => { const tags = event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean); const rest = without(config, "tags"); set(tags.length ? { ...rest, tags } : rest); }} />
        </Field>
        <Field label="Set Internal Notes">
          <Textarea maxLength={10000} value={typeof config.notes === "string" ? config.notes : ""} onChange={(event) => { const rest = without(config, "notes"); set(event.target.value ? { ...rest, notes: event.target.value } : rest); }} />
        </Field>
        {fields.map((def) => (
          <Field key={def.key} label={`Set ${def.label}`}>
            <Input maxLength={200} value={config.attributes?.[def.key] ?? ""} onChange={(event) => { const attributes = { ...config.attributes, [def.key]: event.target.value }; if (!event.target.value) delete attributes[def.key]; const rest = without(config, "attributes"); set(Object.keys(attributes).length ? { ...rest, attributes } : rest); }} />
          </Field>
        ))}
        <p className="text-[10px] text-slate-500">Automation Can Only Change Tags, Notes And Custom Fields. It Can Never Grant Consent Or Change A Contact&apos;s Identity.</p>
      </div>
    );
  }
  return null;
}
