/**
 * apiRequest -- the only way the client should talk to /api/*.
 *
 * HARD RULE #4: This wrapper MUST return already-parsed JSON.
 * Callers receive the data directly -- they never call .json() themselves.
 *
 * Throws ApiError on non-2xx so TanStack Query routes failures into its
 * standard `error` channel. JSON bodies are preferred but the wrapper
 * gracefully handles empty / non-JSON responses too.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try { return JSON.parse(text); } catch { return text; }
  }
  // Best-effort JSON parse even when server forgot the header
  try { return JSON.parse(text); } catch { return text; }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, signal, headers } = options;

  const init: RequestInit = {
    method,
    signal,
    headers: {
      'Accept': 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const base = (import.meta.env as Record<string, string | undefined>).VITE_API_URL ?? '';
  const res = await fetch(`${base}${path}`, init);
  const parsed = await parseBody(res);

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : null) || `${res.status} ${res.statusText}`;
    throw new ApiError(res.status, res.statusText, message, parsed);
  }

  return parsed as T;
}
