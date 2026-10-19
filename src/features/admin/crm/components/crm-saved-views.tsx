"use client";

import { useEffect, useState } from "react";
import { Bookmark, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface SavedView<T> { id: string; name: string; state: T }

export function CrmSavedViews<T extends Record<string, unknown>>({ namespace, state, onApply }: { namespace: string; state: T; onApply: (state: T) => void }) {
  const storageKey = `omni.crm.saved-views.${namespace}`;
  const [views, setViews] = useState<Array<SavedView<T>>>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setViews(JSON.parse(localStorage.getItem(storageKey) || "[]") as Array<SavedView<T>>); }
      catch { setViews([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const persist = (next: Array<SavedView<T>>) => { setViews(next); localStorage.setItem(storageKey, JSON.stringify(next)); };
  const save = () => {
    const clean = name.trim();
    if (!clean) return;
    const existing = views.find((view) => view.name.toLowerCase() === clean.toLowerCase());
    const item = { id: existing?.id ?? crypto.randomUUID(), name: clean, state };
    persist(existing ? views.map((view) => view.id === existing.id ? item : view) : [...views, item]);
    setName(""); setOpen(false); toast.success(existing ? "Saved view updated" : "View saved");
  };
  const remove = (id: string) => { persist(views.filter((view) => view.id !== id)); toast.success("Saved view removed"); };

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Bookmark className="size-3.5" /> Views</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {views.length ? views.map((view) => <DropdownMenuItem key={view.id} className="flex justify-between gap-2" onClick={() => onApply(view.state)}><span className="truncate">{view.name}</span><button type="button" aria-label={`Delete ${view.name}`} onClick={(event) => { event.stopPropagation(); remove(view.id); }}><Trash2 className="size-3.5 text-red-500" /></button></DropdownMenuItem>) : <DropdownMenuItem disabled>No saved views</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setOpen(true)}><Save className="size-3.5" /> Save current view</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Save CRM View</DialogTitle><DialogDescription>Save the current search and filters for quick access.</DialogDescription></DialogHeader><Input autoFocus placeholder="e.g. My hot leads" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); }} /><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!name.trim()} onClick={save}>Save View</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
