"use client";

import { useEffect, useRef, useState } from "react";
import type { DriverLocation, Ride } from "./rides";
import { getSocket, type ServerEvents } from "./socket";

// Listens to a gateway event for the lifetime of the component. The latest
// handler is always used, so callers don't need to memoise it.
export function useSocketEvent<E extends keyof ServerEvents>(event: E, handler: ServerEvents[E]) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const socket = getSocket();
    const listener = ((...args: Parameters<ServerEvents[E]>) =>
      (handlerRef.current as (...a: Parameters<ServerEvents[E]>) => void)(...args)) as ServerEvents[E];
    // socket.io's typed `on` can't relate a generic E to its listener type.
    socket.on(event as keyof ServerEvents, listener as never);
    return () => {
      socket.off(event as keyof ServerEvents, listener as never);
    };
  }, [event]);
}

export function useSocketConnected(): boolean {
  const [connected, setConnected] = useState(() => getSocket().connected);
  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);
  return connected;
}

// Joins a ride's room and reports the server's snapshot, again after every
// reconnect so updates missed while offline are caught up.
export function useRideSubscription(
  rideId: string | null,
  onSnapshot: (ride: Ride, location: DriverLocation | null) => void,
) {
  const snapshotRef = useRef(onSnapshot);
  useEffect(() => {
    snapshotRef.current = onSnapshot;
  });

  useEffect(() => {
    if (!rideId) return;
    const socket = getSocket();
    const subscribe = () => {
      socket.emit("ride:subscribe", { rideId }, ({ ride, location }) => snapshotRef.current(ride, location));
    };
    if (socket.connected) subscribe();
    socket.on("connect", subscribe);
    return () => {
      socket.off("connect", subscribe);
      if (socket.connected) socket.emit("ride:unsubscribe", { rideId }, () => {});
    };
  }, [rideId]);
}
