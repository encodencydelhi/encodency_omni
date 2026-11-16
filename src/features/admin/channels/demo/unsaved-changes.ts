"use client";
import { useEffect, useRef } from "react";
import { confirmAction } from "@/lib/ui-dialog-store";

interface TraverseEvent extends Event { navigationType?:string; destination?:{key?:string}; }
export function useUnsavedChanges(dirty: boolean) {
  const dirtyRef = useRef(dirty);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const ask = async (leave: () => void) => {
      if (pending) return;
      pending = true;
      const approved = await confirmAction("Your unsaved changes will be lost. Leave this draft?", { title: "Discard Unsaved Changes?", confirmLabel: "Leave Draft", cancelLabel: "Keep Editing" }, controller.signal);
      pending = false;
      if (approved && !controller.signal.aborted) { dirtyRef.current = false; leave(); }
    };
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      const action = event.target.closest<HTMLElement>('[role="menuitem"], nav[aria-label="WhatsApp Sections"] button');
      if ((!link && !action) || link?.target === "_blank" || link?.hasAttribute("download")) return;
      if (link && (link.href === window.location.href || link.getAttribute("href")?.startsWith("#"))) return;
      const target = link || action!;
      event.preventDefault(); event.stopImmediatePropagation();
      void ask(() => { if (target.isConnected) target.click(); });
    };
    const navigation = (window as Window & { navigation?: EventTarget & { traverseTo?: (key:string)=>unknown } }).navigation;
    const traverse = (event: Event) => {
      const change = event as TraverseEvent;
      if (change.navigationType !== "traverse" || !dirtyRef.current || !change.cancelable || !change.destination?.key || !navigation?.traverseTo) return;
      change.preventDefault();
      void ask(() => { navigation.traverseTo!(change.destination!.key!); });
    };
    document.addEventListener("click", click, true);
    navigation?.addEventListener("navigate", traverse);
    // No beforeunload listener: refresh/tab-close cannot show an app-rendered modal.
    return () => { controller.abort(); document.removeEventListener("click", click, true); navigation?.removeEventListener("navigate", traverse); };
  }, []);
  return { markSaved: () => { dirtyRef.current = false; } };
}
