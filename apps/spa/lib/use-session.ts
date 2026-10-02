"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, logout, type SessionUser } from "./session";
import { closeSocket } from "./socket";

export type Session =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: SessionUser }
  | { status: "anonymous"; user: null };

// Client-side view of the httpOnly session cookie, checked via GET /auth/me.
export function useSession() {
  const [session, setSession] = useState<Session>({ status: "loading", user: null });

  useEffect(() => {
    let active = true;
    getCurrentUser().then((user) => {
      if (!active) return;
      setSession(user ? { status: "authenticated", user } : { status: "anonymous", user: null });
    });
    return () => {
      active = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    closeSocket();
    setSession({ status: "anonymous", user: null });
  }, []);

  return { ...session, signOut };
}
