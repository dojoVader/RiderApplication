"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormError, SubmitButton, TextField } from "@/components/form";
import { SignedInNotice } from "@/components/session";
import { ApiError } from "@/lib/api";
import { compact, safeRedirect, validateEmail, withNext } from "@/lib/forms";
import { login, register, type SignupRole } from "@/lib/session";
import { useSession } from "@/lib/use-session";

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
};

type SignupState = {
  email: string;
  role?: SignupRole;
  fieldErrors: FieldErrors;
  formError?: string;
};

const ROLES: { value: SignupRole; title: string; description: string }[] = [
  { value: "RIDER", title: "Rider", description: "Request rides and track your trips." },
  { value: "DRIVER", title: "Driver", description: "Accept ride requests and earn." },
];

function isSignupRole(value: unknown): value is SignupRole {
  return ROLES.some((r) => r.value === value);
}

function validate(email: string, password: string, confirmPassword: string, role?: SignupRole): FieldErrors {
  return compact({
    email: validateEmail(email),
    password: password ? undefined : "Password is required.",
    confirmPassword: password && confirmPassword !== password ? "Passwords don't match." : undefined,
    role: role ? undefined : "Choose whether you're signing up as a rider or a driver.",
  });
}

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("next"));
  // ?role=DRIVER (e.g. from the landing page) preselects that card.
  const presetRole = searchParams.get("role");
  const initialState: SignupState = {
    email: "",
    role: isSignupRole(presetRole) ? presetRole : undefined,
    fieldErrors: {},
  };

  const session = useSession();

  const [state, formAction, pending] = useActionState(
    async (_prev: SignupState, formData: FormData): Promise<SignupState> => {
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      const confirmPassword = String(formData.get("confirmPassword") ?? "");
      const rawRole = formData.get("role");
      const role = isSignupRole(rawRole) ? rawRole : undefined;

      const fieldErrors = validate(email, password, confirmPassword, role);
      if (Object.keys(fieldErrors).length > 0 || !role) {
        return { email, role, fieldErrors };
      }

      try {
        await register(email, password, role);
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          return {
            email,
            role,
            fieldErrors: { email: "An account with this email already exists." },
          };
        }
        const formError =
          error instanceof ApiError
            ? error.message
            : "Couldn't reach the server. Check your connection and try again.";
        return { email, role, fieldErrors: {}, formError };
      }

      // Registering doesn't start a session, so sign the new user straight in.
      try {
        await login(email, password);
      } catch {
        router.replace(withNext("/login", redirectTo));
        return { email, role, fieldErrors: {} };
      }

      router.replace(redirectTo);
      return { email, role, fieldErrors: {} };
    },
    initialState,
  );

  if (session.user) {
    return <SignedInNotice user={session.user} continueTo={redirectTo} signOut={session.signOut} />;
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FormError>{state.formError}</FormError>

      <fieldset
        className="flex flex-col gap-1.5"
        aria-describedby={state.fieldErrors.role ? "role-error" : undefined}
      >
        <legend className="mb-1.5 text-sm font-medium">I want to</legend>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <label key={r.value} className="cursor-pointer">
              <input
                type="radio"
                name="role"
                value={r.value}
                // Keyed so the choice survives the form reset after a failed submit.
                key={`${r.value}-${state.role}`}
                defaultChecked={state.role === r.value}
                className="peer sr-only"
              />
              <span className="flex h-full flex-col gap-1 rounded-md border border-zinc-300 p-3 transition-colors hover:border-zinc-400 peer-checked:border-zinc-900 peer-checked:bg-zinc-100 peer-checked:ring-2 peer-checked:ring-zinc-900/10 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-900/30 dark:border-zinc-700 dark:hover:border-zinc-500 dark:peer-checked:border-zinc-200 dark:peer-checked:bg-zinc-800 dark:peer-checked:ring-white/10">
                <span className="text-sm font-medium">{r.title}</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{r.description}</span>
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors.role && (
          <p id="role-error" className="text-sm text-red-600 dark:text-red-400">
            {state.fieldErrors.role}
          </p>
        )}
      </fieldset>

      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        error={state.fieldErrors.email}
      />
      <TextField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors.password}
      />
      <TextField
        name="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors.confirmPassword}
      />

      <SubmitButton pending={pending}>{pending ? "Creating account…" : "Create account"}</SubmitButton>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href={withNext("/login", redirectTo)}
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
