"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DocumentListSkeleton } from "@/components/ui/Skeleton";
import { DocumentRow } from "@/components/dashboard/DocumentRow";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { DocSummary, SharedDocSummary } from "@/types";

type DocumentListProps = {
  view: "owned" | "shared";
  documents: (DocSummary | SharedDocSummary)[];
  status: "loading" | "ready" | "error";
  errorMessage?: string;
  onRetry?: () => void;
  onCreate?: () => void;
  onDelete?: (document: DocSummary) => void;
  emptyHint?: string;
};

export function DocumentList({
  view,
  documents,
  status,
  errorMessage,
  onRetry,
  onCreate,
  onDelete,
  emptyHint,
}: DocumentListProps) {
  if (status === "loading") {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <DocumentListSkeleton rows={4} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">Could not load documents</p>
            <p className="mt-1 text-sm text-mute">{errorMessage ?? "Something went wrong."}</p>
          </div>
          {onRetry ? (
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <EmptyState
          title={view === "owned" ? "No documents yet" : "Nothing shared with you yet"}
          description={
            view === "owned"
              ? "Create or import one to get started."
              : emptyHint ?? "When someone shares a document with you it will appear here."
          }
          actionLabel={view === "owned" ? "New document" : undefined}
          onAction={view === "owned" ? onCreate : undefined}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <ul className="divide-y divide-line">
        {documents.map((document) => (
          <li key={document.id}>
            <DocumentRow
              document={document}
              onDelete={view === "owned" ? onDelete : undefined}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
