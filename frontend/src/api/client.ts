/**
 * Thin fetch wrapper used by every API module.
 *
 * - Sends cookies (same-origin session auth).
 * - Echoes Django's csrftoken cookie in the X-CSRFToken header for unsafe methods.
 *   The cookie is read on every request because Django rotates it on login.
 * - Normalises errors into ApiError so the UI can show field messages.
 */

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  /** Field-level validation messages, flattened to dotted paths (e.g. "entries.0.sets"). */
  readonly fieldErrors: FieldErrors;
  readonly body: unknown;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}, body: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.body = body;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function getCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

let csrfPromise: Promise<void> | null = null;
async function ensureCsrfCookie(): Promise<void> {
  if (getCookie("csrftoken")) return;
  csrfPromise ??= fetch("/api/auth/csrf/", { credentials: "same-origin" }).then(() => undefined);
  try {
    await csrfPromise;
  } finally {
    csrfPromise = null;
  }
}

/** Flatten DRF's nested error structure into dotted paths. */
export function flattenErrors(data: unknown, prefix = ""): FieldErrors {
  const out: FieldErrors = {};
  const add = (key: string, msg: string) => (out[key] ??= []).push(msg);
  const walk = (node: unknown, path: string) => {
    if (node == null) return;
    if (typeof node === "string") return add(path || "non_field_errors", node);
    if (Array.isArray(node)) {
      if (node.every((n) => typeof n === "string")) {
        node.forEach((n) => add(path || "non_field_errors", n as string));
      } else {
        node.forEach((n, i) => walk(n, path ? `${path}.${i}` : String(i)));
      }
      return;
    }
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        walk(v, path ? `${path}.${k}` : k);
      }
    }
  };
  walk(data, prefix);
  return out;
}

function firstMessage(errors: FieldErrors): string | null {
  const first = Object.values(errors)[0];
  return first?.[0] ?? null;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
}

export async function request<T>(path: string, { method = "GET", body, query, signal }: RequestOptions = {}): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (UNSAFE.has(method)) {
    await ensureCsrfCookie();
    const token = getCookie("csrftoken");
    if (token) headers["X-CSRFToken"] = token;
  }

  let res: Response;
  try {
    res = await fetch(url.pathname + url.search, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "We couldn't reach the server. Check your connection and try again.");
  }

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data: unknown = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data ? String((data as { detail: unknown }).detail) : null;
    const fieldErrors = detail ? {} : flattenErrors(data);
    const fallback =
      res.status === 401
        ? "Please sign in to continue."
        : res.status === 403
          ? "You don't have permission to do that."
          : res.status === 404
            ? "We couldn't find what you were looking for."
            : res.status >= 500
              ? "Something went wrong on our side. Please try again."
              : "Please check the highlighted fields.";
    // Django's 404 detail ("No Workout matches the given query.") isn't user-friendly.
    const message = (res.status === 404 ? null : detail) ?? (res.status === 400 ? firstMessage(fieldErrors) : null) ?? fallback;
    if (res.status === 401) unauthorizedHandler?.();
    throw new ApiError(res.status, message, fieldErrors, data);
  }
  return data as T;
}

/** Lets the auth context react to an expired session anywhere in the app. */
let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

/** The user's local calendar date (YYYY-MM-DD) – sent to analytics endpoints. */
export function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
