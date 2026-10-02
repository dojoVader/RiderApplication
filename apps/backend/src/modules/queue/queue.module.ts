import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * Shared BullMQ setup. Feature modules register their own queues with
 * `BullModule.registerQueue({ name: '...' })`; all of them use RedisService's
 * connection (workers get a duplicate for their blocking commands).
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redis: RedisService) => ({
        connection: redis.getClient(),
        // Keep finished jobs around briefly for debugging, without growing Redis forever.
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
