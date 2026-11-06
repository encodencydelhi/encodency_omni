"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { appDialogQueue, type DialogOptions } from "@/lib/ui-dialog-store";
import { ConfirmDialog } from "./confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function TextDialog({ options }: { options: DialogOptions }) {
  const [value, setValue] = useState(options.initialValue || "");
  return <Dialog open onOpenChange={open => { if (!open) appDialogQueue.settle(null); }}><DialogContent><DialogHeader><DialogTitle>{options.title}</DialogTitle><DialogDescription>{options.description}</DialogDescription></DialogHeader><form onSubmit={event => { event.preventDefault(); appDialogQueue.settle(value); }} className="space-y-4"><label className="grid gap-2 text-sm">{options.inputLabel || "Value"}<Input autoFocus value={value} onChange={event => setValue(event.target.value)} /></label><DialogFooter><Button type="button" variant="outline" onClick={() => appDialogQueue.settle(null)}>{options.cancelLabel || "Cancel"}</Button><Button type="submit">{options.confirmLabel || "Apply"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
export function AppDialogHost() {
  const current = useSyncExternalStore(appDialogQueue.subscribe, appDialogQueue.snapshot, () => null);
  useEffect(() => () => appDialogQueue.cancelAll(), []);
  if (!current) return null;
  return current.kind === "prompt" ? <TextDialog key={current.id} options={current} /> : <ConfirmDialog key={current.id} open title={current.title} description={current.description} confirmLabel={current.confirmLabel} cancelLabel={current.cancelLabel} onOpenChange={open => { if (!open) appDialogQueue.settle(false); }} onConfirm={() => appDialogQueue.settle(true)} />;
}
