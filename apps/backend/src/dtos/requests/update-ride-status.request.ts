import { IsEnum } from 'class-validator';
import { RideStatus } from '../../generated/prisma/enums';

export class UpdateRideStatusRequest {
  @IsEnum(RideStatus)
  status: RideStatus;
}
