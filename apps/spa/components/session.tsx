"use client";

import { useState } from "react";
import Link from "next/link";
import type { SessionUser } from "@/lib/session";
import { useSession } from "@/lib/use-session";

const ROLE_LABELS: Record<SessionUser["role"], string> = {
  RIDER: "rider",
  DRIVER: "driver",
  ADMIN: "admin",
};

function SignOutButton({ signOut, className }: { signOut: () => Promise<void>; className: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await signOut();
        } finally {
          setPending(false);
        }
      }}
      className={className}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

// Landing page header: sign in/up links, or who's signed in with a way out.
export function AuthNav() {
  const { status, user, signOut } = useSession();

  // Reserve the space while checking, so the header doesn't jump.
  if (status === "loading") return <div className="h-9" />;

  if (user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden text-zinc-600 sm:inline dark:text-zinc-400">{user.email}</span>
        <Link
          href="/dashboard"
          className="rounded-md bg-zinc-900 px-3 py-2 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Dashboard
        </Link>
        <SignOutButton
          signOut={signOut}
          className="rounded-md px-3 py-2 font-medium text-zinc-700 transition-colors hover:text-zinc-950 disabled:opacity-60 dark:text-zinc-300 dark:hover:text-white"
        />
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-2 text-sm font-medium">
      <Link
        href="/login"
        className="rounded-md px-3 py-2 text-zinc-700 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="rounded-md bg-zinc-900 px-3 py-2 text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Sign up
      </Link>
    </nav>
  );
}

// Shown on /login and /signup instead of the form when a session already
// exists. Redirecting automatically sent users to "/", whose links lead back here.
export function SignedInNotice({
  user,
  continueTo,
  signOut,
}: {
  user: SessionUser;
  continueTo: string;
  signOut: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        You&apos;re signed in as <span className="font-medium text-zinc-900 dark:text-zinc-100">{user.email}</span>{" "}
        ({ROLE_LABELS[user.role]}). Sign out to use a different account.
      </p>
      <Link
        href={continueTo}
        className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Continue
      </Link>
      <SignOutButton
        signOut={signOut}
        className="h-10 rounded-md border border-zinc-300 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
      />
    </div>
  );
}
