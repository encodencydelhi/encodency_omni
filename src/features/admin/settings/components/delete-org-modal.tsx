"use client";

import React, { useState } from "react";
import { Trash2, AlertTriangle, X, Loader2 } from "lucide-react";

interface DeleteOrgModalProps {
  open: boolean;
  orgName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteOrgModal({ open, orgName, onClose, onConfirm }: DeleteOrgModalProps) {
  const [typedConfirm, setTypedConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const isMatched = typedConfirm.trim() === orgName;

  const handleDelete = async () => {
    if (!isMatched) return;
    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-xl border border-red-200 shadow-2xl p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shrink-0">
              <Trash2 className="size-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111C3A]">Permanently Delete Organization</h3>
              <p className="text-[10px] text-red-600 font-medium">Irreversible action • Organization Owner privilege only</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="bg-red-50/60 border border-red-200 rounded-lg p-2.5 text-[10.5px] text-red-950 space-y-1">
          <div className="font-bold flex items-center gap-1 text-red-800">
            <AlertTriangle className="size-3.5" /> All Data Will Be Erased Immediately:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-red-900/90 pl-1">
            <li>12 team members will be permanently removed.</li>
            <li>4 client accounts, campaigns, and ad accounts unlinked.</li>
            <li>All scheduled posts, media studio assets, and CRM leads deleted.</li>
            <li>Historical analytics timeseries & DLQ automation logs purged.</li>
          </ul>
        </div>

        <div className="space-y-1 pt-1">
          <label className="block text-[10.5px] font-bold text-[#334155]">
            Type <span className="font-mono text-red-600 font-bold select-all bg-red-50 px-1 py-0.2 rounded">{orgName}</span> to confirm:
          </label>
          <input
            type="text"
            value={typedConfirm}
            onChange={(e) => setTypedConfirm(e.target.value)}
            placeholder={orgName}
            className="w-full h-8 px-2.5 rounded-md border border-[#CBD5E1] bg-white text-[11.5px] font-medium text-[#111C3A] focus:outline-none focus:border-red-500 font-mono"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F1F5F9]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-[#CBD5E1] text-[10.5px] font-semibold text-[#475569] hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isMatched || loading}
            className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            {loading ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
            Permanently Delete
          </button>
        </div>
      </div>
    </div>
  );
}
