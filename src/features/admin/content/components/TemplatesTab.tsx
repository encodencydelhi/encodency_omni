"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { ApiError } from "@/types/api";
import { useContentAccess } from "../live/use-content-access";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/components/shared/search-input";
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
  const {canWrite} = useContentAccess();
  const [pendingArchive, setPendingArchive] = useState<TemplateRecord | null>(null);
  const [removing, setRemoving] = useState(false);
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
    if (!companyId || !form || saving || !canWrite) return;
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
      setCat(saved.category);
      setSearch("");
      reload();
    } catch (err) {
      toast.error(ApiError.isApiError(err) ? err.message : "The template could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (t: TemplateRecord) => {
    if (!companyId || removing || !canWrite) return;
    setRemoving(true);
    try {
      await templatesApi.archive(companyId, t.id);
      toast.success("Template removed");
      setSelectedId(null);
      setPendingArchive(null);
      reload();
    } catch (err) {
      toast.error(ApiError.isApiError(err) ? err.message : "The template could not be removed.");
    } finally { setRemoving(false); }
  };

  const filterNames = ["All", ...categories];

  return (
    <>
    <div className="grid min-w-0 grid-cols-1 items-start gap-1 xl:grid-cols-[180px_minmax(0,1fr)_320px]">
      <Card className="[&>div]:p-2" title="Categories">
        <div className="space-y-px">
          {filterNames.map((c) => (
            <button key={c} onClick={() => { setCat(c); setSelectedId(null); }} className={cn("flex w-full items-center rounded-sm px-2.5 py-1.5 text-left text-[12px] font-medium transition", cat === c ? "bg-primary-subtle text-primary" : "text-muted-foreground hover:bg-slate-50 hover:text-foreground")}>{c}</button>
          ))}
        </div>
      </Card>

      <Card
        title={`Templates · ${filtered.length}`}
        subtitle="Starter wording from the platform, plus the templates your team saves."
        action={
          <div className="flex flex-wrap items-center gap-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search templates..." aria-label="Search templates" className="w-48" />
            <Button size="sm" onClick={openCreate} disabled={!companyId || !canWrite || loading || Boolean(error) || !categories.length}>
              <Plus className="size-3.5" /> New Template
            </Button>
          </div>
        }
      >
        {!companyId ? <p>Select a company to view templates.</p> : loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-[#7A87A0]"><Loader2 className="size-4 animate-spin" /> Loading templates...</div>
        ) : error ? (
          <div className="py-10 text-center text-[12px] text-[#B42318]">
            {error}
            <button onClick={reload} className="ml-2 font-semibold text-[#1769DF] hover:underline">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-[12px] text-[#7A87A0]">No templates match. Try another category, or save a new one.</div>
        ) : (
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((t) => (
              <button key={t.id} onClick={() => setSelectedId(t.id)} className={cn("rounded-sm border p-2.5 text-left transition-colors", active?.id === t.id ? "border-primary/40 bg-primary-subtle" : "border-[#E2E8F0] bg-white hover:bg-slate-50")}>
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="info">{t.category}</Badge>
                  <Badge tone={t.source === "starter" ? "neutral" : "success"}>{t.source === "starter" ? "Starter" : "Yours"}</Badge>
                </div>
                <p className="mt-1.5 truncate text-[13px] font-semibold text-[#172044]">{t.title}</p>
                <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs leading-4 text-muted-foreground">{t.content}</p>
              </button>
            ))}
          </div>
        )}
      </Card>

      {form ? (
        <Card title={form.id ? "Edit template" : "New template"} className="xl:sticky xl:top-[108px]">
          <div className="space-y-2 text-[0.8125rem]">
            <label className="block font-medium text-[#172044]">Title
              <Input value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 font-normal" />
            </label>
            <div className="block font-medium text-[#172044]">Category
              <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                <SelectTrigger aria-label="Category" className="mt-1 font-normal"><SelectValue placeholder="Choose a category" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <label className="block font-medium text-[#172044]">Template text
              <Textarea value={form.content} maxLength={10000} rows={8} spellCheck onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-1 resize-y font-normal" />
            </label>
            <label className="block font-medium text-[#172044]">Hashtags (optional)
              <Input value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} placeholder="#launch #news" className="mt-1 font-normal" />
            </label>
            <div className="flex gap-1 pt-1">
              <Button size="sm" className="flex-1" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null} Save Template
              </Button>
              <Button size="sm" variant="outline" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </Card>
      ) : active ? (
        <Card title="Preview" className="xl:sticky xl:top-[108px]">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="size-3.5" /> {active.category} - {active.source === "starter" ? "Starter template" : "Your template"}</div>
          <p className="mt-1 text-[13px] font-semibold text-[#172044]">{active.title}</p>
          <p className="mt-2 whitespace-pre-line rounded-sm border border-[#EDF1F5] bg-[#F8FAFD] p-2.5 text-[13px] leading-5 text-[#33445F]">{active.content}</p>
          {active.hashtags.length > 0 && <p className="mt-1.5 text-xs font-semibold text-primary">{active.hashtags.join(" ")}</p>}
          <Button
            size="sm"
            className="mt-2.5 w-full"
            onClick={() => onUseTemplate?.({ caption: active.content, hashtags: active.hashtags })}
            disabled={!onUseTemplate}
          >
            Use this template
          </Button>
          {active.source === "company" && canWrite && (
            <div className="mt-1 flex gap-1">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(active)}><Pencil className="size-3.5" /> Edit</Button>
              <Button size="sm" variant="outline" className="flex-1 border-danger/30 text-danger hover:bg-danger-subtle" onClick={() => setPendingArchive(active)}><Trash2 className="size-3.5" /> Remove</Button>
            </div>
          )}
        </Card>
      ) : null}
    </div>
    <AlertDialog open={Boolean(pendingArchive)} onOpenChange={open => {if(!open&&!removing)setPendingArchive(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this template?</AlertDialogTitle><AlertDialogDescription>{pendingArchive?.title} will be removed from your company template library. Existing drafts are kept.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel><Button disabled={removing} onClick={()=>pendingArchive&&void archive(pendingArchive)}>{removing?"Removing...":"Remove template"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}
