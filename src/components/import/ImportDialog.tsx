"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ApiClientError, api } from "@/lib/api-client";
import type { DocSummary } from "@/types";

const ACCEPTED = ".txt,.md";
const MAX_BYTES = 1024 * 1024;

type ImportDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setError(null);
    setUploading(false);
    setDragging(false);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const pick = (candidate: File | null | undefined) => {
    setError(null);
    if (!candidate) return;

    const name = candidate.name.toLowerCase();
    if (!name.endsWith(".txt") && !name.endsWith(".md")) {
      setFile(null);
      setError("Only .txt and .md files can be imported.");
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setFile(null);
      setError("That file is larger than 1 MB.");
      return;
    }
    if (candidate.size === 0) {
      setFile(null);
      setError("That file is empty.");
      return;
    }
    setFile(candidate);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { document } = await api.upload<{ document: DocSummary }>("/api/documents/import", file);
      toast.success("Document imported.");
      reset();
      onClose();
      router.push(`/documents/${document.id}`);
    } catch (uploadError) {
      const message =
        uploadError instanceof ApiClientError
          ? uploadError.message
          : "Could not import that file. Please try again.";
      setError(message);
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Import a file"
      description="Turn a plain text or markdown file into a new document."
    >
      <div className="space-y-4">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? "border-brand-500 bg-brand-50" : "border-line bg-surface/60"
          }`}
        >
          <Upload className="h-6 w-6 text-mute" aria-hidden />
          <p className="text-sm text-ink">Drag a file here</p>
          <p className="text-xs text-mute">Supported: .txt, .md (max 1 MB)</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="sr-only"
            aria-label="Choose a file to import"
            onChange={(event) => {
              pick(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            Browse files
          </Button>
        </div>

        {file ? (
          <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
            <FileText className="h-4 w-4 text-mute" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{file.name}</span>
            <span className="text-xs text-mute">{(file.size / 1024).toFixed(1)} KB</span>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close} disabled={uploading}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void upload()} disabled={!file} loading={uploading}>
            {uploading ? "Importing…" : "Import"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
