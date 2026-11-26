"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, api } from "@/lib/api-client";
import type { DocumentPatchResult, TiptapDoc } from "@/types";

export type SaveState = "idle" | "saving" | "saved" | "error" | "conflict" | "readonly";

type PatchBody = { content?: TiptapDoc; title?: string };

type Options = {
  documentId: string;
  initialVersion: number;
  canEdit: boolean;
  onVersionChange?: (version: number, updatedAt: string) => void;
  onConflict?: () => void;
};

const DEBOUNCE_MS = 1000;
const MAX_RETRIES = 2;

/**
 * Debounced autosave with a single in-flight request.
 *
 * - One request is in flight at a time; edits made meanwhile set a "dirty"
 *   flag and are sent as soon as the current request settles.
 * - Failures retry with exponential backoff, then surface the error state.
 * - `beforeunload` flushes pending content with keepalive.
 * - A 409 from the server switches to the conflict state instead of retrying.
 */
export function useAutosave({
  documentId,
  initialVersion,
  canEdit,
  onVersionChange,
  onConflict,
}: Options) {
  const [state, setState] = useState<SaveState>(canEdit ? "idle" : "readonly");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const versionRef = useRef(initialVersion);
  const pendingRef = useRef<PatchBody | null>(null);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const conflictRef = useRef(false);

  // Keep the latest callbacks in refs so the save loop never goes stale.
  const callbacksRef = useRef({ onVersionChange, onConflict });
  callbacksRef.current = { onVersionChange, onConflict };

  useEffect(() => {
    versionRef.current = initialVersion;
  }, [initialVersion]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const sendRef = useRef<((body: PatchBody, attempt?: number) => void) | null>(null);

  const send = useCallback(
    (body: PatchBody, attempt = 0) => {
      if (!canEdit || conflictRef.current) return;

      inFlightRef.current = true;
      if (mountedRef.current) setState("saving");

      api
        .patch<DocumentPatchResult>(`/api/documents/${documentId}`, {
          ...body,
          baseVersion: versionRef.current,
        })
        .then((result) => {
          versionRef.current = result.version;
          callbacksRef.current.onVersionChange?.(result.version, result.updatedAt);
          inFlightRef.current = false;

          if (mountedRef.current) {
            setLastSavedAt(new Date(result.updatedAt));
            setState(pendingRef.current ? "saving" : "saved");
          }

          const queued = pendingRef.current;
          if (queued) {
            pendingRef.current = null;
            sendRef.current?.(queued);
          }
        })
        .catch((error: unknown) => {
          inFlightRef.current = false;

          if (error instanceof ApiClientError && error.status === 409) {
            conflictRef.current = true;
            pendingRef.current = body;
            if (mountedRef.current) setState("conflict");
            callbacksRef.current.onConflict?.();
            return;
          }

          if (attempt < MAX_RETRIES) {
            // Keep the payload; retry with backoff.
            pendingRef.current = { ...body, ...pendingRef.current };
            const delay = 500 * 2 ** attempt;
            setTimeout(() => {
              const queued = pendingRef.current;
              if (!queued || conflictRef.current) return;
              pendingRef.current = null;
              sendRef.current?.(queued, attempt + 1);
            }, delay);
            return;
          }

          pendingRef.current = { ...body, ...pendingRef.current };
          if (mountedRef.current) setState("error");
        });
    },
    [canEdit, documentId]
  );

  sendRef.current = send;

  const queue = useCallback(
    (body: PatchBody, immediate = false) => {
      if (!canEdit || conflictRef.current) return;

      pendingRef.current = { ...pendingRef.current, ...body };
      setState("saving");

      if (timerRef.current) clearTimeout(timerRef.current);

      const run = () => {
        if (inFlightRef.current) return; // flushed when the in-flight request settles
        const queued = pendingRef.current;
        if (!queued) return;
        pendingRef.current = null;
        send(queued);
      };

      if (inFlightRef.current) return;
      if (immediate) run();
      else timerRef.current = setTimeout(run, DEBOUNCE_MS);
    },
    [canEdit, send]
  );

  /** Call from Tiptap's onUpdate with the current document JSON. */
  const scheduleContentSave = useCallback((content: TiptapDoc) => queue({ content }), [queue]);

  /** Title changes are saved immediately (no debounce). */
  const saveTitle = useCallback((title: string) => queue({ title }, true), [queue]);

  /** Manual retry from the save-status pill. */
  const retry = useCallback(() => {
    const queued = pendingRef.current;
    if (!queued) return;
    pendingRef.current = null;
    send(queued);
  }, [send]);

  /** Force a flush (e.g. before navigating away). */
  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const queued = pendingRef.current;
    if (!queued || inFlightRef.current) return;
    pendingRef.current = null;
    send(queued);
  }, [send]);

  // Flush on tab close / reload. keepalive lets the request outlive the page.
  useEffect(() => {
    if (!canEdit) return;

    const onBeforeUnload = () => {
      const queued = pendingRef.current;
      if (!queued) return;
      fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...queued, baseVersion: versionRef.current }),
        keepalive: true,
        credentials: "same-origin",
      }).catch(() => undefined);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [canEdit, documentId]);

  return { state, lastSavedAt, scheduleContentSave, saveTitle, retry, flush };
}
