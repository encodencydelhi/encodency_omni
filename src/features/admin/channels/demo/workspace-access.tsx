"use client";
import { createContext, useContext, type ReactNode } from "react";
interface AccessValue { canEdit:boolean;canManage:boolean;label:string;canSend?:boolean;canConfigure?:boolean;canBill?:boolean; }
const Access = createContext<AccessValue>({ canEdit: false, canManage: false, label: "Read-only" });
export function WorkspaceAccess({ value, children }: { value: AccessValue; children: ReactNode }) { return <Access.Provider value={value}>{children}</Access.Provider>; }
export const useWorkspaceAccess = () => useContext(Access);
