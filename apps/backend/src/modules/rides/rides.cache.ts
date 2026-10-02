// Ride lookups (GET /rides/:id, the gateway's checks) are cached per ride id.
// RidesService fills the cache; RidesGateway.rideUpdated clears it on changes.
export const RIDE_CACHE_TTL_MS = 30_000;

export function rideCacheKey(id: string) {
  return `rides:ride:${id}`;
}
