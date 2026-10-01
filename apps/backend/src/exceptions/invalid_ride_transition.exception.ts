import { HttpException, HttpStatus } from '@nestjs/common';
import { RideStatus } from '../generated/prisma/enums';

export class InvalidRideTransitionException extends HttpException {
  constructor(from: RideStatus, to: RideStatus) {
    super(`Cannot move ride from ${from} to ${to}`, HttpStatus.CONFLICT);
  }
}
