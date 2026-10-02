"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FormError, SubmitButton, TextField } from "@/components/form";
import {
  Button,
  DriverLocationPanel,
  errorMessage,
  LiveIndicator,
  Panel,
  RideHistory,
  RideRoute,
  StatusBadge,
  StatusSteps,
} from "@/components/rides";
import {
  ACTIVE_STATUSES,
  createRide,
  getActiveRide,
  getRideHistory,
  updateRideStatus,
  type DriverLocation,
  type NewRide,
  type Ride,
} from "@/lib/rides";
import { useRideSubscription, useSocketConnected, useSocketEvent } from "@/lib/use-socket";

export function RiderDashboard() {
  // undefined while loading; null when there's nothing to show.
  const [ride, setRide] = useState<Ride | null | undefined>(undefined);
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [history, setHistory] = useState<Ride[]>([]);
  const [loadError, setLoadError] = useState<string>();
  const connected = useSocketConnected();

  const refreshHistory = useCallback(() => {
    getRideHistory(10).then((page) => setHistory(page.data), () => {});
  }, []);

  useEffect(() => {
    getActiveRide().then(setRide, (error) => {
      setRide(null);
      setLoadError(errorMessage(error));
    });
    refreshHistory();
  }, [refreshHistory]);

  useRideSubscription(ride?.id ?? null, (snapshot, last) => {
    setRide(snapshot);
    setLocation(last);
  });

  useSocketEvent("ride:updated", (updated) => {
    setHistory((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    if (updated.id !== ride?.id) return;
    setRide(updated);
    if (!ACTIVE_STATUSES.includes(updated.status)) {
      setLocation(null);
      refreshHistory();
    }
  });

  useSocketEvent("driver:location", (update) => {
    if (update.rideId === ride?.id) setLocation(update);
  });

  if (ride === undefined) {
    return <p className="text-sm text-zinc-500">Loading your rides…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {loadError && <FormError>{loadError}</FormError>}

      {ride ? (
        <CurrentRide
          ride={ride}
          location={location}
          connected={connected}
          onChange={(next) => {
            setRide(next);
            refreshHistory();
          }}
          onDone={() => setRide(null)}
        />
      ) : (
        <RequestRideForm
          onCreated={(created) => {
            setRide(created);
            setLocation(null);
            refreshHistory();
          }}
        />
      )}

      <Panel title="Recent rides">
        <RideHistory rides={history} />
      </Panel>
    </div>
  );
}

function CurrentRide({
  ride,
  location,
  connected,
  onChange,
  onDone,
}: {
  ride: Ride;
  location: DriverLocation | null;
  connected: boolean;
  onChange: (ride: Ride) => void;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const finished = !ACTIVE_STATUSES.includes(ride.status);
  const canCancel = ride.status === "REQUESTED" || ride.status === "ACCEPTED";

  async function cancel() {
    setPending(true);
    setError(undefined);
    try {
      onChange(await updateRideStatus(ride.id, "CANCELLED"));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title="Your ride" action={finished ? undefined : <LiveIndicator connected={connected} />}>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={ride.status} />
        <span className="text-xs text-zinc-500">Requested {new Date(ride.createdAt).toLocaleTimeString()}</span>
      </div>
      <StatusSteps status={ride.status} />
      <RideRoute ride={ride} />

      {(ride.status === "ACCEPTED" || ride.status === "IN_PROGRESS") && (
        <div className="rounded-md bg-zinc-50 p-4 dark:bg-zinc-900">
          <h3 className="mb-2 text-sm font-medium">Driver location</h3>
          <DriverLocationPanel ride={ride} location={location} />
        </div>
      )}

      <FormError>{error}</FormError>

      {finished ? (
        <Button onClick={onDone}>Request another ride</Button>
      ) : (
        canCancel && (
          <Button variant="danger" onClick={cancel} disabled={pending}>
            {pending ? "Cancelling…" : "Cancel ride"}
          </Button>
        )
      )}
    </Panel>
  );
}

type Coord = "pickupLat" | "pickupLng" | "dropoffLat" | "dropoffLng";
type FormValues = Record<Coord | "fare", string>;
type FormErrors = Partial<Record<Coord | "fare", string>>;

const EMPTY: FormValues = { pickupLat: "", pickupLng: "", dropoffLat: "", dropoffLng: "", fare: "" };

function validate(values: FormValues): { errors: FormErrors; ride?: NewRide } {
  const errors: FormErrors = {};
  const coord = (key: Coord, max: number) => {
    const raw = values[key].trim();
    const n = Number(raw);
    if (!raw) errors[key] = "Required.";
    else if (!Number.isFinite(n) || Math.abs(n) > max) errors[key] = `Must be between -${max} and ${max}.`;
    return n;
  };
  const ride: NewRide = {
    pickupLat: coord("pickupLat", 90),
    pickupLng: coord("pickupLng", 180),
    dropoffLat: coord("dropoffLat", 90),
    dropoffLng: coord("dropoffLng", 180),
  };
  if (values.fare.trim()) {
    const fare = Number(values.fare);
    if (!Number.isFinite(fare) || fare < 0 || Math.round(fare * 100) !== fare * 100) {
      errors.fare = "Enter an amount with at most 2 decimal places.";
    } else {
      ride.fare = fare;
    }
  }
  return Object.keys(errors).length > 0 ? { errors } : { errors, ride };
}

function RequestRideForm({ onCreated }: { onCreated: (ride: Ride) => void }) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [locating, setLocating] = useState(false);

  const field = (key: keyof FormValues) => ({
    name: key,
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.value })),
    error: errors[key],
    inputMode: "decimal" as const,
  });

  function fillMyLocation() {
    if (!navigator.geolocation) {
      setFormError("Your browser can't share its location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setValues((v) => ({ ...v, pickupLat: coords.latitude.toFixed(6), pickupLng: coords.longitude.toFixed(6) }));
        setLocating(false);
      },
      () => {
        setFormError("Couldn't get your location. Enter the pickup coordinates instead.");
        setLocating(false);
      },
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const result = validate(values);
    setErrors(result.errors);
    if (!result.ride) return;

    setPending(true);
    try {
      onCreated(await createRide(result.ride));
      setValues(EMPTY);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title="Request a ride">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <FormError>{formError}</FormError>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 flex w-full items-center justify-between gap-3 text-sm font-medium">
            Pickup
            <button
              type="button"
              onClick={fillMyLocation}
              disabled={locating}
              className="font-medium text-zinc-700 underline-offset-4 hover:underline disabled:opacity-60 dark:text-zinc-300"
            >
              {locating ? "Locating…" : "Use my location"}
            </button>
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Latitude" placeholder="6.5244" {...field("pickupLat")} />
            <TextField label="Longitude" placeholder="3.3792" {...field("pickupLng")} />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-medium">Drop-off</legend>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Latitude" placeholder="6.4654" {...field("dropoffLat")} />
            <TextField label="Longitude" placeholder="3.4064" {...field("dropoffLng")} />
          </div>
        </fieldset>

        <TextField label="Fare (optional)" placeholder="2500.00" {...field("fare")} />

        <SubmitButton pending={pending}>{pending ? "Requesting…" : "Request ride"}</SubmitButton>
      </form>
    </Panel>
  );
}
