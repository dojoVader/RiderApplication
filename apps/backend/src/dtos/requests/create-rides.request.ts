import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateRidesRequest {
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
