"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAppShell } from "@/components/layout/AppShell";
import { DocumentList } from "@/components/dashboard/DocumentList";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/lib/api-client";
import type { DocSummary, SharedDocSummary } from "@/types";

type ListsResponse = { owned: DocSummary[]; shared: SharedDocSummary[] };
type View = "owned" | "shared";

export function DashboardPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, createDocument, creating, openImport } = useAppShell();

  const view: View = params.get("view") === "shared" ? "shared" : "owned";
  const [data, setData] = useState<ListsResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DocSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(undefined);
    try {
      const response = await api.get<ListsResponse>("/api/documents");
      setData(response);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Sharing has no push channel, so a recipient who left this tab open would otherwise
  // never see a new document until a manual reload. Refresh quietly when the tab regains
  // focus: no skeleton, and a failure keeps the last good list.
  useEffect(() => {
    const refreshQuietly = () => {
      if (document.visibilityState !== "visible") return;
      api
        .get<ListsResponse>("/api/documents")
        .then((response) => {
          setData(response);
          setStatus("ready");
        })
        .catch(() => {
          /* keep showing the last successful list */
        });
    };
    window.addEventListener("focus", refreshQuietly);
    document.addEventListener("visibilitychange", refreshQuietly);
    return () => {
      window.removeEventListener("focus", refreshQuietly);
      document.removeEventListener("visibilitychange", refreshQuietly);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const list = view === "owned" ? data.owned : data.shared;
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((document) => document.title.toLowerCase().includes(needle));
  }, [data, query, view]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/documents/${pendingDelete.id}`);
      setData((current) =>
        current
          ? { ...current, owned: current.owned.filter((doc) => doc.id !== pendingDelete.id) }
          : current
      );
      toast.success("Document deleted.");
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the document.");
    } finally {
      setDeleting(false);
    }
  };

  const ownedCount = data?.owned.length ?? 0;
  const sharedCount = data?.shared.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-mute">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {view === "owned" ? "My documents" : "Shared with me"}
          </h1>
          <p className="mt-1 text-sm text-mute">
            Signed in as {user.name}. {view === "owned" ? "These are yours to edit and share." : "Documents other people shared with you."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={openImport} className="hidden sm:inline-flex">
            <Upload className="h-4 w-4" aria-hidden />
            Import file
          </Button>
          <Button type="button" onClick={() => void createDocument()} loading={creating}>
            <Plus className="h-4 w-4" aria-hidden />
            New document
          </Button>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Document views" className="inline-flex rounded-lg border border-line bg-white p-1">
          <Link
            href="/?view=owned"
            aria-current={view === "owned" ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              view === "owned" ? "bg-surface text-ink" : "text-mute hover:text-ink"
            }`}
          >
            My documents
            <span className="ml-1.5 rounded-full bg-line/70 px-1.5 py-0.5 text-[11px] text-mute">
              {ownedCount}
            </span>
          </Link>
          <Link
            href="/?view=shared"
            aria-current={view === "shared" ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              view === "shared" ? "bg-surface text-ink" : "text-mute hover:text-ink"
            }`}
          >
            Shared with me
            <span className="ml-1.5 rounded-full bg-line/70 px-1.5 py-0.5 text-[11px] text-mute">
              {sharedCount}
            </span>
          </Link>
        </nav>

        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles…"
            aria-label="Search documents"
            className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-mute/70"
          />
        </div>
      </div>

      <div className="mt-4">
        <DocumentList
          view={view}
          documents={filtered}
          status={status}
          errorMessage={errorMessage}
          onRetry={() => void load()}
          onCreate={() => void createDocument()}
          onDelete={(document) => setPendingDelete(document)}
          emptyHint={
            query
              ? "No documents match that search."
              : undefined
          }
        />
        {status === "ready" && query && filtered.length === 0 ? (
          <p className="mt-3 text-center text-xs text-mute">
            Tip: clear the search to see all {view === "owned" ? ownedCount : sharedCount} document(s).
          </p>
        ) : null}
      </div>

      <p className="mt-6 text-xs text-mute">
        Autosave is on. Everything you type is stored as you go —{" "}
        <button
          type="button"
          onClick={() => router.refresh()}
          className="underline decoration-line underline-offset-2 hover:text-ink"
        >
          refresh the list
        </button>
        .
      </p>

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete document?"
        description={`"${pendingDelete?.title ?? ""}" will be permanently removed for everyone it is shared with.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={() => void confirmDelete()} loading={deleting}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-mute">This action cannot be undone.</p>
      </Dialog>
    </div>
  );
}
