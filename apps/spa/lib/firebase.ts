import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";

// Public web app config (see the root .env.example). Inlined by Next at build time.
const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Without these, push notifications are switched off rather than erroring.
export const firebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.messagingSenderId && config.appId && VAPID_KEY,
);

export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}
