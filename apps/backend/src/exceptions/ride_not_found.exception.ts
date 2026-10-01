import { HttpException, HttpStatus } from '@nestjs/common';

export class RideNotFoundException extends HttpException {
  constructor() {
    super('Ride not found', HttpStatus.NOT_FOUND);
  }
}
