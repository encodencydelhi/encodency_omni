"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useMetaConnection, type MetaConnection } from "./live/meta-hooks";

const Context = createContext<MetaConnection | null>(null);

/** Mounted once by `app/admin/meta/layout.tsx`, so the hub, Facebook, Instagram, Settings and Ads share one connection read. */
export function MetaConnectionProvider({ children }: { children: ReactNode }) {
  const value = useMetaConnection();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useMeta(): MetaConnection {
  const value = useContext(Context);
  if (!value) throw new Error("useMeta must be used inside <MetaConnectionProvider>.");
  return value;
}
