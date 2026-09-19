/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Issue Detail Drawer
 * Full operational management: status update, owner assignment, internal notes, audit timeline
 */

"use client";

import { useState } from "react";
import { CheckCircle2Icon, MessageSquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/utils/format";
import type { IntegrationIssue, IssueStatus } from "../data/types";
import {
  useAddIssueNote,
  useAssignIssueOwner,
  useUpdateIssueStatus,
} from "../data/hooks";
import { IssueSeverityBadge } from "./status-badges";

interface IssueDetailDrawerProps {
  issue: IntegrationIssue | null;
  isOpen: boolean;
  onClose: () => void;
}

const OWNERS = [
  { id: "usr_superadmin", name: "Platform Administrator", email: "admin@encodency.com" },
  { id: "usr_dev_vikram", name: "Vikram Malhotra", email: "vikram@encodency.com" },
  { id: "usr_lead_priya", name: "Priya Patel", email: "priya@encodency.com" },
];

export function IssueDetailDrawer({
  issue,
  isOpen,
  onClose,
}: IssueDetailDrawerProps) {
  const [noteContent, setNoteContent] = useState("");
  const updateStatus = useUpdateIssueStatus();
  const assignOwner = useAssignIssueOwner();
  const addNote = useAddIssueNote();

  if (!issue) return null;

  const handleStatusChange = (newStatus: IssueStatus) => {
    updateStatus.mutate({
      issueId: issue.id,
      newStatus,
    });
  };

  const handleOwnerChange = (ownerId: string) => {
    if (ownerId === "unassigned") {
      assignOwner.mutate({ issueId: issue.id, owner: null });
    } else {
      const selected = OWNERS.find((o) => o.id === ownerId);
      if (selected) {
        assignOwner.mutate({ issueId: issue.id, owner: selected });
      }
    }
  };

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    addNote.mutate({
      issueId: issue.id,
      content: noteContent.trim(),
    });
    setNoteContent("");
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-white border-l border-slate-200 p-0 flex flex-col justify-between"
      >
        <div className="p-5 overflow-y-auto space-y-4">
          <SheetHeader className="text-left space-y-1 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-slate-500">
                {issue.issueNumber}
              </span>
              <IssueSeverityBadge value={issue.severity} />
              <span className="text-xs text-slate-400 capitalize">• {issue.scope.replace("_", " ")}</span>
            </div>
            <SheetTitle className="text-base font-bold text-slate-900">
              {issue.title}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-600 leading-relaxed">
              {issue.summary}
            </SheetDescription>
          </SheetHeader>

          {/* Workflow & Assignment Controls */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Incident Workflow Status
              </Label>
              <Select
                value={issue.status}
                onValueChange={(val: IssueStatus) => handleStatusChange(val)}
              >
                <SelectTrigger className="text-xs bg-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="mitigated">Mitigated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Internal Assigned Owner
              </Label>
              <Select
                value={issue.internalOwner?.id ?? "unassigned"}
                onValueChange={handleOwnerChange}
              >
                <SelectTrigger className="text-xs bg-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {OWNERS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Affected Blast Radius */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-slate-800 uppercase tracking-wider">
              Affected Blast Radius
            </div>
            <div className="grid grid-cols-3 gap-1 text-center bg-white p-2.5 rounded-lg border border-slate-200">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {issue.affectedCompanyIds.length}
                </div>
                <div className="text-slate-500 font-medium">Companies</div>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {issue.affectedConnectionIds.length}
                </div>
                <div className="text-slate-500 font-medium">Connections</div>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {issue.affectedCapabilities.length}
                </div>
                <div className="text-slate-500 font-medium">Capabilities</div>
              </div>
            </div>

            {issue.affectedCompanyNames.length > 0 && (
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                <span className="text-slate-500 block mb-1 font-medium">
                  Impacted Tenant Organizations:
                </span>
                <div className="flex flex-wrap gap-1">
                  {issue.affectedCompanyNames.map((name) => (
                    <span
                      key={name}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-800 text-xs"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Investigation Notes Feed */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Internal Engineering Notes ({issue.investigationNotes.length})</span>
              <span className="text-slate-400 font-normal">Confidential to Super Admin</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {issue.investigationNotes.length === 0 ? (
                <div className="text-slate-400 italic p-3 text-center bg-slate-50 rounded-lg border border-slate-100">
                  No internal notes recorded yet.
                </div>
              ) : (
                issue.investigationNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/80 space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {note.authorName}
                      </span>
                      <span>{formatDateTime(note.createdAt)}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{note.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Input */}
            <div className="space-y-1 pt-1">
              <Textarea
                rows={2}
                placeholder="Add investigation telemetry, root cause, or mitigation notes..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="text-xs bg-white resize-none"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddNote}
                disabled={!noteContent.trim()}
                className="w-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white mt-1"
              >
                <MessageSquareIcon className="size-3.5 mr-1.5" />
                <span>Save Investigation Note</span>
              </Button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
            <div className="font-bold text-slate-800 uppercase tracking-wider">
              Incident Audit Trail
            </div>
            <div className="space-y-2">
              {issue.timeline.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start gap-2 text-slate-600"
                >
                  <div className="size-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">
                      {evt.action} •{" "}
                      <span className="font-normal text-slate-500">
                        {evt.actor}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{evt.details}</div>
                    <div className="text-xs text-slate-400">
                      {formatDateTime(evt.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Close Drawer
          </Button>

          {issue.status !== "resolved" && (
            <Button
              type="button"
              size="sm"
              onClick={() => handleStatusChange("resolved")}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <CheckCircle2Icon className="size-3.5 mr-1.5" />
              <span>Mark Issue Resolved</span>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
