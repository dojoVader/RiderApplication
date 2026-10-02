"use client";

import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { apiFetch } from "./api";
import { firebaseApp, firebaseConfigured, VAPID_KEY } from "./firebase";

export type PushState = "unsupported" | "default" | "granted" | "denied";

export async function pushState(): Promise<PushState> {
  if (!firebaseConfigured || typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return "unsupported";
  if (!(await isSupported().catch(() => false))) return "unsupported";
  return Notification.permission;
}

/**
 * Gets this browser's FCM token and registers it with the backend
 * (POST /notifications/add) for the signed-in user. Asks for permission only
 * when `prompt` is set; returns the resulting permission.
 */
export async function enablePush({ prompt }: { prompt: boolean }): Promise<PushState> {
  const state = await pushState();
  if (state === "unsupported" || state === "denied") return state;
  if (state === "default") {
    if (!prompt) return state;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return permission;
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;
  // FCM can rotate tokens, so fetch it on every visit and resend if it changed.
  const token = await getToken(getMessaging(firebaseApp()), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  // Sent on every visit, not only when the token changes: if someone else
  // signed in on this browser in between, the backend moved the token to them.
  await apiFetch("/notifications/add", { method: "POST", body: JSON.stringify({ token }) });
  return "granted";
}
