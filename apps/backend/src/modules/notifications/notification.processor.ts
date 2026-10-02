import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma } from '../../generated/prisma/client';
import { Role } from '../../generated/prisma/enums';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATIONS_QUEUE, PushJob } from './notification.queue';

// Delivers queued pushes. Runs off the request path, and BullMQ retries a job
// when FCM fails transiently.
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {
    super();
  }

  async process(job: Job<PushJob>) {
    const { audience, message } = job.data;
    const where: Prisma.UserWhereInput =
      'userIds' in audience
        ? { id: { in: audience.userIds } }
        : {
            role: Role.DRIVER,
            ...(audience.exceptUserId && {
              NOT: { id: audience.exceptUserId },
            }),
          };
    const users = await this.prisma.user.findMany({
      where: { ...where, fcmToken: { not: null } },
      select: { fcmToken: true },
    });
    const tokens = users.map((u) => u.fcmToken as string);
    if (tokens.length === 0) return { sent: 0, invalid: 0 };

    const { sent, invalidTokens } = await this.firebase.sendPush(
      tokens,
      message,
    );
    if (invalidTokens.length > 0) {
      // Uninstalled or expired: stop sending to them.
      await this.prisma.user.updateMany({
        where: { fcmToken: { in: invalidTokens } },
        data: { fcmToken: null },
      });
    }
    this.logger.log(
      `"${message.title}" -> ${sent}/${tokens.length} delivered, ${invalidTokens.length} stale token(s) removed`,
    );
    return { sent, invalid: invalidTokens.length };
  }
}
