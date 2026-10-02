"use client";

import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";
import type { DriverLocation, Ride, RideStatus } from "./rides";

// Events RidesGateway (apps/backend/src/modules/rides/rides.gateway.ts) sends and accepts.
export type ServerEvents = {
  "ride:requested": (ride: Ride) => void;
  "ride:unavailable": (payload: { id: string; status: RideStatus }) => void;
  "ride:updated": (ride: Ride) => void;
  "driver:location": (location: DriverLocation) => void;
  exception: (error: { status: string; message: string | string[] }) => void;
};

export type ClientEvents = {
  "ride:subscribe": (
    payload: { rideId: string },
    ack: (res: { ride: Ride; location: DriverLocation | null }) => void,
  ) => void;
  "ride:unsubscribe": (payload: { rideId: string }, ack: (res: { ok: boolean }) => void) => void;
  "driver:location": (
    payload: { rideId: string; lat: number; lng: number; heading?: number },
    ack: (res: { ok: boolean }) => void,
  ) => void;
};

export type RideSocket = Socket<ServerEvents, ClientEvents>;

let socket: RideSocket | null = null;

// The gateway lives next to the REST API: /api/socket.io behind nginx, or
// <NEXT_PUBLIC_API_URL>/socket.io when that points straight at the backend.
function endpoint(): { url: string | undefined; path: string } {
  if (/^https?:\/\//.test(API_URL)) {
    const url = new URL(API_URL);
    return { url: url.origin, path: `${url.pathname.replace(/\/$/, "")}/socket.io` };
  }
  return { url: undefined, path: `${API_URL.replace(/\/$/, "")}/socket.io` };
}

// One connection per tab, authenticated by the httpOnly `jwt` cookie.
export function getSocket(): RideSocket {
  if (!socket) {
    const { url, path } = endpoint();
    const options = { path, withCredentials: true, transports: ["websocket"] };
    socket = url ? io(url, options) : io(options);
  }
  return socket;
}

// Call on sign-out so the next user doesn't inherit this session's socket.
export function closeSocket() {
  socket?.close();
  socket = null;
}
