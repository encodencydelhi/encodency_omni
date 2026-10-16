"use client";

import { useState } from "react";
import { AlertTriangle, ShieldCheck, TestTube2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { automationApi } from "../../data/automation-api";
import { errorMessage } from "../../data/hooks";
import type { AutomationNode } from "../../data/types";
import type { NodeTestResult } from "../../data/trace-types";
import { parseJsonObject } from "./debugger-utils";

const SAMPLE = JSON.stringify({ name: "Sample Contact", email: "sample@example.com", score: 80 }, null, 2);

function Json({ value }: { value: unknown }) {
  return <pre className="max-h-48 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] leading-relaxed text-slate-700">{JSON.stringify(value, null, 2)}</pre>;
}

/**
 * Tests one node against sample JSON. The server renders templates and evaluates conditions with pure functions; it never calls a
 * provider, changes a record or sends a message. Node types it cannot evaluate faithfully report a limitation instead of a result.
 * The node is sent exactly as it is in the editor, so unsaved configuration can be tested. Sample data is not stored.
 */
export function NodeTestDialog({ open, onClose, clientId, workflowId, node }: { open: boolean; onClose: () => void; clientId: string; workflowId: string; node: AutomationNode }) {
  const [sampleText, setSampleText] = useState(SAMPLE);
  const [schemaText, setSchemaText] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<NodeTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sample = parseJsonObject(sampleText);
  const schema = parseJsonObject(schemaText);
  const ready = sample.ok && schema.ok;

  const run = async () => {
    if (!sample.ok || !schema.ok) return;
    setRunning(true); setError(null);
    try {
      const rest = Object.fromEntries(Object.entries(node).filter(([key]) => key !== "position"));
      setResult(await automationApi.testNode(clientId, workflowId, { node: rest, sample: sample.value, ...(schemaText.trim() ? { inputSchema: schema.value } : {}) }));
    } catch (e) { setError(errorMessage(e)); toast.error(errorMessage(e)); } finally { setRunning(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent overlayClassName="z-[130]" className="z-[130] max-h-[90vh] w-[min(900px,96vw)] max-w-none overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="border-b border-slate-200 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-[14px]"><TestTube2 className="size-4 text-sky-600" />Test Node · {node.label}</DialogTitle>
          <DialogDescription className="text-[11px]">Evaluate this node against sample data. No message is sent and no record is changed.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[calc(90vh-5rem)] grid-cols-1 overflow-hidden md:grid-cols-[20rem_1fr]">
          <div className="space-y-3 overflow-y-auto border-r border-slate-200 p-3">
            <div>
              <label htmlFor="node-sample" className="text-[10px] font-semibold text-slate-600">Sample Input (JSON)</label>
              <textarea id="node-sample" value={sampleText} onChange={(e) => setSampleText(e.target.value)} spellCheck={false} rows={9} aria-invalid={!sample.ok} className={`mt-1 w-full rounded border bg-white p-2 font-mono text-[11px] ${sample.ok ? "border-slate-200" : "border-red-400"}`} />
              {!sample.ok ? <p className="mt-1 text-[10px] text-red-700" role="alert">{sample.error}</p> : null}
            </div>
            <div>
              <label htmlFor="node-schema" className="text-[10px] font-semibold text-slate-600">Input Schema (Optional)</label>
              <textarea id="node-schema" value={schemaText} onChange={(e) => setSchemaText(e.target.value)} spellCheck={false} rows={5} placeholder={'{ "type": "object", "required": ["email"], "properties": { "score": { "type": "number" } } }'} aria-invalid={!schema.ok} className={`mt-1 w-full rounded border bg-white p-2 font-mono text-[11px] ${schema.ok ? "border-slate-200" : "border-red-400"}`} />
              {!schema.ok ? <p className="mt-1 text-[10px] text-red-700" role="alert">{schema.error}</p> : <p className="mt-1 text-[10px] text-slate-500">Supports type, required, properties and enum.</p>}
            </div>
            <button type="button" disabled={!ready || running} onClick={() => void run()} className="flex h-8 w-full items-center justify-center gap-1.5 rounded bg-sky-600 text-[12px] font-semibold text-white disabled:opacity-40"><TestTube2 className="size-3.5" />{running ? "Testing…" : "Run Node Test"}</button>
            <p className="flex gap-1.5 rounded border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-900"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" />Sample data is evaluated in memory and is not stored. Results are redacted.</p>
          </div>
          <div className="overflow-y-auto p-3">
            {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-[11px] text-red-900" role="alert">{error}</div> : null}
            {!result && !error ? <div className="flex min-h-[16rem] flex-col items-center justify-center gap-1 text-center"><TestTube2 className="size-6 text-slate-300" /><p className="text-[12px] font-semibold text-slate-800">No Test Yet</p><p className="max-w-xs text-[11px] text-slate-500">Edit the sample input and run the test to preview this node’s behaviour.</p></div> : null}
            {result ? <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5"><span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">SIMULATED</span><span className="text-[11px] text-slate-600">{result.actionId} · Side Effects: None</span></div>
              {!result.supported ? <div className="flex gap-2 rounded border border-slate-300 bg-slate-50 p-2.5" role="note"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-slate-500" /><div><p className="text-[12px] font-semibold text-slate-900">This Node Cannot Be Tested Here</p><p className="mt-0.5 text-[11px] text-slate-600">{result.limitation}</p><p className="mt-1 text-[10px] text-slate-500">No result is shown because showing one would be a guess.</p></div></div> : null}
              {result.supported && result.limitation ? <p className="flex gap-1.5 rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{result.limitation}</p> : null}
              {result.validation.length ? <div className="rounded border border-red-200 bg-red-50 p-2" role="alert"><p className="text-[11px] font-semibold text-red-900">Validation Errors</p><ul className="mt-1 space-y-0.5 text-[11px] text-red-900">{result.validation.map((item, index) => <li key={`${item.path}-${index}`}><span className="font-mono text-[10px]">{item.path}</span> — {item.message}</li>)}</ul></div> : result.supported ? <p className="text-[11px] text-emerald-700">No validation errors.</p> : null}
              {result.unresolvedVariables.length ? <div className="rounded border border-amber-200 bg-amber-50 p-2"><p className="text-[11px] font-semibold text-amber-900">Variables Missing From The Sample</p><p className="mt-1 text-[11px] text-amber-900">{result.unresolvedVariables.map((variable) => <code key={variable} className="mr-1.5 rounded bg-white px-1 font-mono text-[10px]">{`{{${variable}}}`}</code>)}</p><p className="mt-1 text-[10px] text-amber-800">These render as empty text.</p></div> : null}
              {result.result ? <div><p className="mb-1 text-[10px] font-semibold text-slate-500">Expected Output</p><Json value={result.result} /></div> : null}
              {result.supported && result.resolved ? <div><p className="mb-1 text-[10px] font-semibold text-slate-500">Rendered Configuration (Variable & Template Preview)</p><Json value={result.resolved} /></div> : null}
            </div> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
