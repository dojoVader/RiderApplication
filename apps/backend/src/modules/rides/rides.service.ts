import { ForbiddenException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRidesRequest } from 'src/dtos/requests/create-rides.request';
import { PaginationRequest } from '../../dtos/requests/pagination.request';
import { Paginated } from '../../dtos/response/paginated';
import { Prisma, Ride } from '../../generated/prisma/client';
import { RideStatus, Role } from '../../generated/prisma/enums';
import { RideNotFoundException } from '../../exceptions/ride_not_found.exception';
import { InvalidRideTransitionException } from '../../exceptions/invalid_ride_transition.exception';

// Allowed status moves. REQUESTED -> ACCEPTED is absent on purpose: it only
// happens through acceptRide, which also assigns the driver.
const RIDE_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  [RideStatus.REQUESTED]: [RideStatus.CANCELLED],
  [RideStatus.ACCEPTED]: [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
  [RideStatus.IN_PROGRESS]: [RideStatus.COMPLETED],
  [RideStatus.COMPLETED]: [],
  [RideStatus.CANCELLED]: [],
};

@Injectable()
export class RidesService {
  constructor(private prisma: PrismaService) {}

  // Create a REQUESTED ride for this rider. The driver is assigned later via acceptRide.
  async createRides(ride: CreateRidesRequest, riderId: string) {
    return await this.prisma.ride.create({
      data: {
        riderId,
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
      (role !== Role.ADMIN &&
        ride.riderId !== userId &&
        ride.driverId !== userId)
    ) {
      throw new RideNotFoundException();
    }
    return ride;
  }

  // Riders and drivers see rides they took part in; admins see every ride.
  async findRideHistory(
    userId: string,
    role: Role,
    { limit, offset }: PaginationRequest,
  ): Promise<Paginated<Ride>> {
    const where: Prisma.RideWhereInput =
      role === Role.ADMIN
        ? {}
        : { OR: [{ riderId: userId }, { driverId: userId }] };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ride.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.ride.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  // Assigns the driver to a REQUESTED ride. The conditional update makes this
  // safe when two drivers accept the same ride at once: only one matches.
  async acceptRide(id: string, driverId: string): Promise<Ride> {
    return this.prisma.$transaction(async (tx) => {
      const ride = await tx.ride.findUnique({ where: { id } });
      if (!ride) {
        throw new RideNotFoundException();
      }
      if (ride.riderId === driverId) {
        throw new ForbiddenException('Drivers cannot accept their own ride');
      }

      const { count } = await tx.ride.updateMany({
        where: { id, status: RideStatus.REQUESTED, driverId: null },
        data: { status: RideStatus.ACCEPTED, driverId },
      });
      if (count === 0) {
        throw new InvalidRideTransitionException(
          ride.status,
          RideStatus.ACCEPTED,
        );
      }

      await tx.rideEvent.create({
        data: {
          rideId: id,
          eventType: RideStatus.ACCEPTED,
          payload: { by: driverId },
        },
      });
      return tx.ride.findUniqueOrThrow({ where: { id } });
    });
  }

  // Moves a ride along RIDE_TRANSITIONS. Starting and completing belong to the
  // assigned driver; cancelling is open to the rider or the driver. Admins may do any valid move.
  async updateRideStatus(
    id: string,
    userId: string,
    role: Role,
    status: RideStatus,
  ): Promise<Ride> {
    return this.prisma.$transaction(async (tx) => {
      const ride = await tx.ride.findUnique({ where: { id } });
      const isDriver = ride?.driverId === userId;
      const isRider = ride?.riderId === userId;
      if (!ride || (role !== Role.ADMIN && !isDriver && !isRider)) {
        throw new RideNotFoundException();
      }

      if (!RIDE_TRANSITIONS[ride.status].includes(status)) {
        throw new InvalidRideTransitionException(ride.status, status);
      }
      if (role !== Role.ADMIN && status !== RideStatus.CANCELLED && !isDriver) {
        throw new ForbiddenException(
          'Only the assigned driver can change this ride',
        );
      }

      // Guard on the status we read so a concurrent change can't be overwritten.
      const { count } = await tx.ride.updateMany({
        where: { id, status: ride.status },
        data: { status },
      });
      if (count === 0) {
        throw new InvalidRideTransitionException(ride.status, status);
      }

      await tx.rideEvent.create({
        data: {
          rideId: id,
          eventType: status,
          payload: { by: userId, from: ride.status },
        },
      });
      return tx.ride.findUniqueOrThrow({ where: { id } });
    });
  }
}
