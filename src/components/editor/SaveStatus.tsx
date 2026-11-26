"use client";

import { AlertCircle, Check, CloudOff, Loader2, Lock } from "lucide-react";
import type { SaveState } from "@/lib/hooks/useAutosave";

type SaveStatusProps = {
  state: SaveState;
  onRetry: () => void;
};

export function SaveStatus({ state, onRetry }: SaveStatusProps) {
  if (state === "readonly") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-mute">
        <Lock className="h-3 w-3" aria-hidden />
        Read-only
      </span>
    );
  }

  if (state === "saving") {
    return (
      <span
        aria-live="polite"
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-mute"
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Saving…
      </span>
    );
  }

  if (state === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        aria-live="polite"
        className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
      >
        <CloudOff className="h-3 w-3" aria-hidden />
        Save failed – Retry
      </button>
    );
  }

  if (state === "conflict") {
    return (
      <span
        aria-live="polite"
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700"
      >
        <AlertCircle className="h-3 w-3" aria-hidden />
        Unsaved – out of date
      </span>
    );
  }

  if (state === "saved") {
    return (
      <span
        aria-live="polite"
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
      >
        <Check className="h-3 w-3" aria-hidden />
        Saved just now
      </span>
    );
  }

  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-mute"
    >
      <Check className="h-3 w-3" aria-hidden />
      Up to date
    </span>
  );
}
