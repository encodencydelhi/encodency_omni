export interface DialogOptions {
  kind: "confirm" | "prompt";
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  initialValue?: string;
  inputLabel?: string;
}
type Result = boolean | string | null;
export function createDialogQueue() {
  let current: (DialogOptions & { id: number }) | null = null;
  let sequence = 0;
  const waiting: Array<{ options: DialogOptions; resolve: (value: Result) => void; signal?: AbortSignal }> = [];
  let active: typeof waiting[number] | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  const advance = () => {
    active = waiting.shift();
    current = active ? { ...active.options, id: ++sequence } : null;
    notify();
  };
  const settle = (value: Result) => {
    const request = active;
    if (!request) return;
    active = undefined;
    current = null;
    request.resolve(value);
    advance();
  };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => current,
    settle,
    request(options: DialogOptions, signal?: AbortSignal): Promise<Result> {
      if (signal?.aborted) return Promise.resolve(null);
      return new Promise(resolve => {
        const request = { options, resolve, signal };
        waiting.push(request);
        const abort = () => {
          if (active === request) settle(null);
          else { const index = waiting.indexOf(request); if (index >= 0) { waiting.splice(index, 1); resolve(null); } }
        };
        signal?.addEventListener("abort", abort, { once: true });
        const original = request.resolve;
        request.resolve = value => { signal?.removeEventListener("abort", abort); original(value); };
        if (!active) advance();
      });
    },
    cancelAll() { const pending = [...(active ? [active] : []), ...waiting]; waiting.length = 0; active = undefined; current = null; pending.forEach(item => item.resolve(null)); notify(); },
  };
}
export const appDialogQueue = createDialogQueue();
export const confirmAction = (description: string, options: Partial<Omit<DialogOptions, "kind" | "description">> = {}, signal?: AbortSignal) =>
  appDialogQueue.request({ kind: "confirm", title: "Confirm Action", description, ...options }, signal).then(value => value === true);
export const requestText = (description: string, options: Partial<Omit<DialogOptions, "kind" | "description">> = {}) =>
  appDialogQueue.request({ kind: "prompt", title: "Add Link", inputLabel: "URL", description, ...options }).then(value => typeof value === "string" ? value : null);
