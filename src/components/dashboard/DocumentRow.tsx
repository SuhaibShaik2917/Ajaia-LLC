"use client";

import Link from "next/link";
import { FileText, Trash2 } from "lucide-react";
import { RoleBadge } from "@/components/ui/Badge";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { DocSummary, SharedDocSummary } from "@/types";

function isShared(document: DocSummary | SharedDocSummary): document is SharedDocSummary {
  return "role" in document && "owner" in document;
}

type DocumentRowProps = {
  document: DocSummary | SharedDocSummary;
  onDelete?: (document: DocSummary) => void;
};

export function DocumentRow({ document, onDelete }: DocumentRowProps) {
  const shared = isShared(document);

  return (
    <div className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface/60">
      <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-mute sm:grid">
        <FileText className="h-4 w-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/documents/${document.id}`}
            className="truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline"
          >
            {document.title}
          </Link>
          {shared ? <RoleBadge role={document.role} /> : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-mute">
          {shared ? `Owned by ${document.owner.name} · ` : ""}
          Updated{" "}
          <time dateTime={document.updatedAt} title={formatDateTime(document.updatedAt)}>
            {formatRelative(document.updatedAt)}
          </time>
          {" · Created "}
          <time dateTime={document.createdAt} title={formatDateTime(document.createdAt)}>
            {formatRelative(document.createdAt)}
          </time>
        </p>
      </div>

      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(document)}
          aria-label={`Delete ${document.title}`}
          className="rounded-md p-1.5 text-mute opacity-0 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
