"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FormError } from "@/components/form";
import {
  Button,
  errorMessage,
  formatCoords,
  LiveIndicator,
  Panel,
  RideHistory,
  RideRoute,
  StatusBadge,
  StatusSteps,
} from "@/components/rides";
import { ApiError } from "@/lib/api";
import {
  ACTIVE_STATUSES,
  acceptRide,
  distanceKm,
  getActiveRide,
  getAvailableRides,
  getRideHistory,
  updateRideStatus,
  type Ride,
  type RideStatus,
} from "@/lib/rides";
import { getSocket } from "@/lib/socket";
import { useRideSubscription, useSocketConnected, useSocketEvent } from "@/lib/use-socket";

export function DriverDashboard() {
  // undefined while loading; null when the driver is free.
  const [ride, setRide] = useState<Ride | null | undefined>(undefined);
  const [available, setAvailable] = useState<Ride[]>([]);
  const [history, setHistory] = useState<Ride[]>([]);
  const [notice, setNotice] = useState<string>();
  const connected = useSocketConnected();

  const refreshAvailable = useCallback(() => {
    getAvailableRides().then(setAvailable, () => {});
  }, []);
  const refreshHistory = useCallback(() => {
    getRideHistory(10).then((page) => setHistory(page.data), () => {});
  }, []);

  useEffect(() => {
    getActiveRide().then(setRide, () => setRide(null));
    refreshAvailable();
    refreshHistory();
  }, [refreshAvailable, refreshHistory]);

  // Requests made while the socket was down never arrived, so reload on reconnect.
  useEffect(() => {
    const socket = getSocket();
    socket.on("connect", refreshAvailable);
    return () => {
      socket.off("connect", refreshAvailable);
    };
  }, [refreshAvailable]);

  useSocketEvent("ride:requested", (requested) => {
    setAvailable((list) => (list.some((r) => r.id === requested.id) ? list : [...list, requested]));
  });

  useSocketEvent("ride:unavailable", ({ id }) => {
    setAvailable((list) => list.filter((r) => r.id !== id));
  });

  useRideSubscription(ride?.id ?? null, (snapshot) => setRide(snapshot));

  useSocketEvent("ride:updated", (updated) => {
    setHistory((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    if (updated.id !== ride?.id) return;
    if (updated.status === "CANCELLED" && ride.status !== "CANCELLED") {
      setNotice("The rider cancelled this ride.");
    }
    setRide(updated);
    if (!ACTIVE_STATUSES.includes(updated.status)) refreshHistory();
  });

  async function accept(id: string) {
    setNotice(undefined);
    try {
      setRide(await acceptRide(id));
      setAvailable((list) => list.filter((r) => r.id !== id));
      refreshHistory();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setAvailable((list) => list.filter((r) => r.id !== id));
        setNotice(error.message.startsWith("Cannot move") ? "Another driver already took that ride." : error.message);
      } else {
        setNotice(errorMessage(error));
      }
    }
  }

  if (ride === undefined) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {notice && <FormError>{notice}</FormError>}

      {ride ? (
        <CurrentTrip
          ride={ride}
          connected={connected}
          onChange={(next) => {
            setRide(next);
            refreshHistory();
          }}
          onDone={() => {
            setRide(null);
            setNotice(undefined);
            refreshAvailable();
          }}
        />
      ) : (
        <Panel title="Ride requests" action={<LiveIndicator connected={connected} />}>
          <AvailableRides rides={available} onAccept={accept} />
        </Panel>
      )}

      <Panel title="Recent trips">
        <RideHistory rides={history} />
      </Panel>
    </div>
  );
}

