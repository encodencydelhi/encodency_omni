"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "../components/ui";
import { useGbp } from "../store/gbp-store";

/**
 * Registers a page as having unsaved work. While dirty, in-app link clicks
 * (including the admin sidebar) open the Stay / Discard / Save & leave dialog,
 * and closing the tab shows the browser prompt.
 */
export function useUnsavedChanges(dirty: boolean, save?: () => Promise<boolean>, label?: string) {
  const { registerGuard } = useGbp();
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    if (!dirty) return;
    registerGuard({ dirty, label, save: saveRef.current ? () => saveRef.current!() : undefined });
    return () => registerGuard(null);
  }, [dirty, label, registerGuard]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

/** Programmatic navigation that respects the guard (Cancel buttons, redirects after save). */
export function useGuardedNavigate() {
  const router = useRouter();
  const { guardRef } = useGbp();
  return useCallback(
    (href: string, { force }: { force?: boolean } = {}) => {
      if (!force && guardRef.current?.dirty) {
        window.dispatchEvent(new CustomEvent("gbp:guarded-navigate", { detail: href }));
        return;
      }
      router.push(href);
    },
    [guardRef, router],
  );
}

export function UnsavedChangesDialog() {
  const { guardRef, registerGuard } = useGbp();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState<{ href: string; label?: string; canSave: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!guardRef.current?.dirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same-page anchors (Profile section links) are not navigation.
      if (url.pathname === pathname && url.hash) return;
      event.preventDefault();
      event.stopPropagation();
      setPending({
        href: `${url.pathname}${url.search}${url.hash}`,
        label: guardRef.current.label,
        canSave: Boolean(guardRef.current.save),
      });
    };
    const onProgrammatic = (event: Event) =>
      setPending({
        href: (event as CustomEvent<string>).detail,
        label: guardRef.current?.label,
        canSave: Boolean(guardRef.current?.save),
      });

    document.addEventListener("click", onClick, true);
    window.addEventListener("gbp:guarded-navigate", onProgrammatic);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("gbp:guarded-navigate", onProgrammatic);
    };
  }, [guardRef, pathname]);

  const leave = (href: string) => {
    registerGuard(null);
    setPending(null);
    router.push(href);
  };

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && !saving && setPending(null)}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-[420px] gap-0 p-0">
        <DialogHeader className="px-5 pt-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#FEF7E0] text-[#B06000]">
              <AlertTriangle className="size-4.5" />
            </span>
            <div>
              <DialogTitle className="text-[15px] text-[#202124]">You have unsaved changes</DialogTitle>
              <DialogDescription className="mt-1 text-[12.5px] leading-5 text-[#3C4043]">
                {pending?.label ? `Changes to ${pending.label} have not been saved.` : "Your changes have not been saved."} Leaving now discards them.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-5 border-t border-[#E8EAED] px-5 py-3">
          <Button variant="ghost" onClick={() => setPending(null)} disabled={saving}>
            Stay
          </Button>
          <Button variant="danger" onClick={() => pending && leave(pending.href)} disabled={saving}>
            Discard changes
          </Button>
          {pending?.canSave && (
            <Button
              variant="primary"
              loading={saving}
              onClick={async () => {
                const target = pending?.href;
                const save = guardRef.current?.save;
                if (!target || !save) return;
                setSaving(true);
                const ok = await save();
                setSaving(false);
                // On failure the page shows what needs fixing, so step out of the way.
                if (ok) leave(target);
                else setPending(null);
              }}
            >
              Save &amp; leave
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
