// Small client-side fetch helper. Reads the backend's `{ error: { code, message } }` envelope
// and throws a typed error the UI can present. Same-origin, cookie session included.

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string; details?: unknown } }).error;
    throw new ApiRequestError(
      res.status,
      err?.code ?? "ERROR",
      err?.message ?? "Something went wrong. Please try again.",
      err?.details,
    );
  }
  return body as T;
}
