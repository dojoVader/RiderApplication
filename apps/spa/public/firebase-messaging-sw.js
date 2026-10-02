/* Push notifications from Firebase Cloud Messaging.
 *
 * Ride status changes are pushed by the backend (NotificationProcessor). When
 * an app tab is focused the message is handed to it for an in-app toast;
 * otherwise it becomes a system notification.
 *
 * Registered by lib/push.ts and handed to getToken(), so FCM delivers to this
 * worker. It needs no Firebase SDK: an FCM web push is a standard `push` event
 * whose JSON payload carries the message's `notification` and `data`.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { notification: { body: event.data ? event.data.text() : "" } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || "Ride";
  const options = {
    body: notification.body || data.body || "",
    icon: notification.icon || "/favicon.ico",
    // One notification per ride: a newer status replaces the older one.
    tag: data.rideId ? `ride:${data.rideId}` : undefined,
    renotify: Boolean(data.rideId),
    data: { link: data.link || (payload.fcmOptions && payload.fcmOptions.link) || "/dashboard", ...data },
  };

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // The app is open and in front: let it show an in-app toast instead
      // (components/notification-toasts.tsx). Otherwise use a system notification.
      const focused = windows.filter((w) => w.focused && w.visibilityState === "visible");
      if (focused.length > 0) {
        focused.forEach((w) => w.postMessage({ type: "push", title, body: options.body, data: options.data }));
        return undefined;
      }
      return self.registration.showNotification(title, options);
    }),
  );
});

// Focus an open tab of the app (navigating it to the link) or open a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.link || "/dashboard", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) {
        return existing.focus().then((w) => (w && "navigate" in w ? w.navigate(url) : w));
      }
      return self.clients.openWindow(url);
    }),
  );
});
