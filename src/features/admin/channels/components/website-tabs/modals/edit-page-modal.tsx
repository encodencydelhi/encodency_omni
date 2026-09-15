"use client";

import { useState, useEffect } from "react";
import { X, Save, Layers } from "lucide-react";
import { toast } from "sonner";
import { WebsitePageItem } from "../types";

interface EditPageModalProps {
  page: WebsitePageItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPage: WebsitePageItem) => void;
}

export function EditPageModal({ page, isOpen, onClose, onSave }: EditPageModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState("Standard Page");
  const [status, setStatus] = useState<"Published" | "Draft" | "Scheduled">("Published");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");

  useEffect(() => {
    if (page) {
      setName(page.name);
      setSlug(page.slug);
      setTemplate(page.template || "Standard Page");
      setStatus(page.status);
      setMetaTitle(page.metaTitle || `${page.name} | Namo Gange Trust`);
      setMetaDesc(page.metaDesc || `Learn about ${page.name} and Namo Gange Trust initiatives.`);
    }
  }, [page]);

  if (!isOpen || !page) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please provide a page title");
      return;
    }
    const cleanSlug = slug.startsWith("/") ? slug : `/${slug}`;
    onSave({
      ...page,
      name: name.trim(),
      slug: cleanSlug,
      template,
      status,
      metaTitle,
      metaDesc,
      updated: "Just now",
    });
    toast.success(`Page "${name}" updated successfully!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-sm border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <header className="flex h-11 items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-sm bg-blue-600 text-white font-bold text-xs">
              <Layers className="size-3.5" />
            </span>
            <h3 className="text-xs font-bold text-slate-900">Edit Website Page</h3>
          </div>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-sm text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Page Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 w-full rounded-sm border border-slate-200 px-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              URL Slug <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center rounded-sm border border-slate-200 bg-slate-50 px-2.5 focus-within:ring-1 focus-within:ring-blue-500 focus-within:bg-white">
              <span className="text-[10.5px] font-semibold text-slate-400 select-none shrink-0">namogangetrust.org</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-8 flex-1 border-0 bg-transparent px-1 text-xs font-mono text-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Template</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="h-8 w-full rounded-sm border border-slate-200 px-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Standard Page">Standard Page</option>
                <option value="Landing Page">Landing Page</option>
                <option value="Donation Appeal">Donation Appeal</option>
                <option value="Event Registration">Event Registration</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="h-8 w-full rounded-sm border border-slate-200 px-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Published">Published (Live)</option>
                <option value="Draft">Draft</option>
                <option value="Scheduled">Scheduled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Meta Description (SEO)</label>
            <textarea
              value={metaDesc}
              onChange={(e) => setMetaDesc(e.target.value)}
              className="w-full min-h-[50px] rounded-sm border border-slate-200 p-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex h-8 items-center gap-1.5 rounded-sm bg-blue-600 hover:bg-blue-700 px-3.5 text-xs font-bold text-white shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Save className="size-3.5" />
              <span>Save Changes</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
