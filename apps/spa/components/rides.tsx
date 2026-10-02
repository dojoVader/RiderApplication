"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { distanceKm, type DriverLocation, type Ride, type RideStatus } from "@/lib/rides";

const STATUS_LABELS: Record<RideStatus, string> = {
  REQUESTED: "Looking for a driver",
  ACCEPTED: "Driver on the way",
  IN_PROGRESS: "On the trip",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_STYLES: Record<RideStatus, string> = {
  REQUESTED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ACCEPTED: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  IN_PROGRESS: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function statusLabel(status: RideStatus) {
  return STATUS_LABELS[status];
}

export function StatusBadge({ status }: { status: RideStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

const STEPS: { status: RideStatus; label: string }[] = [
  { status: "REQUESTED", label: "Requested" },
  { status: "ACCEPTED", label: "Accepted" },
  { status: "IN_PROGRESS", label: "In progress" },
  { status: "COMPLETED", label: "Completed" },
];

// Progress along the happy path. A cancelled ride is shown by its badge instead.
export function StatusSteps({ status }: { status: RideStatus }) {
  if (status === "CANCELLED") return null;
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Ride progress">
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step.status} className="flex flex-col gap-1.5" aria-current={i === current ? "step" : undefined}>
            <span className={`h-1.5 rounded-full ${done ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-800"}`} />
            <span className={`text-xs ${done ? "font-medium" : "text-zinc-500 dark:text-zinc-500"}`}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function formatCoords(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function formatFare(fare: string | null) {
  return fare === null ? "No fare set" : Number(fare).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function MapLink({ lat, lng }: { lat: number; lng: number }) {
  return (
    <a
      href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
    >
      {formatCoords(lat, lng)}
    </a>
  );
}

export function RideRoute({ ride }: { ride: Ride }) {
  const km = distanceKm(ride.pickupLat, ride.pickupLng, ride.dropoffLat, ride.dropoffLng);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-zinc-500">Pickup</dt>
      <dd>
        <MapLink lat={ride.pickupLat} lng={ride.pickupLng} />
      </dd>
      <dt className="text-zinc-500">Drop-off</dt>
      <dd>
        <MapLink lat={ride.dropoffLat} lng={ride.dropoffLng} />
      </dd>
      <dt className="text-zinc-500">Distance</dt>
      <dd>{km.toFixed(1)} km</dd>
      <dt className="text-zinc-500">Fare</dt>
      <dd>{formatFare(ride.fare)}</dd>
    </dl>
  );
}

export function DriverLocationPanel({ ride, location }: { ride: Ride; location: DriverLocation | null }) {
  if (!location) {
    return <p className="text-sm text-zinc-500">The driver hasn&apos;t shared their location yet.</p>;
  }
  // Heading to the pickup until the trip starts, then to the drop-off.
  const target =
    ride.status === "IN_PROGRESS"
      ? { label: "drop-off", lat: ride.dropoffLat, lng: ride.dropoffLng }
      : { label: "pickup", lat: ride.pickupLat, lng: ride.pickupLng };
  const km = distanceKm(location.lat, location.lng, target.lat, target.lng);
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>
        Driver is <span className="font-medium">{km < 0.05 ? "here" : `${km.toFixed(2)} km`}</span>
        {km >= 0.05 && ` from the ${target.label}`}
      </p>
      <p className="text-zinc-500">
        <MapLink lat={location.lat} lng={location.lng} /> · updated {new Date(location.at).toLocaleTimeString()}
      </p>
    </div>
  );
}

export function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500" role="status">
      <span
        aria-hidden
        className={`size-2 rounded-full ${connected ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"}`}
      />
      {connected ? "Live" : "Reconnecting…"}
    </span>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" };

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const styles = {
    primary:
      "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",
    secondary:
      "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900",
    danger:
      "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950",
  }[variant];
  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
      {...props}
    />
  );
}

export function RideHistory({ rides }: { rides: Ride[] }) {
  if (rides.length === 0) {
    return <p className="text-sm text-zinc-500">No rides yet.</p>;
  }
  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {rides.map((ride) => (
        <li key={ride.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <div className="flex flex-col">
            <span>{new Date(ride.createdAt).toLocaleString()}</span>
            <span className="text-xs text-zinc-500">
              {distanceKm(ride.pickupLat, ride.pickupLng, ride.dropoffLat, ride.dropoffLng).toFixed(1)} km ·{" "}
              {formatFare(ride.fare)}
            </span>
          </div>
          <StatusBadge status={ride.status} />
        </li>
      ))}
    </ul>
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}
