"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { WebsitePageItem } from "../types";

interface DeletePageModalProps {
  page: WebsitePageItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pageId: string) => void;
}

export function DeletePageModal({ page, isOpen, onClose, onConfirm }: DeletePageModalProps) {
  if (!isOpen || !page) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-sm border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <header className="flex h-11 items-center justify-between border-b border-slate-100 bg-rose-50/50 px-4">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="size-4" />
            <h3 className="text-xs font-bold">Delete Website Page</h3>
          </div>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-sm text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to permanently delete <b className="text-slate-900">{page.name}</b> (
            <span className="font-mono text-blue-600">{page.slug}</span>)?
          </p>
          <div className="rounded-sm bg-rose-50 border border-rose-200/80 p-2.5 text-[11px] text-rose-800">
            This action will unpublish the page and cause incoming traffic to return a 404 error until a 301 redirect is configured.
          </div>

          <footer className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(page.id);
                onClose();
              }}
              className="flex h-8 items-center gap-1.5 rounded-sm bg-rose-600 hover:bg-rose-700 px-3.5 text-xs font-bold text-white shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              <span>Delete Page</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
