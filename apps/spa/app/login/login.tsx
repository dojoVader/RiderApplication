"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { getCurrentUser, login } from "@/lib/session";

type FieldErrors = { email?: string; password?: string };

type LoginState = {
  email: string;
  fieldErrors: FieldErrors;
  formError?: string;
};

const initialState: LoginState = { email: "", fieldErrors: {} };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Password is required.";
  return errors;
}

// Only follow same-site relative paths, so ?next= can't redirect off-site.
function safeRedirect(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginForm() {
  const router = useRouter();
  const redirectTo = safeRedirect(useSearchParams().get("next"));

  // Skip the form when the session cookie is still valid.
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) router.replace(redirectTo);
    });
  }, [router, redirectTo]);

  const [state, formAction, pending] = useActionState(
    async (_prev: LoginState, formData: FormData): Promise<LoginState> => {
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");

      const fieldErrors = validate(email, password);
      if (Object.keys(fieldErrors).length > 0) {
        return { email, fieldErrors };
      }

      try {
        await login(email, password);
      } catch (error) {
        const formError =
          error instanceof ApiError
            ? error.status === 401
              ? "Incorrect email or password."
              : error.message
            : "Couldn't reach the server. Check your connection and try again.";
        return { email, fieldErrors: {}, formError };
      }

      router.replace(redirectTo);
      return { email, fieldErrors: {} };
    },
    initialState,
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.formError && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {state.formError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          aria-invalid={!!state.fieldErrors.email}
          aria-describedby={state.fieldErrors.email ? "email-error" : undefined}
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-300"
        />
        {state.fieldErrors.email && (
          <p id="email-error" className="text-sm text-red-600 dark:text-red-400">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!state.fieldErrors.password}
          aria-describedby={state.fieldErrors.password ? "password-error" : undefined}
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-300"
        />
        {state.fieldErrors.password && (
          <p id="password-error" className="text-sm text-red-600 dark:text-red-400">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
