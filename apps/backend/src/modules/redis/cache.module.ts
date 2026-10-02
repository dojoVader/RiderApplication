import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { Keyv } from 'keyv';
import { IoRedisKeyvStore } from './ioredis-keyv-store';
import { RedisService } from './redis.service';

/**
 * Global cache manager (inject CACHE_MANAGER, or use CacheInterceptor) stored
 * in Redis under the `cache:` prefix, on RedisService's shared connection.
 */
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [RedisService],
      useFactory: (redis: RedisService) => ({
        stores: [
          new Keyv({
            store: new IoRedisKeyvStore(redis.getClient()),
            namespace: 'cache',
          }),
        ],
        // Default TTL in milliseconds; override per call with cache.set(key, value, ttl).
        ttl: 60_000,
      }),
    }),
  ],
})
export class RedisCacheModule {}
