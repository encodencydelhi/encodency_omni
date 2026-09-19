"use client";

import { LockIcon, PencilIcon, PinIcon, PinOffIcon, StickyNoteIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { useCurrentStaff } from "../data/capability-provider";
import { relativeTime } from "../data/clock";
import { NOTE_TAGS } from "../data/config";
import { describeError, useCompanyMutations } from "../data/hooks";
import type { CompanyInternalNote, InternalNoteTag } from "../data/types";
import { useUnsavedGuard } from "../hooks/use-unsaved-guard";
import { Panel } from "./primitives";

function TagPicker({ value, onChange }: { value: InternalNoteTag[]; onChange: (tags: InternalNoteTag[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Note tags">
      {NOTE_TAGS.map((tag) => {
        const active = value.includes(tag.value);
        return (
          <button
            key={tag.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? value.filter((item) => item !== tag.value) : [...value, tag.value])}
            className={cn(
              "rounded-sm border px-2 py-0.5 text-2xs font-medium transition-colors",
              active ? "border-primary/30 bg-primary-subtle text-primary" : "border-border-strong bg-card text-muted-foreground hover:bg-accent",
            )}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}

function NoteEditor({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  initial?: { content: string; tags: InternalNoteTag[] };
  submitLabel: string;
  onSubmit: (value: { content: string; tags: InternalNoteTag[] }) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [content, setContent] = useState(initial?.content ?? "");
  const [tags, setTags] = useState<InternalNoteTag[]>(initial?.tags ?? []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = content !== (initial?.content ?? "") || JSON.stringify(tags) !== JSON.stringify(initial?.tags ?? []);
  const valid = content.trim().length > 0;

  const save = async (): Promise<boolean> => {
    if (!valid) return false;
    setPending(true);
    setError(null);
    try {
      await onSubmit({ content: content.trim(), tags });
      setContent(initial?.content ?? "");
      setTags(initial?.tags ?? []);
      return true;
    } catch (failure) {
      setError(describeError(failure).message);
      return false;
    } finally {
      setPending(false);
    }
  };

  // Only an edit (which has somewhere to go back to) needs the leave-guard.
  const guard = useUnsavedGuard({ dirty: Boolean(onCancel) && dirty, onDiscard: () => onCancel?.(), onSave: save, label: "this note" });

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        className="min-h-16"
        placeholder="Write an internal note. Only Super Admin staff can see it."
        aria-label="Internal note"
        autoFocus={autoFocus}
        aria-invalid={Boolean(error)}
      />
      <TagPicker value={tags} onChange={setTags} />
      {error ? <p role="alert" className="text-2xs text-danger">{error}</p> : null}
      <div className="flex justify-end gap-1.5">
        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={guard.requestClose} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        <Button
          size="sm"
          disabled={pending || !valid || !dirty}
          onClick={async () => {
            if ((await save()) && onCancel) onCancel();
          }}
        >
          {submitLabel}
        </Button>
      </div>
      {guard.guardDialog}
    </div>
  );
}

/**
 * Internal notes are a Super Admin working area. They are stored on the tenant
 * record but the company-facing product never reads them.
 */
export function CompanyNotesPanel({ companyId, notes, canManage }: { companyId: string; notes: CompanyInternalNote[]; canManage: boolean }) {
  const mutations = useCompanyMutations();
  const me = useCurrentStaff();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CompanyInternalNote | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const togglePin = async (note: CompanyInternalNote) => {
    try {
      await mutations.setNotePinned(companyId, note.id, !note.pinned);
    } catch (failure) {
      toast.error(describeError(failure).message);
    }
  };

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-1.5">
          Internal notes
          <span className="inline-flex items-center gap-1 rounded-sm bg-neutral-subtle px-1.5 py-px text-[11px] font-medium text-neutral">
            <LockIcon className="size-3" aria-hidden />
            Super Admin only
          </span>
        </span>
      }
      description="Never shown to the company."
    >
      <div className="space-y-3">
        {canManage ? (
          <NoteEditor
            submitLabel="Add note"
            onSubmit={async (value) => {
              await mutations.addNote(companyId, value);
              toast.success("Note added");
            }}
          />
        ) : null}

        {notes.length === 0 ? (
          <EmptyState icon={StickyNoteIcon} size="sm" title="No internal notes yet" description="Record context other staff should know before touching this account." />
        ) : (
          <ul className="divide-y divide-border rounded-sm border border-border">
            {notes.map((note) => {
              const own = note.authorId === me.id;
              return (
                <li key={note.id} className={cn("space-y-1.5 px-3 py-2.5", note.pinned && "bg-warning-subtle/30")}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-2xs text-muted-foreground">
                      <span className="font-medium text-foreground">{note.authorName}</span> · <span title={formatDateTime(note.createdAt)}>{relativeTime(note.createdAt)}</span>
                      {note.updatedAt !== note.createdAt ? " · edited" : ""}
                    </p>
                    {canManage ? (
                      <div className="flex shrink-0 items-center">
                        <Button variant="ghost" size="icon-sm" aria-label={note.pinned ? "Unpin note" : "Pin note"} onClick={() => void togglePin(note)}>
                          {note.pinned ? <PinOffIcon /> : <PinIcon />}
                        </Button>
                        {own ? (
                          <>
                            <Button variant="ghost" size="icon-sm" aria-label="Edit note" onClick={() => setEditingId(note.id)}>
                              <PencilIcon />
                            </Button>
                            <Button variant="ghost" size="icon-sm" aria-label="Delete note" onClick={() => setDeleting(note)}>
                              <Trash2Icon />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {editingId === note.id ? (
                    <NoteEditor
                      initial={{ content: note.content, tags: note.tags }}
                      submitLabel="Save"
                      autoFocus
                      onCancel={() => setEditingId(null)}
                      onSubmit={async (value) => {
                        await mutations.updateNote(companyId, note.id, value);
                        toast.success("Note updated");
                      }}
                    />
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-[0.8125rem] leading-relaxed text-foreground">
                        {note.pinned ? <PinIcon className="mr-1 inline size-3 text-warning" aria-label="Pinned" /> : null}
                        {note.content}
                      </p>
                      {note.tags.length > 0 ? (
                        <ul className="flex flex-wrap gap-1" aria-label="Note tags">
                          {note.tags.map((tag) => (
                            <li key={tag} className="rounded-sm border border-border-strong bg-neutral-subtle px-1.5 py-px text-[11px] font-medium capitalize text-neutral">
                              {tag}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && !deletePending && setDeleting(null)}
        title="Delete this note?"
        description="The note is removed for every Super Admin. This cannot be undone."
        confirmLabel="Delete note"
        variant="destructive"
        isPending={deletePending}
        onConfirm={async () => {
          if (!deleting) return;
          setDeletePending(true);
          try {
            await mutations.deleteNote(companyId, deleting.id);
            toast.success("Note deleted");
            setDeleting(null);
          } catch (failure) {
            toast.error(describeError(failure).message);
          } finally {
            setDeletePending(false);
          }
        }}
      />
    </Panel>
  );
}
