"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/components/auth-provider";
import { apiClient } from "@/lib/api/client";
import { AiAssistantFloatingBot } from "./ai-assistant-floating-bot";
import { AssistantModal } from "./assistant-modal";
import { AssistantContext } from "./assistant-provider";
import type { AssistantBootstrap, AssistantReply } from "./types";
import { useAssistantChat, type AssistantChatApi } from "./use-assistant-chat";

/**
 * The Super Admin's own assistant: explains and opens the Super Admin pages and reads platform-wide counts
 * (companies, billing, tickets, WhatsApp health, API errors, integrations). Read-only; it never changes anything.
 * The chat lives in this browser tab only (the server does not keep Super Admin conversations).
 */
const PLATFORM = "platform";
const platformApi: AssistantChatApi = {
  chat: (_scope, body, signal) => apiClient.request<AssistantReply>({ method: "POST", path: "/super-admin/assistant/chat", body, signal }),
  conversations: async () => ({ items: [] }) as never,
  conversation: () => Promise.reject(new Error("Super Admin conversations are kept in this tab only.")),
  feedback: () => Promise.reject(new Error("Rating is not available here.")),
  linkTicket: async () => ({ linked: false }),
};

export function PlatformAssistant({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/super-admin";
  const { user } = useAuth();
  const enabled = user?.platformRole === "SUPER_ADMIN";
  const [isOpen, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const bootstrap = useQuery({
    queryKey: ["platform-assistant", "bootstrap", pathname],
    enabled: enabled && isOpen,
    queryFn: ({ signal }) => apiClient.request<AssistantBootstrap>({ method: "GET", path: "/super-admin/assistant/chat/bootstrap", query: { path: pathname }, signal }),
    staleTime: 60_000,
  });
  const close = useCallback(() => setOpen(false), []);
  const go = useCallback((path: string) => { setOpen(false); router.push(path); }, [router]);
  const chat = useAssistantChat({ userId: enabled ? user?.id : undefined, companyId: enabled ? PLATFORM : undefined, pathname, pageTitle: bootstrap.data?.page?.title, go, api: platformApi });
  const open = useCallback((question?: string) => { if (question) setDraft(question); setOpen(true); }, []);
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  if (!enabled) return <>{children}</>;
  return (
    <AssistantContext.Provider value={value}>
      {children}
      <AiAssistantFloatingBot />
      <AssistantModal
        open={isOpen}
        onOpenChange={setOpen}
        chat={chat}
        bootstrap={bootstrap.data}
        bootstrapLoading={bootstrap.isLoading}
        firstName={user?.name?.trim().split(/\s+/)[0]}
        draft={draft}
        onDraftChange={setDraft}
        onNavigate={close}
      />
    </AssistantContext.Provider>
  );
}
