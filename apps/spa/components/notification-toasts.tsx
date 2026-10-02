"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Toast = { id: number; title: string; body: string; link?: string };

// What public/firebase-messaging-sw.js posts when a push arrives while the app is focused.
type PushMessage = { type: "push"; title: string; body: string; data?: { link?: string } };

const VISIBLE_MS = 6000;
const MAX_TOASTS = 3;

function isPushMessage(value: unknown): value is PushMessage {
  return typeof value === "object" && value !== null && (value as PushMessage).type === "push";
}

// In-app display of push notifications for the tab that's in front.
export function NotificationToasts() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let nextId = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const onMessage = (event: MessageEvent) => {
      if (!isPushMessage(event.data)) return;
      const toast: Toast = { id: ++nextId, title: event.data.title, body: event.data.body, link: event.data.data?.link };
      setToasts((list) => [...list, toast].slice(-MAX_TOASTS));
      const timer = setTimeout(() => {
        timers.delete(timer);
        setToasts((list) => list.filter((t) => t.id !== toast.id));
      }, VISIBLE_MS);
      timers.add(timer);
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      timers.forEach(clearTimeout);
    };
  }, []);

  const dismiss = (id: number) => setToasts((list) => list.filter((t) => t.id !== id));

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <button
            type="button"
            className="flex flex-1 flex-col gap-0.5 text-left"
            onClick={() => {
              dismiss(toast.id);
              if (toast.link) router.push(toast.link);
            }}
          >
            <span className="text-sm font-medium">{toast.title}</span>
            {toast.body && <span className="text-sm text-zinc-600 dark:text-zinc-400">{toast.body}</span>}
          </button>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismiss(toast.id)}
            className="-m-1 rounded p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
