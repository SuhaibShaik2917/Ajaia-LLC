/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useAutosave } from "@/lib/hooks/useAutosave";
import type { TiptapDoc } from "@/types";

const doc: TiptapDoc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
};

function patchResponse(version: number) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      id: "doc1",
      version,
      updatedAt: new Date().toISOString(),
      title: "Doc",
    }),
  } as unknown as Response;
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("debounces rapid edits into a single PATCH with the current version", async () => {
    const fetchMock = vi.fn(async () => patchResponse(2));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useAutosave({ documentId: "doc1", initialVersion: 1, canEdit: true })
    );

    act(() => {
      result.current.scheduleContentSave(doc);
      result.current.scheduleContentSave(doc);
    });
    expect(result.current.state).toBe("saving");
    expect(fetchMock).not.toHaveBeenCalled();

    await advance(1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ baseVersion: 1, content: doc });
    expect(result.current.state).toBe("saved");
  });

  it("sends one request at a time and flushes edits made in flight", async () => {
    let resolveFirst: (value: Response) => void = () => undefined;
    const first = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => first)
      .mockImplementation(async () => patchResponse(3));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useAutosave({ documentId: "doc1", initialVersion: 1, canEdit: true })
    );

    act(() => {
      result.current.scheduleContentSave(doc);
    });
    await advance(1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Edit while the first request is still open.
    act(() => {
      result.current.scheduleContentSave(doc);
    });
    await advance(1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst(patchResponse(2));
      await Promise.resolve();
    });

    await advance(10);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(
      (fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body as string
    );
    expect(secondBody.baseVersion).toBe(2);
  });

  it("enters the conflict state on 409 instead of retrying", async () => {
    const onConflict = vi.fn();
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({
        error: { code: "VERSION_CONFLICT", message: "Stale version." },
      }),
    }) as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useAutosave({ documentId: "doc1", initialVersion: 1, canEdit: true, onConflict })
    );

    act(() => {
      result.current.scheduleContentSave(doc);
    });
    await advance(1000);

    expect(result.current.state).toBe("conflict");
    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries failed saves, then surfaces the error state and can retry manually", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useAutosave({ documentId: "doc1", initialVersion: 1, canEdit: true })
    );

    act(() => {
      result.current.scheduleContentSave(doc);
    });
    await advance(1000); // first attempt fails
    await advance(600); // backoff retry #1
    await advance(1200); // backoff retry #2
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.state).toBe("error");

    fetchMock.mockImplementation(async () => patchResponse(2));
    act(() => {
      result.current.retry();
    });
    await advance(10);
    expect(result.current.state).toBe("saved");
  });

  it("never saves when the user cannot edit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useAutosave({ documentId: "doc1", initialVersion: 1, canEdit: false })
    );

    expect(result.current.state).toBe("readonly");
    act(() => {
      result.current.scheduleContentSave(doc);
      result.current.saveTitle("nope");
    });
    await advance(2000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
