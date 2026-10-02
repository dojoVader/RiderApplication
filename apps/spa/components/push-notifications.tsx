"use client";

import { useEffect, useState } from "react";
import { Button, errorMessage } from "@/components/rides";
import { enablePush, pushState, type PushState } from "@/lib/push";

const COPY: Record<"RIDER" | "DRIVER", string> = {
  RIDER: "Get a notification when a driver accepts your ride and when it starts.",
  DRIVER: "Get a notification when there's a new ride request.",
};

// Dashboard banner: asks once for permission, then keeps this browser's FCM
// token registered to the signed-in user on every visit. `userId` re-runs
// that when a different user signs in.
export function PushNotifications({ userId, role }: { userId: string; role: "RIDER" | "DRIVER" }) {
  const [state, setState] = useState<PushState | "loading">("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    pushState().then(async (current) => {
      if (!active) return;
      setState(current);
      // Already allowed: refresh the token quietly.
      if (current === "granted") {
        enablePush({ prompt: false }).catch((e) => active && setError(errorMessage(e)));
      }
    });
    return () => {
      active = false;
    };
  }, [userId]);

  async function enable() {
    setPending(true);
    setError(undefined);
    try {
      setState(await enablePush({ prompt: true }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  if (state === "granted") {
    return error ? (
      <p role="alert" className="mb-6 text-sm text-red-600 dark:text-red-400">
        Couldn&apos;t register this browser for notifications: {error}
      </p>
    ) : null;
  }

  if (state === "denied") {
    return (
      <p className="mb-6 text-xs text-zinc-500">
        Notifications are blocked for this site. Allow them in your browser&apos;s site settings to get ride updates.
      </p>
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Turn on notifications</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{COPY[role]}</p>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
      <Button onClick={enable} disabled={pending} className="shrink-0">
        {pending ? "Enabling…" : "Enable"}
      </Button>
    </div>
  );
}
