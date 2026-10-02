import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

// Payload of the `driver:location` WebSocket message.
export class DriverLocationMessage {
  @IsUUID()
  rideId: string;

  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;

  // Degrees clockwise from north, when the device reports it.
  @IsNumber()
  @Min(0)
  @Max(360)
  @IsOptional()
  heading?: number;
}
