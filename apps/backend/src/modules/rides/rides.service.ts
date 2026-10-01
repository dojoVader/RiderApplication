import {Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {CreateRidesRequest} from 'src/dtos/requests/create-rides.request';
import {Role} from '../../generated/prisma/enums';
import {RideNotFoundException} from '../../exceptions/ride_not_found.exception';

@Injectable()
export class RidesService {
  constructor(private prisma: PrismaService) {}

  // Create the ride for this user
  async createRides(ride: CreateRidesRequest) {
    return await this.prisma.ride.create({
        data: {
            driverId: ride.driverId,
            dropoffLat: ride.dropoffLat,
            dropoffLng: ride.dropoffLng,
            fare: ride.fare,
            pickupLat: ride.pickupLat,
            pickupLng: ride.pickupLng,
        },
    });
  }

  // Only the ride's rider, its assigned driver, or an admin may view it.
  // Anyone else gets a 404 so ride IDs can't be probed for existence.
  async findRideForUser(id: string, userId: string, role: Role) {
    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (
      !ride ||
      (role !== Role.ADMIN && ride.riderId !== userId && ride.driverId !== userId)
    ) {
      throw new RideNotFoundException();
    }
    return ride;
  }
}
