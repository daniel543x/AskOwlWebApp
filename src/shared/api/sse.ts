import {
  ApiError,
  extractErrorMessage,
  getStoredToken,
  triggerUnauthorized,
  type QueryParams,
} from "./http";

export interface SseFrame {
  event: string;
  id: string | null;
  data: unknown;
}

export interface StreamOptions {
  method?: string;
  body?: unknown;
  params?: QueryParams;
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: QueryParams): URL {
  const url = new URL("/api" + path, window.location.origin);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function parseFrame(raw: string): SseFrame | null {
  let event = "message";
  let id: string | null = null;
  const dataLines: string[] = [];

  for (const line of raw.split("\n")) {
    if (line.length === 0 || line.startsWith(":")) {
      continue;
    }
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }
    if (field === "event") {
      event = value;
    } else if (field === "id") {
      id = value;
    } else if (field === "data") {
      dataLines.push(value);
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  const payload = dataLines.join("\n");
  try {
    return { event, id, data: JSON.parse(payload) };
  } catch {
    return { event, id, data: payload };
  }
}

/**
 * Streams a text/event-stream endpoint over fetch (works for POST and for
 * GET routes that need an Authorization header, unlike EventSource).
 * Terminal `done` / `error` events stop the stream automatically.
 */
export async function streamSse(
  path: string,
  options: StreamOptions,
  onEvent: (frame: SseFrame) => void,
): Promise<void> {
  const url = buildUrl(path, options.params);
  const headers: Record<string, string> = { Accept: "text/event-stream" };
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
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      return;
    }
    throw new ApiError(0, "Network error — could not reach the AskOwl backend.");
  }

  if (!response.ok || !response.body) {
    if (response.status === 401 && token) {
      triggerUnauthorized();
    }
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const rawFrame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);

        const frame = parseFrame(rawFrame);
        if (frame) {
          onEvent(frame);
          if (frame.event === "done" || frame.event === "error") {
            await reader.cancel();
            return;
          }
        }
        separator = buffer.indexOf("\n\n");
      }
    }
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      return;
    }
    throw cause;
  }
}
