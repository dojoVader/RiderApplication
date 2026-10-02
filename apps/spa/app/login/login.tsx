"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormError, SubmitButton, TextField } from "@/components/form";
import { SignedInNotice } from "@/components/session";
import { ApiError } from "@/lib/api";
import { compact, safeRedirect, validateEmail, withNext } from "@/lib/forms";
import { login } from "@/lib/session";
import { useSession } from "@/lib/use-session";

type FieldErrors = { email?: string; password?: string };

type LoginState = {
  email: string;
  fieldErrors: FieldErrors;
  formError?: string;
};

const initialState: LoginState = { email: "", fieldErrors: {} };

function validate(email: string, password: string): FieldErrors {
  return compact({
    email: validateEmail(email),
    password: password ? undefined : "Password is required.",
  });
}

export default function LoginForm() {
  const router = useRouter();
  const redirectTo = safeRedirect(useSearchParams().get("next"));

  const session = useSession();

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

  if (session.user) {
    return <SignedInNotice user={session.user} continueTo={redirectTo} signOut={session.signOut} />;
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FormError>{state.formError}</FormError>

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
        autoComplete="current-password"
        error={state.fieldErrors.password}
      />

      <SubmitButton pending={pending}>{pending ? "Signing in…" : "Sign in"}</SubmitButton>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link
          href={withNext("/signup", redirectTo)}
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
