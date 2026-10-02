// In production nginx proxies /api/* to the backend on the same origin.
// In development point this at the backend directly (see .env.development).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public messages: string[],
  ) {
    super(messages.join(", "));
  }
}

// Sends the httpOnly session cookie with every request and turns Nest's
// error bodies ({ message: string | string[] }) into an ApiError.
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.message ?? res.statusText;
    throw new ApiError(res.status, Array.isArray(message) ? message : [message]);
  }
  return body as T;
}
