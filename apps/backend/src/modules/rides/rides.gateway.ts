import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { parse as parseCookie } from 'cookie';
import { Server, Socket } from 'socket.io';
import { DriverLocationMessage } from '../../dtos/requests/driver-location.message';
import { RideSubscriptionMessage } from '../../dtos/requests/ride-subscription.message';
import { Ride } from '../../generated/prisma/client';
import { RideStatus, Role } from '../../generated/prisma/enums';
import { RidesService } from './rides.service';

// Same payload as the HTTP JwtGuard puts on req.user.
type JwtUser = { sub: string; email: string; role: Role; exp?: number };

export type DriverLocation = {
  rideId: string;
  lat: number;
  lng: number;
  heading?: number;
  at: string;
};

const DRIVERS_ROOM = 'drivers';
const rideRoom = (rideId: string) => `ride:${rideId}`;
const userRoom = (userId: string) => `user:${userId}`;

const ACTIVE_STATUSES: RideStatus[] = [RideStatus.ACCEPTED, RideStatus.IN_PROGRESS];

/**
 * Real-time channel for rides, at /socket.io (via nginx: /api/socket.io).
 *
 * Clients authenticate with the same `jwt` cookie as the REST API. Each socket
 * joins `user:<id>`, and drivers also join `drivers`.
 *
 * Server -> client:
 *   ride:requested   (Ride)              to drivers, when a rider creates a ride
 *   ride:unavailable ({ id, status })    to drivers, when a requested ride is taken or cancelled
 *   ride:updated     (Ride)              to the ride's rider, driver and subscribers
 *   driver:location  (DriverLocation)    to subscribers of that ride
 *
 * Client -> server (all acknowledged):
 *   ride:subscribe   ({ rideId })        -> { ride, location }
 *   ride:unsubscribe ({ rideId })        -> { ok }
 *   driver:location  (DriverLocationMessage) -> { ok }, assigned driver only
 */
@WebSocketGateway({
  // Matches the REST CORS config in main.ts, for `next dev` on another port.
  cors: { origin: 'http://localhost:9091', credentials: true },
})
@UsePipes(
  // Global pipes don't apply to gateways, so validate messages here.
  new ValidationPipe({
    whitelist: true,
    transform: true,
    // Same { status, message } shape Nest sends for string WsExceptions.
    exceptionFactory: (errors) =>
      new WsException({
        status: 'error',
        message: errors.flatMap((e) => Object.values(e.constraints ?? {})),
      }),
  }),
)
export class RidesGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(RidesGateway.name);

  // Last reported position per active ride, so a late subscriber sees the
  // driver straight away. In memory: running several backend instances would
  // need this (and the socket.io adapter) moved to Redis.
  private readonly lastLocations = new Map<string, DriverLocation>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly ridesService: RidesService,
  ) {}

  handleConnection(socket: Socket) {
    const user = this.authenticate(socket);
    if (!user) {
      socket.emit('exception', { status: 'error', message: 'Unauthorized' });
      socket.disconnect(true);
      return;
    }
    socket.data.user = user;
    void socket.join(userRoom(user.sub));
    if (user.role === Role.DRIVER) {
      void socket.join(DRIVERS_ROOM);
    }
  }

  @SubscribeMessage('ride:subscribe')
  async subscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { rideId }: RideSubscriptionMessage,
  ) {
    const user = this.currentUser(socket);
    // Throws the same 404 as GET /rides/:id when the user can't see the ride.
    const ride = await this.ridesService
      .findRideForUser(rideId, user.sub, user.role)
      .catch(() => {
        throw new WsException('Ride not found');
      });
    await socket.join(rideRoom(rideId));
    return { ride, location: this.lastLocations.get(rideId) ?? null };
  }

  @SubscribeMessage('ride:unsubscribe')
  async unsubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { rideId }: RideSubscriptionMessage,
  ) {
    await socket.leave(rideRoom(rideId));
    return { ok: true };
  }

  @SubscribeMessage('driver:location')
  async driverLocation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() message: DriverLocationMessage,
  ) {
    const user = this.currentUser(socket);
    if (user.role !== Role.DRIVER) {
      throw new WsException('Only drivers can send locations');
    }
    const ride = await this.ridesService
      .findRideForUser(message.rideId, user.sub, user.role)
      .catch(() => null);
    if (!ride || ride.driverId !== user.sub || !ACTIVE_STATUSES.includes(ride.status)) {
      throw new WsException('You can only share your location on an active ride you are driving');
    }

    const location: DriverLocation = {
      rideId: ride.id,
      lat: message.lat,
      lng: message.lng,
      heading: message.heading,
      at: new Date().toISOString(),
    };
    this.lastLocations.set(ride.id, location);
    // The rider gets it even without subscribing first.
    this.server.to([rideRoom(ride.id), userRoom(ride.riderId)]).emit('driver:location', location);
    return { ok: true };
  }

  // Called by RidesController after a ride is created.
  rideRequested(ride: Ride) {
    this.server.to(DRIVERS_ROOM).emit('ride:requested', ride);
  }

  // Called by RidesController after a ride is accepted or changes status.
  rideUpdated(ride: Ride) {
    const rooms = [rideRoom(ride.id), userRoom(ride.riderId)];
    if (ride.driverId) rooms.push(userRoom(ride.driverId));
    this.server.to(rooms).emit('ride:updated', ride);

    // Taken or cancelled: drop it from every driver's list of open requests.
    if (ride.status !== RideStatus.REQUESTED) {
      this.server.to(DRIVERS_ROOM).emit('ride:unavailable', { id: ride.id, status: ride.status });
    }
    if (!ACTIVE_STATUSES.includes(ride.status)) {
      this.lastLocations.delete(ride.id);
    }
  }

  private authenticate(socket: Socket): JwtUser | null {
    // Browsers send the httpOnly cookie on the handshake; other clients
    // (scripts, mobile) can pass the access_token from /auth/login instead.
    const cookies = parseCookie(socket.handshake.headers.cookie ?? '');
    const token = cookies.jwt ?? (socket.handshake.auth?.token as string | undefined);
    if (!token) return null;
    try {
      return this.jwtService.verify<JwtUser>(token, {
        secret: this.config.get<string>('SECRET'),
      });
    } catch (error) {
      this.logger.debug(`Rejected socket ${socket.id}: ${(error as Error).message}`);
      return null;
    }
  }

  // The socket outlives the JWT, so re-check expiry on every message.
  private currentUser(socket: Socket): JwtUser {
    const user = socket.data.user as JwtUser | undefined;
    if (!user || (user.exp && user.exp * 1000 < Date.now())) {
      socket.disconnect(true);
      throw new WsException('Session expired');
    }
    return user;
  }
}
