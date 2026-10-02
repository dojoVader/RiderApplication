import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Ride } from '../../generated/prisma/client';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATIONS_QUEUE, PushJob } from './notification.queue';
import { rideRequestedPush, rideUpdatedPushes } from './ride-notifications';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<PushJob>,
  ) {}

  /**
   * Stores the device's FCM token on the user so they can be sent push
   * notifications. The token is verified with Firebase first, so a bad or
   * stale token is rejected here instead of failing every later send.
   */
  async registerNotification(userId: string, token: string) {
    if (!(await this.firebase.isValidFcmToken(token))) {
      throw new BadRequestException('Invalid or expired FCM token');
    }

    await this.prisma.$transaction([
      // A token identifies a device: if someone else signed in on it before,
      // stop sending their notifications here.
      this.prisma.user.updateMany({
        where: { fcmToken: token, NOT: { id: userId } },
        data: { fcmToken: null },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { fcmToken: token },
      }),
    ]);

    return { registered: true };
  }

  // Push to drivers that a new ride is waiting.
  async rideRequested(ride: Ride) {
    await this.enqueue([rideRequestedPush(ride)]);
  }

  // Push a status change to the ride's rider/driver, except the one who made it.
  async rideUpdated(ride: Ride, actorId: string) {
    await this.enqueue(rideUpdatedPushes(ride, actorId));
  }

  // Notifications are best-effort: a Redis hiccup must not fail the ride
  // request that triggered them.
  private async enqueue(jobs: PushJob[]) {
    if (jobs.length === 0) return;
    try {
      await this.queue.addBulk(
        jobs.map((data) => ({
          name: 'push',
          data,
          opts: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
        })),
      );
    } catch (error) {
      this.logger.error(
        `Couldn't queue notifications: ${(error as Error).message}`,
      );
    }
  }
}
