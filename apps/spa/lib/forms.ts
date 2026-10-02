const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  if (!email) return "Email is required.";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
}

// Only follow same-site relative paths, so ?next= can't redirect off-site.
export function safeRedirect(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

// Carries ?next= across the login and signup pages.
export function withNext(path: string, next: string): string {
  return next === "/dashboard" ? path : `${path}?next=${encodeURIComponent(next)}`;
}

// Strips undefined entries so `Object.keys(errors).length` means "has errors".
export function compact<T extends Record<string, string | undefined>>(errors: T): Partial<T> {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as Partial<T>;
}
