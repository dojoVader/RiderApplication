import { apiFetch } from "./api";

// Mirrors the Prisma `Ride` model (apps/backend/prisma/schema.prisma).
export type RideStatus = "REQUESTED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type Ride = {
  id: string;
  riderId: string;
  driverId: string | null;
  status: RideStatus;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  // Prisma serialises Decimal(10, 2) as a string.
  fare: string | null;
  createdAt: string;
  updatedAt: string;
};

// Broadcast by RidesGateway as `driver:location`.
export type DriverLocation = {
  rideId: string;
  lat: number;
  lng: number;
  heading?: number;
  at: string;
};

export type Paginated<T> = { data: T[]; total: number; limit: number; offset: number };

export type NewRide = {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  fare?: number;
};

export const ACTIVE_STATUSES: RideStatus[] = ["REQUESTED", "ACCEPTED", "IN_PROGRESS"];

export function createRide(ride: NewRide) {
  return apiFetch<Ride>("/rides", { method: "POST", body: JSON.stringify(ride) });
}

export async function getActiveRide() {
  const { ride } = await apiFetch<{ ride: Ride | null }>("/rides/active");
  return ride;
}

export function getAvailableRides() {
  return apiFetch<Ride[]>("/rides/available");
}

export function getRideHistory(limit = 10, offset = 0) {
  return apiFetch<Paginated<Ride>>(`/rides/history?limit=${limit}&offset=${offset}`);
}

export function acceptRide(id: string) {
  return apiFetch<Ride>(`/rides/${id}/accept`, { method: "PATCH" });
}

export function updateRideStatus(id: string, status: RideStatus) {
  return apiFetch<Ride>(`/rides/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

// Great-circle distance in kilometres.
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