function AvailableRides({ rides, onAccept }: { rides: Ride[]; onAccept: (id: string) => Promise<void> }) {
  const [accepting, setAccepting] = useState<string>();

  if (rides.length === 0) {
    return <p className="text-sm text-zinc-500">No open requests right now. New ones appear here as riders book.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {rides.map((ride) => (
        <li
          key={ride.id}
          className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
        >
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              {distanceKm(ride.pickupLat, ride.pickupLng, ride.dropoffLat, ride.dropoffLng).toFixed(1)} km trip
              {ride.fare !== null && ` · ${Number(ride.fare).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </span>
            <span className="font-mono text-xs text-zinc-500">
              {formatCoords(ride.pickupLat, ride.pickupLng)} → {formatCoords(ride.dropoffLat, ride.dropoffLng)}
            </span>
            <span className="text-xs text-zinc-500">Requested {new Date(ride.createdAt).toLocaleTimeString()}</span>
          </div>
          <Button
            disabled={accepting !== undefined}
            onClick={async () => {
              setAccepting(ride.id);
              try {
                await onAccept(ride.id);
              } finally {
                setAccepting(undefined);
              }
            }}
          >
            {accepting === ride.id ? "Accepting…" : "Accept"}
          </Button>
        </li>
      ))}
    </ul>
  );
}

const NEXT_STEP: Partial<Record<RideStatus, { status: RideStatus; label: string }>> = {
  ACCEPTED: { status: "IN_PROGRESS", label: "Start trip" },
  IN_PROGRESS: { status: "COMPLETED", label: "Complete trip" },
};

function CurrentTrip({
  ride,
  connected,
  onChange,
  onDone,
}: {
  ride: Ride;
  connected: boolean;
  onChange: (ride: Ride) => void;
  onDone: () => void;
}) {
  const [pending, setPending] = useState<RideStatus>();
  const [error, setError] = useState<string>();
  const finished = !ACTIVE_STATUSES.includes(ride.status);
  const next = NEXT_STEP[ride.status];

  async function move(status: RideStatus) {
    setPending(status);
    setError(undefined);
    try {
      onChange(await updateRideStatus(ride.id, status));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(undefined);
    }
  }

  return (
    <Panel title="Current trip" action={finished ? undefined : <LiveIndicator connected={connected} />}>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={ride.status} />
      </div>
      <StatusSteps status={ride.status} />
      <RideRoute ride={ride} />

      {(ride.status === "ACCEPTED" || ride.status === "IN_PROGRESS") && <LocationSharing ride={ride} />}

      <FormError>{error}</FormError>

      {finished ? (
        <Button onClick={onDone}>Find another ride</Button>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          {next && (
            <Button onClick={() => move(next.status)} disabled={pending !== undefined} className="sm:flex-1">
              {pending === next.status ? "Updating…" : next.label}
            </Button>
          )}
          {ride.status === "ACCEPTED" && (
            <Button variant="danger" onClick={() => move("CANCELLED")} disabled={pending !== undefined}>
              {pending === "CANCELLED" ? "Cancelling…" : "Cancel ride"}
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}

type Mode = "off" | "device" | "simulate";
type Point = { lat: number; lng: number };

const SEND_EVERY_MS = 2000;
const SIMULATION_STEPS = 30;

function bearing(from: Point, to: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(rad(to.lng - from.lng)) * Math.cos(rad(to.lat));
  const x =
    Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) -
    Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lng - from.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Sends the driver's position over the socket: from the device's GPS, or a
// mock drive towards the pickup (before the trip) and then the drop-off.
function LocationSharing({ ride }: { ride: Ride }) {
  const [mode, setMode] = useState<Mode>("off");
  const [last, setLast] = useState<{ point: Point; at: Date }>();
  const [error, setError] = useState<string>();
  const stepRef = useRef(0);

  useSocketEvent("exception", (e) => {
    if (mode !== "off") setError(Array.isArray(e.message) ? e.message.join(", ") : e.message);
  });

  const send = useCallback(
    (point: Point, heading?: number) => {
      getSocket().emit(
        "driver:location",
        { rideId: ride.id, lat: point.lat, lng: point.lng, heading },
        () => {
          setLast({ point, at: new Date() });
          setError(undefined);
        },
      );
    },
    [ride.id],
  );

  // Restart the mock route whenever the leg changes (pickup -> drop-off).
  useEffect(() => {
    stepRef.current = 0;
  }, [ride.status]);

  useEffect(() => {
    if (mode !== "simulate") return;
    const pickup = { lat: ride.pickupLat, lng: ride.pickupLng };
    const dropoff = { lat: ride.dropoffLat, lng: ride.dropoffLng };
    // Before the trip, approach the pickup from ~1.5 km away.
    const [from, to] =
      ride.status === "IN_PROGRESS" ? [pickup, dropoff] : [{ lat: pickup.lat + 0.01, lng: pickup.lng + 0.01 }, pickup];

    const tick = () => {
      const t = Math.min(stepRef.current / SIMULATION_STEPS, 1);
      const point = { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t };
      send(point, bearing(from, to));
      if (t < 1) stepRef.current += 1;
    };
    tick();
    const id = setInterval(tick, SEND_EVERY_MS);
    return () => clearInterval(id);
  }, [mode, ride.status, ride.pickupLat, ride.pickupLng, ride.dropoffLat, ride.dropoffLng, send]);

  useEffect(() => {
    if (mode !== "device") return;
    let lastSent = 0;
    const watch = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (Date.now() - lastSent < SEND_EVERY_MS) return;
        lastSent = Date.now();
        send({ lat: coords.latitude, lng: coords.longitude }, coords.heading ?? undefined);
      },
      (e) => {
        setError(`Couldn't read your location: ${e.message}`);
        setMode("off");
      },
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [mode, send]);

  const choose = (next: Mode) => {
    setError(undefined);
    if (next === "device" && !navigator.geolocation) {
      setError("This browser can't share its location. Try the simulated drive.");
      return;
    }
    setMode(next);
  };

  return (
    <div className="flex flex-col gap-3 rounded-md bg-zinc-50 p-4 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Share your location</h3>
        {mode !== "off" && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-emerald-500" />
            Sharing {mode === "simulate" ? "simulated drive" : "device location"}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant={mode === "device" ? "primary" : "secondary"} onClick={() => choose("device")}>
          Use my location
        </Button>
        <Button variant={mode === "simulate" ? "primary" : "secondary"} onClick={() => choose("simulate")}>
          Simulate drive
        </Button>
        {mode !== "off" && (
          <Button variant="secondary" onClick={() => choose("off")}>
            Stop
          </Button>
        )}
      </div>
      {last && (
        <p className="text-xs text-zinc-500">
          Last sent {formatCoords(last.point.lat, last.point.lng)} at {last.at.toLocaleTimeString()}
        </p>
      )}
      <FormError>{error}</FormError>
    </div>
  );
}
