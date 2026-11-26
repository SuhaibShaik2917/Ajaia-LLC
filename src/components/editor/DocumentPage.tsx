"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Eye, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Editor } from "@/components/editor/Editor";
import { SaveStatus } from "@/components/editor/SaveStatus";
import { TitleInput } from "@/components/editor/TitleInput";
import { ShareDialog } from "@/components/share/ShareDialog";
import { RoleBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiClientError, api } from "@/lib/api-client";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useAutosave } from "@/lib/hooks/useAutosave";
import type { DocumentWithRole, Role, TiptapDoc } from "@/types";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: DocumentWithRole }
  | { status: "missing" }
  | { status: "error"; message: string };

export function DocumentPage({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState(1);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [shareOpen, setShareOpen] = useState(false);
  const [conflict, setConflict] = useState(false);

  const fetchDocument = useCallback(async () => {
    try {
      const data = await api.get<DocumentWithRole>(`/api/documents/${documentId}`);
      setLoad({ status: "ready", data });
      setTitle(data.document.title);
      setVersion(data.document.version);
      setUpdatedAt(data.document.updatedAt);
      setConflict(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        setLoad({ status: "missing" });
        return;
      }
      setLoad({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load the document.",
      });
    }
  }, [documentId]);

  useEffect(() => {
    void fetchDocument();
  }, [fetchDocument]);

  const myRole: Role | null = load.status === "ready" ? load.data.myRole : null;
  const canEdit = myRole === "OWNER" || myRole === "EDITOR";

  const { state, scheduleContentSave, saveTitle, retry, flush } = useAutosave({
    documentId,
    initialVersion: version,
    canEdit,
    onVersionChange: (nextVersion, nextUpdatedAt) => {
      setVersion(nextVersion);
      setUpdatedAt(nextUpdatedAt);
    },
    onConflict: () => setConflict(true),
  });

  // Flush any pending edit when navigating away inside the SPA.
  useEffect(() => () => flush(), [flush]);

  const onContentUpdate = useCallback(
    (content: TiptapDoc) => {
      scheduleContentSave(content);
    },
    [scheduleContentSave]
  );

  if (load.status === "loading") {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <div className="mt-6 rounded-2xl border border-line bg-white p-8">
          <Skeleton className="h-6 w-1/2" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  if (load.status === "missing") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-white text-mute">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-ink">Document not found</h1>
        <p className="mt-1 max-w-sm text-sm text-mute">
          It may have been deleted, or you do not have access. Documents you cannot see return 404
          on purpose.
        </p>
        <Link href="/" className="mt-5">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to documents
          </Button>
        </Link>
      </div>
    );
  }

  if (load.status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center">
        <h1 className="text-lg font-semibold text-ink">Could not load this document</h1>
        <p className="mt-1 text-sm text-mute">{load.message}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void fetchDocument()}>
            Try again
          </Button>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Back to documents
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { document, myRole: role } = load.data;

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[900px] flex-wrap items-center gap-2 px-3 py-2 sm:px-5">
          <Link
            href="/"
            aria-label="Back to documents"
            className="rounded-md p-1.5 text-mute hover:bg-surface hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>

          <div className="min-w-0 flex-1">
            <TitleInput
              title={title}
              editable={canEdit}
              onCommit={(nextTitle) => {
                setTitle(nextTitle);
                saveTitle(nextTitle);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <SaveStatus state={state} onRetry={retry} />
            <RoleBadge role={role} />
            {role === "OWNER" ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Share</span>
              </Button>
            ) : null}
          </div>
        </div>

        {role === "VIEWER" ? (
          <div className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-center text-[12px] text-amber-800">
            <Eye className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
            You have view-only access to this document.
          </div>
        ) : null}

        {conflict ? (
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-amber-100 bg-amber-50 px-4 py-2 text-[12px] text-amber-900">
            <span>
              Someone else saved a newer version. Your last edit was not applied.
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                void fetchDocument().then(() => {
                  setConflict(false);
                  toast.success("Loaded the latest version.");
                });
              }}
            >
              Reload latest
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-[900px] px-2 pb-16 pt-4 sm:px-5 sm:pt-6">
        <article className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <Editor
            key={`${document.id}-v${document.version}`}
            content={document.content}
            editable={canEdit}
            onUpdate={onContentUpdate}
          />
          <div className="border-t border-line px-5 py-3 text-[11px] text-mute sm:px-10">
            Created {formatDateTime(document.createdAt)} · Updated{" "}
            <span title={formatDateTime(updatedAt || document.updatedAt)}>
              {formatRelative(updatedAt || document.updatedAt)}
            </span>{" "}
            · Version {version}
          </div>
        </article>
      </div>

      {role === "OWNER" ? (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          documentId={document.id}
          onSharesChanged={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
