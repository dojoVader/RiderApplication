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

// Roles a user may pick for themselves; admins can't self-register.
export type SignupRole = Extract<Role, "RIDER" | "DRIVER">;

export async function register(email: string, password: string, role: SignupRole): Promise<void> {
  await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });
}

// Clears the session cookie on the server (JS can't touch an httpOnly cookie).
export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}

// Resolves to the logged-in user, or null when there's no valid session cookie.
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    return await apiFetch<SessionUser>("/auth/me");
  } catch {
    return null;
  }
}
