"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";
import { Card } from "./ui-card";
import { templatesApi, type TemplateInput, type TemplateRecord } from "../live/templates-api";

export interface TemplateSeed {
  caption: string;
  hashtags: string[];
}

interface TemplatesTabProps {
  /** Opens the Create tab with this wording already in the editor. */
  onUseTemplate?: (seed: TemplateSeed) => void;
}

type FormState = { id: string | null; title: string; category: string; content: string; hashtags: string };

const EMPTY_FORM: FormState = { id: null, title: "", category: "", content: "", hashtags: "" };

function parseHashtags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function TemplatesTab({ onUseTemplate }: TemplatesTabProps = {}) {
  const { companyId, isReady } = useTenancyContext();
  const [items, setItems] = useState<TemplateRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!isReady || !companyId) return;
    let cancelled = false;
    templatesApi
      .list(companyId)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setCategories(result.categories);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(ApiError.isApiError(err) ? err.message : "Templates could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, companyId, reloadKey]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((t) => {
      if (cat !== "All" && t.category !== cat) return false;
      if (needle && !`${t.title}\n${t.content}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, cat, search]);

  const active = filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  const openCreate = () => setForm({ ...EMPTY_FORM, category: categories[0] ?? "" });
  const openEdit = (t: TemplateRecord) =>
    setForm({ id: t.id, title: t.title, category: t.category, content: t.content, hashtags: t.hashtags.join(" ") });

  const save = async () => {
    if (!companyId || !form) return;
    const input: TemplateInput = { title: form.title.trim(), category: form.category, content: form.content.trim(), hashtags: parseHashtags(form.hashtags) };
    if (!input.title || !input.content || !input.category) {
      toast.error("Add a title, a category and the template text.");
      return;
    }
    setSaving(true);
    try {
      const saved = form.id ? await templatesApi.update(companyId, form.id, input) : await templatesApi.create(companyId, input);
      toast.success(form.id ? "Template updated" : "Template saved");
      setForm(null);
      setSelectedId(saved.id);
      reload();
    } catch (err) {
      toast.error(ApiError.isApiError(err) ? err.message : "The template could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (t: TemplateRecord) => {
    if (!companyId) return;
    try {
      await templatesApi.archive(companyId, t.id);
      toast.success("Template removed");
      setSelectedId(null);
      reload();
    } catch (err) {
      toast.error(ApiError.isApiError(err) ? err.message : "The template could not be removed.");
    }
  };

  const filterNames = ["All", ...categories];

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[180px_minmax(0,1fr)_320px]">
      <Card className="[&>div]:p-2.5" title="Categories">
        <div className="space-y-px">
          {filterNames.map((c) => (
            <button key={c} onClick={() => { setCat(c); setSelectedId(null); }} className={cn("flex w-full items-center rounded-sm px-2.5 py-2 text-left text-[11.5px] font-semibold transition", cat === c ? "bg-[#F0F6FF] text-[#1769DF]" : "text-[#687797] hover:bg-slate-50")}>{c}</button>
          ))}
        </div>
      </Card>

      <Card
        title={`Templates · ${filtered.length}`}
        subtitle="Starter wording from the platform, plus the templates your team saves."
        action={
          <div className="flex items-center gap-2">
            <label className="flex h-8 w-44 items-center gap-1.5 rounded-sm border border-[#D9E1EC] px-2.5 text-[11.5px] text-[#7A87A0]">
              <Search className="size-3.5" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." spellCheck className="w-full bg-transparent outline-none" />
            </label>
            <button onClick={openCreate} className="flex h-8 items-center gap-1 rounded-sm bg-[#EB0711] px-2.5 text-[11.5px] font-semibold text-white hover:bg-[#D60811]">
              <Plus className="size-3.5" /> New template
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-[#7A87A0]"><Loader2 className="size-4 animate-spin" /> Loading templates...</div>
        ) : error ? (
          <div className="py-10 text-center text-[12px] text-[#B42318]">
            {error}
            <button onClick={reload} className="ml-2 font-semibold text-[#1769DF] hover:underline">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-[12px] text-[#7A87A0]">No templates match. Try another category, or save a new one.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((t) => (
              <button key={t.id} onClick={() => setSelectedId(t.id)} className={cn("rounded-sm border bg-white p-3 text-left transition", active?.id === t.id ? "border-[#1769DF] shadow-md ring-1 ring-blue-100" : "border-[#E2E8F0] hover:shadow-md")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-[#F0F6FF] px-1.5 py-px text-[9.5px] font-semibold text-[#1769DF]">{t.category}</span>
                  <span className={cn("rounded px-1.5 py-px text-[9.5px] font-semibold", t.source === "starter" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700")}>{t.source === "starter" ? "Starter" : "Yours"}</span>
                </div>
                <p className="mt-2 truncate text-[12.5px] font-semibold text-[#24365A]">{t.title}</p>
                <p className="mt-1 line-clamp-3 whitespace-pre-line text-[11px] leading-4 text-[#7A87A0]">{t.content}</p>
              </button>
            ))}
          </div>
        )}
      </Card>

      {form ? (
        <Card title={form.id ? "Edit template" : "New template"} className="xl:sticky xl:top-4">
          <div className="space-y-2 text-[11.5px]">
            <label className="block font-semibold text-[#33445F]">Title
              <input value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 h-8 w-full rounded-sm border border-[#D9E1EC] px-2 font-normal outline-none focus:border-[#1769DF]" />
            </label>
            <label className="block font-semibold text-[#33445F]">Category
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 h-8 w-full rounded-sm border border-[#D9E1EC] bg-white px-2 font-normal outline-none focus:border-[#1769DF]">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block font-semibold text-[#33445F]">Template text
              <textarea value={form.content} maxLength={10000} rows={8} spellCheck onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-1 w-full resize-y rounded-sm border border-[#D9E1EC] p-2 font-normal outline-none focus:border-[#1769DF]" />
            </label>
            <label className="block font-semibold text-[#33445F]">Hashtags (optional)
              <input value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} placeholder="#launch #news" className="mt-1 h-8 w-full rounded-sm border border-[#D9E1EC] px-2 font-normal outline-none focus:border-[#1769DF]" />
            </label>
            <div className="flex gap-2 pt-1">
              <button onClick={() => void save()} disabled={saving} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-sm bg-[#EB0711] text-[12px] font-semibold text-white hover:bg-[#D60811] disabled:opacity-60">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null} Save template
              </button>
              <button onClick={() => setForm(null)} disabled={saving} className="h-9 rounded-sm border px-3 text-[12px] font-semibold text-[#687797] hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </Card>
      ) : active ? (
        <Card title="Preview" className="xl:sticky xl:top-4">
          <div className="flex items-center gap-2 text-[11px] text-[#7A87A0]"><FileText className="size-3.5" /> {active.category} · {active.source === "starter" ? "Starter template" : "Your template"}</div>
          <p className="mt-1 text-[13px] font-semibold text-[#172044]">{active.title}</p>
          <p className="mt-2 whitespace-pre-line rounded-sm border border-[#EDF1F5] bg-[#F8FAFD] p-2.5 text-[12px] leading-5 text-[#33445F]">{active.content}</p>
          {active.hashtags.length > 0 && <p className="mt-1.5 text-[11.5px] font-semibold text-[#1769DF]">{active.hashtags.join(" ")}</p>}
          <button
            onClick={() => onUseTemplate?.({ caption: active.content, hashtags: active.hashtags })}
            disabled={!onUseTemplate}
            className="mt-2.5 h-9 w-full rounded-sm bg-[#EB0711] text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#D60811] disabled:opacity-60"
          >
            Use this template
          </button>
          {active.source === "company" && (
            <div className="mt-1.5 flex gap-2">
              <button onClick={() => openEdit(active)} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-sm border text-[11.5px] font-semibold text-[#687797] hover:bg-slate-50"><Pencil className="size-3.5" /> Edit</button>
              <button onClick={() => void archive(active)} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-sm border text-[11.5px] font-semibold text-[#B42318] hover:bg-red-50"><Trash2 className="size-3.5" /> Remove</button>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
