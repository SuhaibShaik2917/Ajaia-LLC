import type { ApiErrorBody } from "@/types";

/** Error thrown by the browser fetch helpers below. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string[] | undefined>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string[] | undefined>) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function parseError(response: Response): Promise<ApiClientError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body?.error?.message) {
      return new ApiClientError(response.status, body.error.code, normalizeMessage(body.error));
    }
  } catch {
    /* fall through */
  }
  return new ApiClientError(
    response.status,
    "INTERNAL_ERROR",
    response.status === 401 ? "Your session has expired. Please sign in again." : "Something went wrong."
  );
}

/** Prefer a field-level message (e.g. "Email is required.") over the generic one. */
function normalizeMessage(error: ApiErrorBody["error"]): string {
  if (error.fields) {
    const first = Object.values(error.fields).find((messages) => messages && messages.length > 0);
    if (first && first[0]) return first[0];
  }
  return error.message;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init.headers },
    credentials: "same-origin",
  });

  if (!response.ok) throw await parseError(response);

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<T>(path, { method: "POST", body: form });
  },
};
