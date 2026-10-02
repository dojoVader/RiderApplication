import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { redisOptions } from './redis-options';

/**
 * Owns the app's single Redis connection. `getClient()` creates it on first
 * use and returns the same instance afterwards, so the cache and BullMQ share
 * one socket instead of each opening their own.
 */
@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  getClient(): Redis {
    if (!this.client) {
      const options = redisOptions(this.config);
      this.client = new Redis({
        ...options,
        // Required by BullMQ, which shares this connection: its commands must
        // wait for Redis to come back rather than fail after N retries.
        maxRetriesPerRequest: null,
      });
      this.client.on('ready', () =>
        this.logger.log(`Connected to ${options.host}:${options.port}`),
      );
      this.client.on('error', (error) =>
        this.logger.error(`Redis error: ${error.message}`),
      );
    }
    return this.client;
  }

  async onApplicationShutdown() {
    const client = this.client;
    if (!client) return;
    this.client = null;
    // QUIT lets pending replies drain, but only works on a live connection;
    // if Redis is down or still connecting it would sit in the offline queue.
    if (client.status === 'ready') {
      await client.quit().catch(() => client.disconnect());
    } else {
      client.disconnect();
    }
  }
}
