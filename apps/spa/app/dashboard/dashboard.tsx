"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DriverDashboard } from "@/components/driver-dashboard";
import { NotificationToasts } from "@/components/notification-toasts";
import { PushNotifications } from "@/components/push-notifications";
import { RiderDashboard } from "@/components/rider-dashboard";
import { useSession } from "@/lib/use-session";

export default function Dashboard() {
  const router = useRouter();
  const { status, user, signOut } = useSession();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login?next=/dashboard");
  }, [status, router]);

  if (!user) {
    return <p className="p-6 text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <NotificationToasts />
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Ride
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-zinc-600 sm:inline dark:text-zinc-400">
            {user.email} · {user.role === "DRIVER" ? "Driver" : user.role === "RIDER" ? "Rider" : "Admin"}
          </span>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
            className="rounded-md px-3 py-2 font-medium text-zinc-700 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          {user.role === "DRIVER" ? "Drive" : "Ride"}
        </h1>
        {user.role !== "ADMIN" && <PushNotifications userId={user.sub} role={user.role} />}
        {user.role === "DRIVER" ? (
          <DriverDashboard />
        ) : user.role === "RIDER" ? (
          <RiderDashboard />
        ) : (
          <p className="text-sm text-zinc-500">There&apos;s no admin dashboard yet.</p>
        )}
      </main>
    </div>
  );
}
