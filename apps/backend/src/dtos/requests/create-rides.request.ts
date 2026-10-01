import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { RideStatus } from '../../generated/prisma/enums';

export class CreateRidesRequest {
  // Null until a driver accepts the ride.
  @IsUUID()
  @IsOptional()
  driverId?: string;

  // Defaults to REQUESTED in the database.
  @IsEnum(RideStatus)
  @IsOptional()
  status?: RideStatus;

  @IsLatitude()
  @IsNotEmpty()
  pickupLat: number;

  @IsLongitude()
  @IsNotEmpty()
  pickupLng: number;

  @IsLatitude()
  @IsNotEmpty()
  dropoffLat: number;

  @IsLongitude()
  @IsNotEmpty()
  dropoffLng: number;

  // Stored as Decimal(10, 2).
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  fare?: number;
}
