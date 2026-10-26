import { refreshSession } from "./refresh";
import { getStoredToken } from "./tokens";

const BASE_PATH = "/api";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: QueryParams;
  signal?: AbortSignal;
  skipUnauthorizedRedirect?: boolean;
  retriedAfterRefresh?: boolean;
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

export function triggerUnauthorized(): void {
  unauthorizedHandler?.();
}

function buildUrl(path: string, params?: QueryParams): URL {
  const url = new URL(BASE_PATH + path, window.location.origin);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

const FALLBACK_MESSAGES: Record<number, string> = {
  400: "The request was invalid.",
  401: "Your session expired — please sign in again.",
  403: "You do not have permission for this action.",
  404: "Not found — it may belong to another account or no longer exist.",
  409: "Conflicting state — the item may already exist.",
  422: "Validation failed.",
  429: "Rate limit exceeded — retry shortly.",
  500: "The backend hit an internal error.",
  502: "The model violated the answer contract (tool-calling).",
  503: "No model is available for this request.",
};

export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      const messages = data.detail
        .map((item) => (typeof (item as { msg?: unknown })?.msg === "string" ? (item as { msg: string }).msg : null))
        .filter((msg): msg is string => msg !== null);
      if (messages.length > 0) {
        return messages.join("; ");
      }
    }
  } catch {
    // non-JSON error body — fall through to the status-based message
  }
  return FALLBACK_MESSAGES[response.status] ?? `Request failed (HTTP ${response.status})`;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, options.params);
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      throw cause;
    }
    throw new ApiError(0, "Network error — could not reach the AskOwl backend.");
  }

  if (
    response.status === 401 &&
    token &&
    !options.skipUnauthorizedRedirect &&
    !options.retriedAfterRefresh &&
    !path.startsWith("/auth/")
  ) {
    try {
      const refreshed = await refreshSession();
      if (refreshed !== null) {
        return apiFetch<T>(path, { ...options, retriedAfterRefresh: true });
      }
      triggerUnauthorized();
    } catch {
      // refresh could not run (offline, backend 5xx) — keep the session and
      // surface the original 401
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (text.length === 0) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}
