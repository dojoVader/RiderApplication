import { apiFetch } from "./api";

export type Role = "RIDER" | "DRIVER" | "ADMIN";

// The JWT payload returned by GET /auth/me.
export type SessionUser = { sub: string; email: string; role: Role };

// The backend stores the session in an httpOnly cookie, so the token never
// touches JS storage. The returned access_token is deliberately ignored.
export async function login(email: string, password: string): Promise<void> {
  await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Resolves to the logged-in user, or null when there's no valid session cookie.
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    return await apiFetch<SessionUser>("/auth/me");
  } catch {
    return null;
  }
}
