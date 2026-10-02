import { IsUUID } from 'class-validator';

// Payload of the `ride:subscribe` / `ride:unsubscribe` WebSocket messages.
export class RideSubscriptionMessage {
  @IsUUID()
  rideId: string;
}
