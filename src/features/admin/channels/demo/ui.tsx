"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { integrationNotice } from "./mock-service";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { nativeWhatsAppEnabled } from "./native-api";
export function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) { return <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-2xs"><div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3"><h2 className="text-sm font-bold break-words text-slate-900">{title}</h2>{actions}</div>{children}</section>; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-600">{label}{children}</label>; }
export const control = "h-9 w-full min-w-0 rounded-sm border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:outline-emerald-600";
export function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) { return <Field label={label}><select aria-label={label} className={control} value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select></Field>; }
export function Badge({ children }: { children: ReactNode }) {
 const text=String(children); const tone=/Failed|Rejected|Opted Out/.test(text)?"border-rose-100 bg-rose-50 text-rose-700":/Pending|Scheduled|Not Connected/.test(text)?"border-amber-100 bg-amber-50 text-amber-800":/Draft/.test(text)?"border-slate-200 bg-slate-50 text-slate-600":"border-emerald-100 bg-emerald-50 text-emerald-800";
 return <span className={`inline-flex rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{children}</span>;
}
export function FutureAction({ label }: { label: string }) { return <div className="space-y-1"><Button size="sm" variant="outline" disabled title={integrationNotice}>{label}</Button><p className="text-[10px] text-slate-500">{integrationNotice}</p></div>; }
export function Modal({ title, open, onClose, children, dirty = false }: { title: string; open: boolean; onClose: () => void; children: ReactNode; dirty?: boolean }) {
 const [discard,setDiscard]=useState(false);
 return <><Dialog open={open} onOpenChange={value=>{if(!value){if(dirty)setDiscard(true);else onClose();}}}><DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto bg-white text-slate-900"><DialogTitle>{title}</DialogTitle><DialogDescription>{nativeWhatsAppEnabled?"Selected Client Workspace · Simulated Actions Are Stored Without Contacting Meta.":"Demo Workspace · Changes Stay In This Browser Session."}</DialogDescription>{children}</DialogContent></Dialog><ConfirmDialog open={discard} onOpenChange={setDiscard} title="Discard Unsaved Changes?" description="Your unsaved edits will be lost." confirmLabel="Discard Changes" onConfirm={()=>{setDiscard(false);onClose();}}/></>;
}
export function Empty({ text = "No Results", onReset }: { text?: string; onReset?: () => void }) { return <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500"><p>{text}</p>{onReset && <Button className="mt-3" variant="outline" size="sm" onClick={onReset}>Reset Filters</Button>}</div>; }
export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
 const [page,setPage]=useState(0);const [size,setSize]=useState(10);const pages=Math.max(1,Math.ceil(rows.length/size));const current=Math.min(page,pages-1);const visible=rows.slice(current*size,(current+1)*size);
 return <div className="min-w-0 max-w-full"><div className="max-w-full overflow-x-auto"><table aria-label={headers[0]+" Records"} className="w-full text-left text-xs"><thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-500">{headers.map(header=><th key={header} className="whitespace-nowrap px-3 py-2.5 font-semibold">{header}</th>)}</tr></thead><tbody>{visible.map((row,index)=><tr key={index} className="border-b border-slate-100 last:border-0">{row.map((cell,column)=><td key={column} className="max-w-[360px] break-words px-3 py-3">{cell}</td>)}</tr>)}</tbody></table></div>{!rows.length?<Empty/>:<div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"><span>{current*size+1}–{Math.min((current+1)*size,rows.length)} Of {rows.length}</span><div className="flex flex-wrap items-center gap-2"><label>Rows <select aria-label="Rows Per Page" className="rounded border bg-white p-1" value={size} onChange={event=>{setSize(Number(event.target.value));setPage(0);}}>{[10,25,50].map(value=><option key={value}>{value}</option>)}</select></label><Button type="button" size="xs" variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Previous</Button><span>Page {current+1} Of {pages}</span><Button type="button" size="xs" variant="outline" disabled={current===pages-1} onClick={()=>setPage(current+1)}>Next</Button></div></div>}</div>;
}

export function downloadCsv(name: string, rows: (string | number)[][]) {
 const csv=rows.map(row=>row.map(cell=>'"'+String(cell).replaceAll('"','""')+'"').join(",")).join("\r\n");
 const url=URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}));
 const link=document.createElement("a");link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
