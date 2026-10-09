"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useCompanyScope } from "@/features/support/hooks";
import { assistantApi } from "./api";
import { AssistantModal } from "./assistant-modal";
import { useAssistantChat } from "./use-assistant-chat";

interface AssistantContextValue {
  isOpen: boolean;
  /** Opens the assistant, optionally with a question already typed in the box. */
  open: (question?: string) => void;
  close: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistant(): AssistantContextValue {
  const context = useContext(AssistantContext);
  if (!context) throw new Error("useAssistant must be used inside an AssistantProvider");
  return context;
}

/** Owns the assistant for the whole admin area: one conversation, opened from anywhere (the sidebar's Help & Support). */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin";
  const { user } = useAuth();
  const { companyId, ready } = useCompanyScope();
  const [isOpen, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const bootstrap = useQuery({
    queryKey: ["assistant", companyId, "bootstrap", pathname],
    enabled: isOpen && ready,
    queryFn: ({ signal }) => assistantApi.bootstrap(companyId, pathname, typeof navigator !== "undefined" ? navigator.language : undefined, signal),
    staleTime: 60_000,
  });

  const close = useCallback(() => setOpen(false), []);
  const go = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router],
  );
  const chat = useAssistantChat({ userId: user?.id, companyId: companyId || undefined, pathname, pageTitle: bootstrap.data?.page?.title, go });

  const open = useCallback((question?: string) => {
    if (question) setDraft(question);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <AssistantContext.Provider value={value}>
      {children}
      <AssistantModal
        open={isOpen}
        onOpenChange={setOpen}
        chat={chat}
        bootstrap={bootstrap.data}
        bootstrapLoading={bootstrap.isLoading}
        firstName={firstName}
        draft={draft}
        onDraftChange={setDraft}
        onNavigate={close}
      />
    </AssistantContext.Provider>
  );
}
