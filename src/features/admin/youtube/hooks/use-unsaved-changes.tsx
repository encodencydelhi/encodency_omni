"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "../components/ui";
import { useYouTube } from "../store/youtube-store";
export function useUnsavedChanges(dirty: boolean, save?: () => Promise<boolean>, label?: string) {
  const { registerGuard } = useYouTube();
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
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

export function useGuardedNavigate() {
  const router = useRouter();
  const { guardRef } = useYouTube();
  return useCallback(
    (href: string, { force }: { force?: boolean } = {}) => {
      if (!force && guardRef.current?.dirty) {
        window.dispatchEvent(new CustomEvent("yt:guarded-navigate", { detail: href }));
        return;
      }
      router.push(href);
    },
    [guardRef, router],
  );
}

export function UnsavedChangesDialog() {
  const { guardRef, registerGuard } = useYouTube();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState<{ href: string; label?: string; canSave: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!guardRef.current?.dirty || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === pathname && url.hash) return;
      e.preventDefault();
      e.stopPropagation();
      setPending({ href: `${url.pathname}${url.search}${url.hash}`, label: guardRef.current.label, canSave: Boolean(guardRef.current.save) });
    };
    const onProgrammatic = (e: Event) =>
      setPending({ href: (e as CustomEvent<string>).detail, label: guardRef.current?.label, canSave: Boolean(guardRef.current?.save) });
    document.addEventListener("click", onClick, true);
    window.addEventListener("yt:guarded-navigate", onProgrammatic);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("yt:guarded-navigate", onProgrammatic);
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
            <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#FFF7E8] text-[#B54708]">
              <AlertTriangle className="size-4.5" />
            </span>
            <div>
              <DialogTitle className="text-[15px] text-[#0F1B3D]">You have unsaved changes</DialogTitle>
              <DialogDescription className="mt-1 text-[12.5px] leading-5 text-[#3C4A66]">
                {pending?.label ? `Changes to ${pending.label} haven't been saved.` : "Your changes haven't been saved."} If you leave now they&apos;ll be lost.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-5 border-t border-[#EEF1F5] px-5 py-3">
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
              Save & leave
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
