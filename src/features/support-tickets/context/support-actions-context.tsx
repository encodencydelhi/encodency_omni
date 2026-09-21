"use client";

import { createContext, useContext } from "react";
import type { FilterState } from "@/features/support-tickets/components/filters-drawer";

export interface SupportActionsContextType {
  openCreateDrawer: () => void;
  openSearchDrawer: () => void;
  openFiltersDrawer: () => void;
  filters: FilterState;
}

export const SupportActionsContext = createContext<SupportActionsContextType>({
  openCreateDrawer: () => {},
  openSearchDrawer: () => {},
  openFiltersDrawer: () => {},
  filters: { status: "all", priority: "all", company: "all", category: "all", assignedTo: "all" },
});

export function useSupportActions() {
  return useContext(SupportActionsContext);
}
